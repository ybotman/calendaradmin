/**
 * Script to remove temporary user logins created during the BTC import process
 * 
 * This script identifies and removes all user logins with firebaseUserId starting with "temp_"
 * Run this script after completing the BTC data import to clean up temporary users.
 * 
 * The script will try multiple endpoints to fetch and delete users:
 * 1. First tries /api/users endpoint
 * 2. Falls back to /api/userlogins endpoint
 * 3. As a last resort, attempts direct MongoDB connection if MONGODB_URI is configured
 * 
 * Usage:
 *  node scripts/remove-temp-users.js
 * 
 * Environment variables:
 *  NEXT_PUBLIC_BE_URL - Backend URL (default: http://localhost:3003)
 *  APP_ID - Application ID (default: 1)
 *  DRY_RUN - Set to 'false' to actually delete users (default: true)
 *  MONGODB_URI - Direct MongoDB connection string for fallback access
 */

const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3003';
const APP_ID = process.env.APP_ID || '1';
// DRY_RUN defaults to true unless explicitly set to the string 'false'
const DRY_RUN = process.env.DRY_RUN !== 'false';
const MONGODB_URI = process.env.MONGODB_URI;

// Validate MongoDB connection string if provided
function hasValidMongoDBUri() {
  if (!MONGODB_URI) {
    return false;
  }
  
  // Basic validation that it's a mongodb connection string
  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    console.warn('MONGODB_URI does not appear to be a valid MongoDB connection string');
    return false;
  }
  
  return true;
}

async function main() {
  try {
    console.log('=== Temporary User Cleanup Script ===');
    console.log('Starting removal of temporary user logins...');
    console.log('Configuration:');
    console.log(`- Backend URL: ${BE_URL}`);
    console.log(`- App ID: ${APP_ID}`);
    console.log(`- Dry Run Mode: ${DRY_RUN ? 'Yes (no users will be deleted)' : 'No (users will be deleted)'}`);
    console.log(`- MongoDB Direct Connection: ${hasValidMongoDBUri() ? 'Available' : 'Not Available'}`);
    console.log('================================');
    
    // 1. Get all user logins - try different endpoints
    console.log('Fetching all user logins...');
    let allUsers = [];

    try {
      // Try /api/userlogins endpoint first
      console.log('Attempting to fetch from /api/userlogins endpoint...');
      const usersResponse = await axios.get(`${BE_URL}/api/userlogins?appId=${APP_ID}`);
      
      if (usersResponse.data && Array.isArray(usersResponse.data)) {
        allUsers = usersResponse.data;
        console.log(`Successfully fetched ${allUsers.length} users from /api/userlogins endpoint`);
      } else {
        console.log('Invalid response format from /api/userlogins endpoint');
      }
    } catch (firstEndpointError) {
      console.error('Error fetching from /api/userlogins endpoint:', firstEndpointError.message);
      
      // Try alternative endpoints as fallback
      try {
        console.log('Attempting to fetch users from /api/users endpoint...');
        const firstFallbackResponse = await axios.get(`${BE_URL}/api/users?appId=${APP_ID}&limit=1000`);
        
        if (firstFallbackResponse.data && Array.isArray(firstFallbackResponse.data)) {
          allUsers = firstFallbackResponse.data;
          console.log(`Successfully fetched ${allUsers.length} users from /api/users endpoint`);
        } else {
          console.log('Invalid response format from /api/users endpoint');
        }
      } catch (secondEndpointError) {
        console.error('Error fetching from /api/users endpoint:', secondEndpointError.message);
        
        // Try /api/userlogins endpoint as fallback
        try {
          console.log('Attempting to fetch from /api/userlogins endpoint...');
          const secondFallbackResponse = await axios.get(`${BE_URL}/api/userlogins?appId=${APP_ID}&limit=1000`);
          
          if (secondFallbackResponse.data && Array.isArray(secondFallbackResponse.data)) {
            allUsers = secondFallbackResponse.data;
            console.log(`Successfully fetched ${allUsers.length} users from /api/userlogins endpoint`);
          } else {
            console.log('Invalid response format from /api/userlogins endpoint');
          }
        } catch (thirdEndpointError) {
          console.error('Error fetching from /api/userlogins endpoint:', thirdEndpointError.message);
          
          // Try a fourth alternative if needed
        try {
          console.log('Attempting direct MongoDB connection as last resort...');
          // Connect to MongoDB directly if connection string is available and valid
          if (hasValidMongoDBUri()) {
            try {
              await mongoose.connect(MONGODB_URI);
              
              // Try to determine the correct collection name
              const collections = await mongoose.connection.db.listCollections().toArray();
              const collectionNames = collections.map(c => c.name);
              console.log('Available collections:', collectionNames.join(', '));
              
              // Try different collection names based on what's available
              let userCollection = 'userLogins'; // Default collection name
              
              if (collectionNames.includes('userLogins')) {
                userCollection = 'userLogins';
              } else if (collectionNames.includes('users')) {
                userCollection = 'users';
              } else if (collectionNames.includes('userlogins')) {
                userCollection = 'userlogins';
              } else if (collectionNames.includes('UserLogins')) {
                userCollection = 'UserLogins';
              }
              
              console.log(`Using collection: ${userCollection}`);
              const UserLoginModel = mongoose.model('UserLogins', new mongoose.Schema({}, { strict: false }), userCollection);
              
              // Try with and without appId filter
              let query = {};
              if (APP_ID) {
                // First try with appId filter
                try {
                  const withAppId = await UserLoginModel.find({ 'appId': APP_ID }).limit(1000).lean();
                  if (withAppId.length > 0) {
                    allUsers = withAppId;
                    console.log(`Found ${allUsers.length} users with appId filter`);
                  } else {
                    // Try without appId filter if no results
                    allUsers = await UserLoginModel.find({}).limit(1000).lean();
                    console.log(`Found ${allUsers.length} users without appId filter`);
                  }
                } catch (queryError) {
                  console.log(`Error with appId query: ${queryError.message}`);
                  // Try without appId filter
                  allUsers = await UserLoginModel.find({}).limit(1000).lean();
                }
              } else {
                allUsers = await UserLoginModel.find({}).limit(1000).lean();
              }
              
              console.log(`Successfully fetched ${allUsers.length} users directly from MongoDB`);
              await mongoose.disconnect();
            } catch (mongoConnectError) {
              console.error('Error connecting to MongoDB:', mongoConnectError.message);
            }
          } else {
            console.error('Valid MONGODB_URI environment variable not set, cannot connect directly');
          }
        } catch (directDbError) {
          console.error('Error with direct MongoDB connection:', directDbError.message);
        }
      }
    }
    
    if (allUsers.length === 0) {
      console.error('Could not fetch any users from any available endpoint');
      return;
    }
    
    console.log(`Found ${allUsers.length} total user logins`);
    
    // 2. Filter for temporary users with various temp prefixes
    const tempUsers = allUsers.filter(user => 
      user.firebaseUserId && 
      typeof user.firebaseUserId === 'string' && 
      (user.firebaseUserId.startsWith('temp_') || 
       user.firebaseUserId.startsWith('fake_firebase_') ||
       user.firebaseUserId.startsWith('temp-') ||
       user.firebaseUserId.includes('temp') ||
       user.firebaseUserId.includes('fake'))
    );
    
    console.log(`Found ${tempUsers.length} temporary users to remove`);
    
    // Log details about any found users
    if (tempUsers.length > 0) {
      console.log('Temp user patterns found:');
      const patterns = {};
      
      tempUsers.forEach(user => {
        let pattern = 'other';
        if (user.firebaseUserId.startsWith('temp_')) pattern = 'temp_';
        else if (user.firebaseUserId.startsWith('fake_firebase_')) pattern = 'fake_firebase_';
        else if (user.firebaseUserId.startsWith('temp-')) pattern = 'temp-';
        else if (user.firebaseUserId.includes('temp')) pattern = 'contains_temp';
        else if (user.firebaseUserId.includes('fake')) pattern = 'contains_fake';
        
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      });
      
      Object.entries(patterns).forEach(([pattern, count]) => {
        console.log(`- ${pattern}: ${count} users`);
      });
    }
    
    if (tempUsers.length === 0) {
      console.log('No temporary users found. Nothing to do.');
      return;
    }
    
    // 3. Display the users to be removed
    console.log('\nUsers to be removed:');
    tempUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}, Firebase ID: ${user.firebaseUserId}, Name: ${user.firstName} ${user.lastName}`);
    });
    
    // 4. Confirm and delete
    if (DRY_RUN) {
      console.log('\nDRY RUN: No users will be deleted.');
      console.log('Set DRY_RUN = false to actually delete these users.');
    } else {
      console.log('\nDeleting temporary users...');
      
      // Delete users one by one
      for (const user of tempUsers) {
        try {
          console.log(`Deleting user ${user._id} (${user.firebaseUserId})...`);
          
          // Try each endpoint in sequence until successful
          try {
            // Try deleting with /api/userlogins path
            await axios.delete(`${BE_URL}/api/userlogins/${user._id}?appId=${APP_ID}`);
            console.log(`Successfully deleted user ${user._id} using /api/userlogins endpoint`);
          } catch (firstDeleteError) {
            console.log(`Error with first delete attempt: ${firstDeleteError.message}`);
            console.log(`Trying alternate /api/users endpoint...`);
            
            try {
              await axios.delete(`${BE_URL}/api/users/${user._id}?appId=${APP_ID}`);
              console.log(`Successfully deleted user ${user._id} using /api/users endpoint`);
            } catch (secondDeleteError) {
              console.log(`Error with second delete attempt: ${secondDeleteError.message}`);
              console.log(`Trying alternate /api/userlogins endpoint...`);
              
              try {
                await axios.delete(`${BE_URL}/api/userlogins/${user._id}?appId=${APP_ID}`);
                console.log(`Successfully deleted user ${user._id} using /api/userlogins endpoint`);
              } catch (thirdDeleteError) {
                console.log(`Error with third delete attempt: ${thirdDeleteError.message}`);
                
                // Try direct MongoDB deletion as last resort
                if (hasValidMongoDBUri()) {
                  try {
                    console.log(`Attempting direct MongoDB deletion as last resort...`);
                    await mongoose.connect(MONGODB_URI);
                    
                    // Try to determine the correct collection name
                    const collections = await mongoose.connection.db.listCollections().toArray();
                    const collectionNames = collections.map(c => c.name);
                    console.log('Available collections for deletion:', collectionNames.join(', '));
                    
                    // Try different collection names based on what's available
                    let userCollection = 'userLogins'; // Default collection name
                    
                    if (collectionNames.includes('userLogins')) {
                      userCollection = 'userLogins';
                    } else if (collectionNames.includes('users')) {
                      userCollection = 'users';
                    } else if (collectionNames.includes('userlogins')) {
                      userCollection = 'userlogins';
                    } else if (collectionNames.includes('UserLogins')) {
                      userCollection = 'UserLogins';
                    }
                    
                    console.log(`Using collection for deletion: ${userCollection}`);
                    const UserLoginModel = mongoose.model('UserLoginDelete', new mongoose.Schema({}, { strict: false }), userCollection);
                  
                    // Convert string ID to ObjectId if needed
                    let userId = user._id;
                    if (typeof userId === 'string') {
                      try {
                        userId = new mongoose.Types.ObjectId(userId);
                      } catch (objectIdError) {
                        console.warn(`Could not convert ${userId} to ObjectId: ${objectIdError.message}`);
                        // Continue with string ID
                      }
                    }
                    
                    let result;
                    try {
                      // First try with appId
                      result = await UserLoginModel.deleteOne({ _id: userId, appId: APP_ID });
                      
                      if (result.deletedCount === 0) {
                        // If no match with appId, try without it
                        console.log(`No match found with appId, trying without appId filter...`);
                        result = await UserLoginModel.deleteOne({ _id: userId });
                      }
                    } catch (deleteQueryError) {
                      console.log(`Error with appId in delete query: ${deleteQueryError.message}`);
                      // Try without appId filter
                      result = await UserLoginModel.deleteOne({ _id: userId });
                    }
                    
                    if (result.deletedCount > 0) {
                      console.log(`Successfully deleted user ${user._id} directly from MongoDB`);
                    } else {
                      throw new Error(`User ${user._id} not found in database`);
                    }
                    
                    await mongoose.disconnect();
                } catch (directDbDeleteError) {
                  console.error(`Failed to delete via direct MongoDB connection:`, directDbDeleteError.message);
                  throw new Error('All delete attempts failed');
                }
              } else {
                throw new Error('All API delete attempts failed and valid MONGODB_URI not available');
              }
            }
          }
        } catch (error) {
          console.error(`Failed to delete user ${user._id}:`, error.message);
          
          if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
          }
        }
      }
      
      console.log('\nTemporary user cleanup completed.');
    }
    
  } catch (error) {
    console.error('Error in cleanup script:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
main()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });