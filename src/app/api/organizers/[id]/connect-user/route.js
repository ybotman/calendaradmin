import { NextResponse } from 'next/server';
import axios from 'axios';
import { getOrganizersModel } from '@/lib/models';
import { getUserLoginsModel } from '@/lib/models';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// PATCH connect organizer to user
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { firebaseUserId, appId = "1" } = await request.json();
    
    console.log(`Request to connect organizer ${id} to user ${firebaseUserId} with appId ${appId}`);
    
    if (!firebaseUserId) {
      return NextResponse.json({ 
        error: 'Firebase User ID is required'
      }, { status: 400 });
    }
    
    // First try to use the backend API to link the organizer and user
    try {
      console.log('Attempting to connect via backend API...');
      const response = await axios.patch(`${BE_URL}/api/organizers/${id}/connect-user`, {
        firebaseUserId,
        appId
      });
      
      console.log('Backend API connection successful');
      return NextResponse.json({
        message: 'User connected to organizer successfully via backend API',
        data: response.data
      });
    } catch (apiError) {
      console.log('Backend API connection failed, falling back to direct DB update:', apiError.message);
      // Continue with direct DB connection fallback
    }
    
    // Connect to database for direct operations
    await connectToDatabase();
    
    // Get models
    const Organizers = await getOrganizersModel();
    const UserLogins = await getUserLoginsModel();
    
    // Find the organizer
    let organizer;
    try {
      organizer = await Organizers.findOne({ _id: id, appId });
    } catch (findOrgError) {
      // Try again with string ID conversion if needed
      try {
        organizer = await Organizers.findOne({ 
          _id: new mongoose.Types.ObjectId(id.toString()),
          appId
        });
      } catch (secondFindError) {
        console.error('Both organizer find attempts failed:', secondFindError);
        return NextResponse.json({ 
          error: 'Organizer not found after multiple attempts',
          details: secondFindError.message
        }, { status: 404 });
      }
    }
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }
    
    // Find the user
    let user;
    try {
      user = await UserLogins.findOne({ firebaseUserId, appId });
    } catch (findUserError) {
      console.error('Error finding user:', findUserError);
      return NextResponse.json({ 
        error: 'Error finding user',
        details: findUserError.message
      }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`Found organizer ${organizer._id} and user ${user._id}`);
    
    // Update the organizer's firebaseUserId only - we no longer use linkedUserLogin
    if (!organizer.firebaseUserId || organizer.firebaseUserId !== firebaseUserId) {
      organizer.firebaseUserId = firebaseUserId;
    }
    
    // Update the user's regionalOrganizerInfo
    user.regionalOrganizerInfo = {
      ...user.regionalOrganizerInfo,
      organizerId: organizer._id,
      isApproved: true,
      isEnabled: true,
      isActive: true,
      ApprovalDate: new Date(),
      // Include required organizerCommunicationSettingsAdmin field to pass validation
      organizerCommunicationSettingsAdmin: {
        messagePrimaryMethod: "app"
      }
    };
    
    // Get roles for adding RegionalOrganizer role
    let roles = [];
    try {
      const rolesResponse = await axios.get(`${BE_URL}/api/roles?appId=${appId}`);
      roles = rolesResponse.data;
    } catch (rolesError) {
      console.warn('Error fetching roles from API, trying direct DB query:', rolesError.message);
      
      // Try getting roles directly from DB
      try {
        const RoleSchema = new mongoose.Schema({
          roleName: String,
          appId: String
        }, { collection: 'roles' });
        
        const RoleModel = mongoose.models.Role || mongoose.model('Role', RoleSchema);
        roles = await RoleModel.find({ appId });
      } catch (dbRoleError) {
        console.error('Failed to get roles from DB:', dbRoleError);
        // Continue without roles if we can't get them
      }
    }
    
    // Find the RegionalOrganizer role
    const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
    
    // Add RegionalOrganizer role if not already present
    if (organizerRole && !user.roleIds.some(r => 
      r.toString() === organizerRole._id.toString()
    )) {
      user.roleIds.push(organizerRole._id);
      console.log('Added RegionalOrganizer role to user');
    }
    
    // Save both the user and organizer updates
    try {
      await Promise.all([
        user.save(),
        organizer.save()
      ]);
      
      console.log('Successfully saved user and organizer updates');
    } catch (saveError) {
      console.error('Error saving updates:', saveError);
      return NextResponse.json({ 
        error: 'Failed to save user or organizer updates',
        details: saveError.message
      }, { status: 500 });
    }
    
    // Return success
    return NextResponse.json({
      message: 'User connected to organizer successfully via direct database update',
      user: {
        firebaseUserId: user.firebaseUserId,
        regionalOrganizerInfo: user.regionalOrganizerInfo,
        roleIds: user.roleIds
      },
      organizer: {
        _id: organizer._id,
        firebaseUserId: organizer.firebaseUserId
      }
    });
  } catch (error) {
    console.error(`Error connecting user to organizer ${params.id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to connect user to organizer',
      details: error.response?.data?.message || error.message
    }, { status: error.response?.status || 500 });
  }
}