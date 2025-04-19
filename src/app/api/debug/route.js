import { NextResponse } from 'next/server';
import axios from 'axios';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { 
  getMasteredCountryModel, 
  getMasteredRegionModel, 
  getMasteredDivisionModel, 
  getMasteredCityModel 
} from '@/lib/models';

// Create a model for UserLogins - used for direct deletion
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
      // Using strict: false allows us to work with documents
      // that might have fields not defined in the schema
    }, { collection: 'userlogins', strict: false });
    
    return mongoose.model('UserLogins', schema);
  }
}

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// Get Organizer model
async function getOrganizerModel() {
  await connectToDatabase();
  
  try {
    // Return existing model if it's already defined
    return mongoose.model('Organizer');
  } catch (e) {
    // If model doesn't exist, define it with a minimal schema
    const schema = new mongoose.Schema({
      appId: String,
      firebaseUserId: String,
      linkedUserLogin: mongoose.Schema.Types.ObjectId,
      fullName: String,
      shortName: String,
      isActive: Boolean,
      isEnabled: Boolean,
      wantRender: Boolean,
    }, { collection: 'organizers', strict: false });
    
    return mongoose.model('Organizer', schema);
  }
}

// Special route for direct user operations - for debugging and fixing issues
// POST route for various operations
export async function POST(request) {
  try {
    // Get request body
    const body = await request.json();
    
    // Check action type
    const validActions = ['deleteUsers', 'deleteAllTempUsers', 'connectOrganizerToUser'];
    if (!validActions.includes(body.action)) {
      return NextResponse.json({
        success: false,
        error: `Invalid action type. Supported actions: ${validActions.join(', ')}`
      }, { status: 400 });
    }
    
    // Handle connectOrganizerToUser action
    if (body.action === 'connectOrganizerToUser') {
      const { organizerId, firebaseUserId, appId = '1' } = body;
      
      if (!organizerId || !firebaseUserId) {
        return NextResponse.json({
          success: false,
          error: 'Missing required parameters: organizerId, firebaseUserId'
        }, { status: 400 });
      }
      
      try {
        console.log(`Debug API: Connecting organizer ${organizerId} to user ${firebaseUserId}`);
        
        // Connect to the database
        await connectToDatabase();
        
        // Get the necessary models
        const UserLogins = await getUserLoginsModel();
        const Organizer = await getOrganizerModel();
        
        // Convert organizerId to ObjectId if needed
        let orgObjectId;
        try {
          orgObjectId = new mongoose.Types.ObjectId(organizerId);
        } catch (e) {
          console.warn(`Could not convert ${organizerId} to ObjectId. Using as-is.`);
          orgObjectId = organizerId;
        }
        
        // First, find the organizer
        let organizer;
        try {
          organizer = await Organizer.findOne({
            $or: [
              { _id: orgObjectId },
              { _id: organizerId }
            ],
            appId
          });
        } catch (findOrgError) {
          console.error('Error finding organizer:', findOrgError);
          return NextResponse.json({
            success: false,
            error: `Error finding organizer: ${findOrgError.message}`
          }, { status: 500 });
        }
        
        if (!organizer) {
          return NextResponse.json({
            success: false,
            error: 'Organizer not found'
          }, { status: 404 });
        }
        
        // Next, find the user
        let user;
        try {
          user = await UserLogins.findOne({ firebaseUserId, appId });
        } catch (findUserError) {
          console.error('Error finding user:', findUserError);
          return NextResponse.json({
            success: false,
            error: `Error finding user: ${findUserError.message}`
          }, { status: 500 });
        }
        
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'User not found'
          }, { status: 404 });
        }
        
        console.log(`Found organizer ${organizer._id} and user ${user._id}`);
        
        // Now update the organizer with the user's information
        organizer.firebaseUserId = firebaseUserId;
        organizer.linkedUserLogin = user._id;
        
        // Update the user's regionalOrganizerInfo
        if (!user.regionalOrganizerInfo) {
          user.regionalOrganizerInfo = {};
        }
        
        user.regionalOrganizerInfo = {
          ...user.regionalOrganizerInfo,
          organizerId: organizer._id,
          isApproved: true,
          isEnabled: true,
          isActive: true,
          ApprovalDate: new Date()
        };
        
        // Get roles for adding RegionalOrganizer role
        try {
          // Define minimal Role schema
          const RoleSchema = new mongoose.Schema({
            roleName: String,
            appId: String
          }, { collection: 'roles' });
          
          const RoleModel = mongoose.models.Role || mongoose.model('Role', RoleSchema);
          const roles = await RoleModel.find({ appId });
          
          // Find the RegionalOrganizer role
          const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
          
          // Add RegionalOrganizer role if not already present
          if (organizerRole && !user.roleIds.some(r => 
            r.toString() === organizerRole._id.toString()
          )) {
            user.roleIds.push(organizerRole._id);
            console.log('Added RegionalOrganizer role to user');
          }
        } catch (roleError) {
          console.warn('Could not add RegionalOrganizer role:', roleError.message);
          // Continue without adding role
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
            success: false,
            error: `Failed to save user or organizer updates: ${saveError.message}`
          }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'User connected to organizer successfully via direct database update',
          user: {
            _id: user._id,
            firebaseUserId: user.firebaseUserId,
            regionalOrganizerInfo: user.regionalOrganizerInfo,
            roleIds: user.roleIds
          },
          organizer: {
            _id: organizer._id,
            firebaseUserId: organizer.firebaseUserId,
            linkedUserLogin: organizer.linkedUserLogin
          }
        });
      } catch (error) {
        console.error('Error in connectOrganizerToUser operation:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
      }
    }
    
    // Handle deleteAllTempUsers action separately
    if (body.action === 'deleteAllTempUsers') {
      const appId = body.appId || '1';
      
      try {
        // Connect to the database
        await connectToDatabase();
        
        // Get the user model
        const UserLogins = await getUserLoginsModel();
        
        // Delete all users with temp_ prefix in firebaseUserId
        const result = await UserLogins.deleteMany({
          firebaseUserId: { $regex: '^temp_' },
          appId: appId
        });
        
        return NextResponse.json({
          success: true,
          message: `${result.deletedCount} temporary users deleted successfully`,
          details: result
        });
      } catch (dbError) {
        console.error('Database error during temp user deletion:', dbError);
        return NextResponse.json({
          success: false,
          error: dbError.message,
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        }, { status: 500 });
      }
    }
    
    // Validate userIds
    if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid userIds. Must provide an array of user IDs.'
      }, { status: 400 });
    }
    
    // Extract parameters
    const userIds = body.userIds;
    const appId = body.appId || '1';
    const isTempOnly = body.tempOnly === true; // Only delete temp users
    
    try {
      // Connect to the database
      await connectToDatabase();
      
      // Get the user model
      const UserLogins = await getUserLoginsModel();
      
      // Convert IDs to ObjectIds where possible
      const objectIds = userIds.map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (e) {
          return id; // Use as-is if not a valid ObjectId
        }
      });
      
      // Build query
      let query = {
        _id: { $in: [...objectIds, ...userIds] }, // Try both formats
        appId: appId
      };
      
      // If tempOnly is true, add condition to only delete temp users
      if (isTempOnly) {
        query.firebaseUserId = { $regex: '^temp_' };
      }
      
      // Delete matching users
      const result = await UserLogins.deleteMany(query);
      
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} users deleted successfully`,
        details: result
      });
    } catch (dbError) {
      console.error('Database error during bulk user deletion:', dbError);
      return NextResponse.json({
        success: false,
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Bulk user deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Get the user ID from the URL or query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const appId = searchParams.get('appId') || '1';
    
    // Validate parameters
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing userId parameter' 
      }, { status: 400 });
    }
    
    try {
      // Connect to the database
      await connectToDatabase();
      
      // Get the user model
      const UserLogins = await getUserLoginsModel();
      
      // Attempt to convert to ObjectId (in case it's a string ID)
      let objectId;
      try {
        objectId = new mongoose.Types.ObjectId(userId);
      } catch (e) {
        console.warn(`Could not convert ${userId} to ObjectId. Using as-is.`);
        objectId = userId; // Use as-is if not a valid ObjectId
      }
      
      // Try both the string ID and ObjectId to be safe
      const result = await UserLogins.deleteOne({
        $or: [
          { _id: objectId },
          { _id: userId }
        ],
        appId: appId
      });
      
      if (result.deletedCount === 0) {
        return NextResponse.json({
          success: false,
          message: 'User not found',
          details: `No user found with ID ${userId} and appId ${appId}`
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
        details: result
      });
    } catch (dbError) {
      console.error('Database error during user deletion:', dbError);
      return NextResponse.json({
        success: false,
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check models directory
    const calendarBeModelsPath = process.env.CALENDAR_BE_MODELS_PATH || 
                               path.resolve('/Users/tobybalsley/MyDocs/AppDev/MasterCalendar/calendar-be/models');
    
    let modelPathExists = false;
    let modelFiles = [];
    
    try {
      modelPathExists = fs.existsSync(calendarBeModelsPath);
      if (modelPathExists) {
        modelFiles = fs.readdirSync(calendarBeModelsPath)
          .filter(file => file.endsWith('.js'));
      }
    } catch (e) {
      console.error('Error checking models path:', e);
    }
    
    // Connect to database
    let dbStatus = 'unknown';
    let mongooseStatus = {};
    
    try {
      await connectToDatabase();
      dbStatus = 'connected';
      
      // Check mongoose connection status
      mongooseStatus = {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
        models: Object.keys(mongoose.models),
      };
    } catch (e) {
      dbStatus = `error: ${e.message}`;
    }
    
    // Test our models
    const modelsStatus = {};
    
    try {
      modelsStatus.MasteredCountry = { status: 'pending' };
      const countryModel = await getMasteredCountryModel();
      const countryCount = await countryModel.countDocuments();
      modelsStatus.MasteredCountry = { 
        status: 'success', 
        count: countryCount,
        modelName: countryModel.modelName 
      };
    } catch (e) {
      modelsStatus.MasteredCountry = { 
        status: 'error', 
        error: e.message 
      };
    }
    
    try {
      modelsStatus.MasteredRegion = { status: 'pending' };
      const regionModel = await getMasteredRegionModel();
      const regionCount = await regionModel.countDocuments();
      modelsStatus.MasteredRegion = { 
        status: 'success', 
        count: regionCount,
        modelName: regionModel.modelName 
      };
    } catch (e) {
      modelsStatus.MasteredRegion = { 
        status: 'error', 
        error: e.message 
      };
    }
    
    try {
      modelsStatus.MasteredDivision = { status: 'pending' };
      const divisionModel = await getMasteredDivisionModel();
      const divisionCount = await divisionModel.countDocuments();
      modelsStatus.MasteredDivision = { 
        status: 'success', 
        count: divisionCount,
        modelName: divisionModel.modelName 
      };
    } catch (e) {
      modelsStatus.MasteredDivision = { 
        status: 'error', 
        error: e.message 
      };
    }
    
    try {
      modelsStatus.MasteredCity = { status: 'pending' };
      const cityModel = await getMasteredCityModel();
      const cityCount = await cityModel.countDocuments();
      modelsStatus.MasteredCity = { 
        status: 'success', 
        count: cityCount,
        modelName: cityModel.modelName 
      };
    } catch (e) {
      modelsStatus.MasteredCity = { 
        status: 'error', 
        error: e.message 
      };
    }
    
    // Test backend connection with a health check
    let backendStatus = {};
    let apiTests = {};
    
    try {
      const response = await axios.get(`${BE_URL}/health`);
      backendStatus = {
        status: 'connected',
        data: response.data
      };
      
      // Test API calls
      const [rolesResponse, userResponse] = await Promise.all([
        axios.get(`${BE_URL}/api/roles?appId=1`).catch(e => ({ 
          status: e.response?.status || 500,
          error: e.message 
        })),
        axios.get(`${BE_URL}/api/userlogins/all?appId=1`).catch(e => ({ 
          status: e.response?.status || 500,
          error: e.message 
        }))
      ]);
      
      apiTests = {
        roles: rolesResponse.data ? {
          status: 'success',
          count: Array.isArray(rolesResponse.data) ? rolesResponse.data.length : 'unknown',
          sample: Array.isArray(rolesResponse.data) && rolesResponse.data.length > 0 
            ? rolesResponse.data[0] 
            : null
        } : {
          status: 'error',
          error: rolesResponse.error
        },
        users: userResponse.data ? {
          status: 'success',
          count: Array.isArray(userResponse.data) ? userResponse.data.length : 'unknown',
          sample: Array.isArray(userResponse.data) && userResponse.data.length > 0 
            ? {
                id: userResponse.data[0]._id,
                firebaseId: userResponse.data[0].firebaseUserId,
                name: `${userResponse.data[0].localUserInfo?.firstName || ''} ${userResponse.data[0].localUserInfo?.lastName || ''}`.trim(),
                roles: userResponse.data[0].roleIds?.length || 0
              } 
            : null
        } : {
          status: 'error',
          error: userResponse.error
        }
      };
    } catch (error) {
      console.error('Backend connection error:', error);
      backendStatus = {
        status: 'error',
        error: error.message
      };
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        env: process.env.NODE_ENV
      },
      database: {
        status: dbStatus,
        mongooseStatus,
      },
      models: {
        path: calendarBeModelsPath,
        exists: modelPathExists,
        files: modelFiles,
        status: modelsStatus
      },
      backend: {
        url: BE_URL,
        status: backendStatus,
        apiTests
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      message: "Error getting debug information"
    }, { status: 500 });
  }
}