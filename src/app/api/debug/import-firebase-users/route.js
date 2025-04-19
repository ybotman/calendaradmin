import { NextResponse } from 'next/server';
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
      active: Boolean,
      localUserInfo: {
        firstName: String,
        lastName: String,
        isActive: Boolean,
        isApproved: Boolean,
        isEnabled: Boolean
      },
      roleIds: [mongoose.Schema.Types.ObjectId],
      regionalOrganizerInfo: {
        organizerId: mongoose.Schema.Types.ObjectId,
        isApproved: Boolean,
        isEnabled: Boolean,
        isActive: Boolean
      },
      localAdminInfo: {
        isApproved: Boolean,
        isEnabled: Boolean,
        isActive: Boolean
      }
    }, { collection: 'userlogins', strict: false });
    
    return mongoose.model('UserLogins', schema);
  }
}

// Function to get a MongoDB model for Roles
async function getRoleModel() {
  await connectToDatabase();
  
  try {
    // Return existing model if it's already defined
    return mongoose.model('Role');
  } catch (e) {
    // If model doesn't exist, define it with a minimal schema
    const schema = new mongoose.Schema({
      roleName: String,
      appId: String,
      description: String
    }, { collection: 'roles', strict: false });
    
    return mongoose.model('Role', schema);
  }
}

// Import Firebase Admin
import firebaseAdmin from '@/lib/firebase-admin';

// Manual base64 encoding helper for Firebase service account (for debugging)
function encodeServiceAccount(jsonString) {
  return Buffer.from(jsonString).toString('base64');
}

// POST endpoint to import Firebase users into MongoDB
export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { 
      appId = '1', 
      forceInit = false,
      dryRun = false
    } = body;
    
    // Force re-initialization if requested (useful for debugging)
    if (forceInit) {
      const initResult = firebaseAdmin.initialize();
      if (!initResult) {
        const error = firebaseAdmin.getInitError();
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize Firebase Admin SDK',
          details: error ? error.message : 'Unknown error',
          help: 'Check that the FIREBASE_JSON environment variable is properly set and contains valid service account credentials'
        }, { status: 500 });
      }
    }
    
    // Check if Firebase Admin is available
    if (!firebaseAdmin.isAvailable()) {
      const error = firebaseAdmin.getInitError();
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin SDK is not initialized',
        details: error ? error.message : 'Unknown initialization error',
        help: 'Set FIREBASE_JSON environment variable with base64-encoded service account credentials. The service account key should have the necessary permissions to manage users.'
      }, { status: 500 });
    }
    
    // Get Firebase Auth
    const auth = firebaseAdmin.getAuth();
    if (!auth) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Auth is not available',
        help: 'Firebase Admin SDK is initialized but Auth service is not available. This usually indicates an issue with Firebase configuration or permissions.'
      }, { status: 500 });
    }
    
    console.log('Fetching users from Firebase...');
    
    // Fetch users from Firebase (1000 at a time - Firebase limit)
    // We'll use pagination to get all users
    let firebaseUsers = [];
    let nextPageToken;
    
    try {
      // First page - limited to 1000 users
      const listUsersResult = await auth.listUsers(1000);
      firebaseUsers = listUsersResult.users;
      nextPageToken = listUsersResult.pageToken;
      
      // Continue fetching if there are more users
      while (nextPageToken) {
        console.log(`Fetching next page of users with token: ${nextPageToken.substring(0, 10)}...`);
        const nextPageResult = await auth.listUsers(1000, nextPageToken);
        firebaseUsers = [...firebaseUsers, ...nextPageResult.users];
        nextPageToken = nextPageResult.pageToken;
      }
      
      console.log(`Fetched ${firebaseUsers.length} users from Firebase`);
    } catch (firebaseError) {
      console.error('Error fetching users from Firebase:', firebaseError);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch users from Firebase: ${firebaseError.message}`,
        code: firebaseError.code,
        help: 'Make sure the Firebase service account has the proper permissions to list users.'
      }, { status: 500 });
    }
    
    // For dry runs, return the list of users that would be processed
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `Found ${firebaseUsers.length} users in Firebase (DRY RUN - no changes made)`,
        dryRun: true,
        users: firebaseUsers.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          disabled: user.disabled,
          emailVerified: user.emailVerified,
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }))
      });
    }
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get models
    const UserLogins = await getUserLoginsModel();
    const Role = await getRoleModel();
    
    // Find the default user role
    const userRole = await Role.findOne({ roleName: 'User', appId });
    if (!userRole) {
      console.warn('User role not found, users will be created without roles');
    }
    
    // Statistics for tracking
    const stats = {
      total: firebaseUsers.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Process each Firebase user
    for (const fbUser of firebaseUsers) {
      try {
        // Extract the Firebase UID and basic info
        const uid = fbUser.uid;
        const email = fbUser.email;
        const displayName = fbUser.displayName;
        const disabled = fbUser.disabled;
        
        if (!uid) {
          console.warn('Skipping user with no UID');
          stats.skipped++;
          stats.details.push({ uid: 'missing', reason: 'No UID provided' });
          continue;
        }
        
        // Skip system or service account emails if any
        if (email && email.includes('firebase-adminsdk')) {
          console.log(`Skipping Firebase service account: ${email}`);
          stats.skipped++;
          stats.details.push({ uid, email, reason: 'Service account email' });
          continue;
        }
        
        // Parse the display name into first/last name
        let firstName = '';
        let lastName = '';
        
        if (displayName) {
          const nameParts = displayName.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (email) {
          // If no display name but have email, use the part before @ as firstName
          firstName = email.split('@')[0] || '';
        }
        
        // Check if user already exists
        const existingUser = await UserLogins.findOne({ firebaseUserId: uid, appId });
        
        if (existingUser) {
          // Update existing user
          existingUser.active = !disabled; // Set active based on Firebase disabled status
          
          // Ensure firebaseUserInfo exists
          if (!existingUser.firebaseUserInfo) {
            existingUser.firebaseUserInfo = {};
          }
          
          // Update Firebase user info
          existingUser.firebaseUserInfo = {
            ...existingUser.firebaseUserInfo,
            email,
            displayName,
            lastSyncedAt: new Date()
          };
          
          // Ensure localUserInfo exists
          if (!existingUser.localUserInfo) {
            existingUser.localUserInfo = {
              isActive: !disabled,
              isApproved: true,
              isEnabled: true
            };
          }
          
          // Update name if it was empty
          if (!existingUser.localUserInfo.firstName && firstName) {
            existingUser.localUserInfo.firstName = firstName;
          }
          
          if (!existingUser.localUserInfo.lastName && lastName) {
            existingUser.localUserInfo.lastName = lastName;
          }
          
          // Keep user active state in sync with Firebase
          existingUser.localUserInfo.isActive = !disabled;
          
          // Add User role if not present
          if (userRole && (!existingUser.roleIds || existingUser.roleIds.length === 0)) {
            existingUser.roleIds = [userRole._id];
          }
          
          // Save updates
          await existingUser.save();
          stats.updated++;
          stats.details.push({ uid, action: 'updated', email });
        } else {
          // Create new user
          const newUser = new UserLogins({
            firebaseUserId: uid,
            appId,
            active: !disabled,
            firebaseUserInfo: {
              email,
              displayName,
              lastSyncedAt: new Date()
            },
            localUserInfo: {
              firstName,
              lastName,
              isActive: !disabled,
              isApproved: true, // Auto-approve new Firebase users
              isEnabled: true    // Auto-enable new Firebase users
            },
            // Add default regionalOrganizerInfo with required fields
            regionalOrganizerInfo: {
              organizerCommunicationSettingsAdmin: {
                messagePrimaryMethod: "app"
              }
            },
            roleIds: userRole ? [userRole._id] : []
          });
          
          await newUser.save();
          stats.created++;
          stats.details.push({ uid, action: 'created', email });
        }
      } catch (userError) {
        console.error(`Error processing user:`, userError);
        stats.errors++;
        stats.details.push({ 
          uid: fbUser.uid || 'unknown', 
          action: 'error', 
          error: userError.message 
        });
      }
    }
    
    const message = `Processed ${stats.total} Firebase users: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`;
    console.log(message);
    
    return NextResponse.json({
      success: true,
      message,
      stats
    });
  } catch (error) {
    console.error('Error importing Firebase users:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET endpoint to check the status of userLogins vs Firebase UIDs
export async function GET(request) {
  try {
    // Get optional query parameters
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || '1';
    const includeFirebase = searchParams.get('includeFirebase') === 'true';
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get UserLogins model
    const UserLogins = await getUserLoginsModel();
    
    // Count users by type
    const totalUsers = await UserLogins.countDocuments({ appId });
    const tempUsers = await UserLogins.countDocuments({ 
      appId, 
      firebaseUserId: { $regex: '^temp_' } 
    });
    const realUsers = totalUsers - tempUsers;
    
    // Get sample of each type
    const realUsersSample = await UserLogins.find({ 
      appId,
      firebaseUserId: { $not: { $regex: '^temp_' } }
    }).limit(5).sort({ createdAt: -1 });
    
    const tempUsersSample = await UserLogins.find({ 
      appId,
      firebaseUserId: { $regex: '^temp_' }
    }).limit(5).sort({ createdAt: -1 });
    
    // Default response
    const response = {
      success: true,
      stats: {
        totalUsers,
        realUsers,
        tempUsers,
        realUsersSample: realUsersSample.map(u => ({
          id: u._id.toString(),
          firebaseUserId: u.firebaseUserId,
          name: `${u.localUserInfo?.firstName || ''} ${u.localUserInfo?.lastName || ''}`.trim(),
          email: u.firebaseUserInfo?.email || 'No email',
          active: u.active,
          isOrganizer: !!u.regionalOrganizerInfo?.organizerId
        })),
        tempUsersSample: tempUsersSample.map(u => ({
          id: u._id.toString(),
          firebaseUserId: u.firebaseUserId,
          name: `${u.localUserInfo?.firstName || ''} ${u.localUserInfo?.lastName || ''}`.trim(),
          email: u.firebaseUserInfo?.email || 'No email',
          active: u.active,
          isOrganizer: !!u.regionalOrganizerInfo?.organizerId
        }))
      }
    };
    
    // If requested, add Firebase users info
    if (includeFirebase) {
      try {
        // Check if Firebase Admin is available
        if (!firebaseAdmin.isAvailable()) {
          return NextResponse.json({
            ...response,
            firebase: {
              status: 'unavailable',
              error: 'Firebase Admin SDK is not initialized'
            }
          });
        }
        
        const auth = firebaseAdmin.getAuth();
        if (!auth) {
          return NextResponse.json({
            ...response,
            firebase: {
              status: 'error',
              error: 'Firebase Auth is not available'
            }
          });
        }
        
        // Fetch a small sample of Firebase users
        const firebaseUsers = await auth.listUsers(10);
        
        response.firebase = {
          status: 'available',
          userCount: firebaseUsers.users.length,
          sample: firebaseUsers.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            disabled: user.disabled,
            hasLocalAccount: realUsersSample.some(local => local.firebaseUserId === user.uid)
          }))
        };
      } catch (firebaseError) {
        response.firebase = {
          status: 'error',
          error: firebaseError.message,
          code: firebaseError.code
        };
      }
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking user stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}