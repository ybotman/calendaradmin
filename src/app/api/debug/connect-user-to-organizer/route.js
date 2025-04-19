import { NextResponse } from 'next/server';
import axios from 'axios';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Function to get a MongoDB model for UserLogins
async function getUserLoginsModel() {
  await connectToDatabase();
  
  try {
    // Return existing model if it's already defined
    return mongoose.model('UserLogins');
  } catch (e) {
    // If model doesn't exist, define it with a minimal schema
    const schema = new mongoose.Schema({
      firebaseUserId: String,
      appId: String,
      regionalOrganizerInfo: {
        organizerId: mongoose.Schema.Types.ObjectId,
        isApproved: Boolean,
        isEnabled: Boolean,
        isActive: Boolean,
        ApprovalDate: Date
      },
      roleIds: [mongoose.Schema.Types.ObjectId]
    }, { collection: 'userlogins', strict: false });
    
    return mongoose.model('UserLogins', schema);
  }
}

// Function to get a MongoDB model for Organizer
async function getOrganizerModel() {
  await connectToDatabase();
  
  try {
    // Return existing model if it's already defined
    return mongoose.model('Organizer');
  } catch (e) {
    // If model doesn't exist, define it with a minimal schema
    const schema = new mongoose.Schema({
      firebaseUserId: String,
      appId: String,
      linkedUserLogin: mongoose.Schema.Types.ObjectId,
      fullName: String,
      shortName: String
    }, { collection: 'organizers', strict: false });
    
    return mongoose.model('Organizer', schema);
  }
}

// POST handler for connecting user to organizer directly
export async function POST(request) {
  try {
    // Parse the request body
    const { firebaseUserId, organizerId, appId = '1', clearExisting = false } = await request.json();
    
    console.log(`Debug API: Connecting user ${firebaseUserId} to organizer ${organizerId} with appId ${appId}`);
    
    // Basic validation
    if (!firebaseUserId || !organizerId) {
      return NextResponse.json({
        success: false,
        error: 'Both firebaseUserId and organizerId are required'
      }, { status: 400 });
    }
    
    // Check if this Firebase ID is already in use by another organizer
    if (clearExisting) {
      try {
        // Connect to the database
        await connectToDatabase();
        
        // Get the organizer model
        const Organizer = await getOrganizerModel();
        
        // Find any organizers using this Firebase ID (should only be one due to unique index)
        const existingOrganizer = await Organizer.findOne({ 
          firebaseUserId, 
          appId,
          _id: { $ne: organizerId } // Not equal to the target organizer
        });
        
        if (existingOrganizer) {
          console.log(`Found existing organizer ${existingOrganizer._id} using Firebase ID ${firebaseUserId}, clearing...`);
          
          // Clear the Firebase ID from this organizer
          existingOrganizer.firebaseUserId = null;
          existingOrganizer.linkedUserLogin = null;
          
          await existingOrganizer.save();
          console.log(`Cleared Firebase ID from organizer ${existingOrganizer._id}`);
        }
      } catch (clearError) {
        console.warn('Error clearing existing Firebase ID usage:', clearError.message);
        // Continue with connect attempt
      }
    }
    
    try {
      // Connect to the database
      await connectToDatabase();
      
      // Get the user model
      const UserLogins = await getUserLoginsModel();
      
      // Find the user by firebaseUserId (which should be unique)
      const user = await UserLogins.findOne({ firebaseUserId, appId });
      
      if (!user) {
        return NextResponse.json({
          success: false,
          message: `User with firebaseUserId ${firebaseUserId} not found`
        }, { status: 404 });
      }
      
      // Convert organizerId to ObjectId
      let orgObjectId;
      try {
        orgObjectId = new mongoose.Types.ObjectId(organizerId);
      } catch (e) {
        return NextResponse.json({
          success: false,
          error: `Invalid organizerId format: ${organizerId}`
        }, { status: 400 });
      }
      
      // Update regionalOrganizerInfo
      user.regionalOrganizerInfo = {
        ...user.regionalOrganizerInfo,
        organizerId: orgObjectId,
        isApproved: true,
        isEnabled: true,
        isActive: true,
        ApprovalDate: new Date(),
        // Include required organizerCommunicationSettingsAdmin field to pass validation
        organizerCommunicationSettingsAdmin: {
          messagePrimaryMethod: "app"
        }
      };
      
      // Add RegionalOrganizer role if it's not already present
      try {
        // Create a simple Role model to query roles
        const RoleSchema = new mongoose.Schema({
          roleName: String,
          appId: String
        }, { collection: 'roles', strict: false });
        
        const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
        
        // Find the RegionalOrganizer role
        const organizerRole = await Role.findOne({ roleName: 'RegionalOrganizer', appId });
        
        if (organizerRole) {
          // Check if role is already assigned
          const hasRole = user.roleIds && user.roleIds.some(roleId => 
            roleId.toString() === organizerRole._id.toString()
          );
          
          // Add the role if not already present
          if (!hasRole) {
            // Ensure roleIds is an array
            if (!user.roleIds) {
              user.roleIds = [];
            }
            
            user.roleIds.push(organizerRole._id);
            console.log(`Added RegionalOrganizer role ${organizerRole._id} to user ${user._id}`);
          }
        } else {
          console.warn('RegionalOrganizer role not found in the database');
        }
      } catch (roleError) {
        console.warn('Error adding RegionalOrganizer role:', roleError.message);
        // Continue with user update even if role couldn't be added
      }
      
      // Save the updated user
      await user.save();
      
      return NextResponse.json({
        success: true,
        message: `User ${firebaseUserId} successfully connected to organizer ${organizerId}`,
        user: {
          _id: user._id,
          firebaseUserId: user.firebaseUserId,
          regionalOrganizerInfo: user.regionalOrganizerInfo
        }
      });
    } catch (dbError) {
      console.error('Database error during user-organizer connection:', dbError);
      return NextResponse.json({
        success: false,
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in connect-user-to-organizer endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}