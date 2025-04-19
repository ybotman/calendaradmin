import { NextResponse } from 'next/server';
import axios from 'axios';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// PATCH disconnect user from organizer - completely redesigned for reliability
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { appId = "1" } = await request.json();
    
    console.log(`Request to disconnect user from organizer ${id} for appId ${appId}`);
    console.log('Using simplified, reliable approach...');
    
    // We'll use a two-phase direct approach without Mongoose models or transactions
    // 1. Get organizer info using MongoDB driver
    // 2. Update organizer first (this is critical - always complete this step)
    // 3. Try to update user as a best effort, but consider success if organizer update works
    
    try {
      // Connect to database
      await connectToDatabase();
      const db = mongoose.connection.db;
      
      if (!db) {
        throw new Error("Failed to connect to MongoDB");
      }
      
      // Convert string ID to ObjectId if needed
      let organizerId;
      try {
        organizerId = new mongoose.Types.ObjectId(id);
      } catch (idError) {
        console.error("Invalid organizer ID format:", idError);
        return NextResponse.json({ 
          error: 'Invalid organizer ID format' 
        }, { status: 400 });
      }
      
      // STEP 1: Get the organizer info first
      console.log(`Looking up organizer ${id} in the database...`);
      
      const organizerDoc = await db.collection('organizers').findOne({ 
        _id: organizerId,
        appId: appId
      });
      
      if (!organizerDoc) {
        console.log(`Organizer ${id} not found`);
        return NextResponse.json({ 
          error: 'Organizer not found' 
        }, { status: 404 });
      }
      
      console.log(`Found organizer: ${organizerDoc.fullName || organizerDoc.name || 'Unnamed'}`);
      
      // Check if there's actually a user to disconnect
      if (!organizerDoc.firebaseUserId) {
        console.log('No Firebase user ID found - nothing to disconnect');
        return NextResponse.json({ 
          message: 'Organizer is not connected to any user',
          success: true,
          organizer: {
            _id: id,
            name: organizerDoc.fullName || organizerDoc.name
          }
        }, { status: 200 });
      }
      
      const firebaseUserId = organizerDoc.firebaseUserId;
      console.log(`Found linked Firebase user: ${firebaseUserId}`);
      
      // STEP 2: Update the organizer FIRST - this is the critical operation
      console.log(`Disconnecting user from organizer ${id}...`);
      
      const updateResult = await db.collection('organizers').updateOne(
        { _id: organizerId, appId: appId },
        { 
          $set: { 
            firebaseUserId: null,
            // We no longer use linkedUserLogin, but we'll set it to null for backward compatibility
            linkedUserLogin: null,
            updatedAt: new Date()
          }
        }
      );
      
      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ 
          error: 'Organizer not found during update' 
        }, { status: 404 });
      }
      
      if (updateResult.modifiedCount === 0) {
        console.log('Warning: Organizer found but not modified - might already be disconnected');
      } else {
        console.log(`Successfully disconnected user from organizer`);
      }
      
      // STEP 3: Update the user as a best effort
      // Even if this fails, the disconnect is considered successful
      // since the organizer is already disconnected
      try {
        console.log(`Updating user with Firebase ID: ${firebaseUserId}...`);
        
        const userUpdateResult = await db.collection('userlogins').updateOne(
          { firebaseUserId: firebaseUserId, appId: appId },
          { 
            $set: { 
              'regionalOrganizerInfo.organizerId': null,
              'regionalOrganizerInfo.isApproved': false,
              'regionalOrganizerInfo.isEnabled': false, 
              'regionalOrganizerInfo.isActive': false,
              'regionalOrganizerInfo.ApprovalDate': null,
              updatedAt: new Date()
            }
          }
        );
        
        if (userUpdateResult.matchedCount === 0) {
          console.log(`Warning: User with Firebase ID ${firebaseUserId} not found`);
        } else if (userUpdateResult.modifiedCount === 0) {
          console.log(`Warning: User found but not modified`);
        } else {
          console.log(`Successfully updated user`);
        }
      } catch (userUpdateError) {
        // Log the error but don't fail the whole operation
        console.error('Error updating user (non-critical):', userUpdateError);
      }
      
      // Return success regardless of user update
      return NextResponse.json({
        success: true,
        message: 'User disconnected from organizer successfully',
        organizer: {
          _id: id,
          name: organizerDoc.fullName || organizerDoc.name,
          previousFirebaseUserId: firebaseUserId
        }
      });
      
    } catch (dbError) {
      console.error('Error during database operations:', dbError);
      
      // FINAL FALLBACK: Try a direct simple PATCH to update just the organizer
      try {
        console.log('Attempting emergency fallback with direct PATCH...');
        
        const patchResponse = await axios.patch(`${BE_URL}/api/organizers/${id}?appId=${appId}`, {
          firebaseUserId: null,
          linkedUserLogin: null,
          appId
        });
        
        console.log('Direct PATCH successful as fallback');
        
        return NextResponse.json({
          success: true,
          message: 'User disconnected from organizer via simple update',
          organizer: {
            _id: id
          }
        });
      } catch (patchError) {
        console.error('All disconnection attempts failed:', patchError);
        return NextResponse.json({ 
          error: 'All disconnection attempts failed',
          details: dbError.message 
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error(`Error in disconnect-user endpoint:`, error);
    return NextResponse.json({ 
      error: 'Failed to process the disconnect request',
      details: error.message
    }, { status: 500 });
  }
}