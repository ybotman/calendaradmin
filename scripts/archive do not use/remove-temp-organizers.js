/**
 * Script to clean up organizers created during the BTC import process
 * 
 * This script identifies and optionally removes organizers with:
 * 1. firebaseUserId starting with "temp_" or "fake_firebase_"
 * 2. btcNiceName field populated (indicating it came from BTC import)
 * 
 * The script will try multiple endpoints and connection methods:
 * 1. First tries /api/organizers endpoint
 * 2. As a last resort, attempts direct MongoDB connection if MONGODB_URI is configured
 * 
 * Usage:
 *  node scripts/remove-temp-organizers.js
 * 
 * Environment variables:
 *  NEXT_PUBLIC_BE_URL - Backend URL (default: http://localhost:3010)
 *  APP_ID - Application ID (default: 1)
 *  DRY_RUN - Set to 'false' to actually delete organizers (default: true)
 *  REMOVE_BTC_ORGANIZERS - Set to 'true' to remove all BTC imported organizers (default: false)
 *  MONGODB_URI - Direct MongoDB connection string for fallback access
 */

const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
const APP_ID = process.env.APP_ID || '1';
// DRY_RUN defaults to true unless explicitly set to the string 'false'
const DRY_RUN = process.env.DRY_RUN !== 'false';
// REMOVE_BTC_ORGANIZERS defaults to false unless explicitly set to the string 'true'
const REMOVE_BTC_ORGANIZERS = process.env.REMOVE_BTC_ORGANIZERS === 'true';
const MONGODB_URI = process.env.MONGODB_URI;

// Add a check to ensure APP_ID is valid
if (!APP_ID || APP_ID === '1') {
  console.warn('Warning: APP_ID is not properly configured. Using default value of "1".');
}

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
    console.log('=== Temporary Organizer Cleanup Script ===');
    console.log('Starting cleanup of organizers from import process...');
    console.log('Configuration:');
    console.log(`- Backend URL: ${BE_URL}`);
    console.log(`- App ID: ${APP_ID}`);
    console.log(`- Dry Run Mode: ${DRY_RUN ? 'Yes (no organizers will be deleted)' : 'No (organizers will be deleted)'}`);
    console.log(`- Remove ALL BTC Organizers: ${REMOVE_BTC_ORGANIZERS ? 'Yes' : 'No (only temp organizers)'}`);
    console.log(`- MongoDB Direct Connection: ${hasValidMongoDBUri() ? 'Available' : 'Not Available'}`);
    console.log('================================');
    
    // 1. Get all organizers - try different methods
    console.log('Fetching all organizers...');
    let allOrganizers = [];

    try {
      // First try the /api/organizers endpoint
      console.log('Attempting to fetch from /api/organizers endpoint...');
      const organizersResponse = await axios.get(`${BE_URL}/api/organizers?appId=${APP_ID}`);
      
      if (organizersResponse.data && Array.isArray(organizersResponse.data)) {
        allOrganizers = organizersResponse.data;
        console.log(`Successfully fetched ${allOrganizers.length} organizers from /api/organizers endpoint`);
      } else {
        console.log('Invalid response format from /api/organizers endpoint');
        console.log('Response data:', organizersResponse.data);
      }
    } catch (firstApiError) {
      console.error('Error fetching from /api/organizers endpoint:', firstApiError.message);
      
      // No fallback API endpoint since we're already trying the main one
      // Just log the error and proceed to MongoDB connection
      
      // Try direct MongoDB connection as fallback
      if (hasValidMongoDBUri()) {
        try {
          console.log('Attempting direct MongoDB connection as fallback...');
          await mongoose.connect(MONGODB_URI);
          
          // Try to determine the correct collection name
          const collections = await mongoose.connection.db.listCollections().toArray();
          const collectionNames = collections.map(c => c.name);
          console.log('Available collections:', collectionNames.join(', '));
          
          // Try different collection names based on what's available
          let organizerCollection = 'organizers'; // Default collection name
          
          if (collectionNames.includes('organizers')) {
            organizerCollection = 'organizers';
          } else if (collectionNames.includes('Organizers')) {
            organizerCollection = 'Organizers';
          }
          
          console.log(`Using collection: ${organizerCollection}`);
          const OrganizerModel = mongoose.model('Organizer', new mongoose.Schema({}, { strict: false }), organizerCollection);
          
          // Try with and without appId filter
          let query = {};
          if (APP_ID) {
            // First try with appId filter
            try {
              const withAppId = await OrganizerModel.find({ 'appId': APP_ID }).limit(1000).lean();
              if (withAppId.length > 0) {
                allOrganizers = withAppId;
                console.log(`Found ${allOrganizers.length} organizers with appId filter`);
              } else {
                // Try without appId filter if no results
                allOrganizers = await OrganizerModel.find({}).limit(1000).lean();
                console.log(`Found ${allOrganizers.length} organizers without appId filter`);
              }
            } catch (queryError) {
              console.log(`Error with appId query: ${queryError.message}`);
              // Try without appId filter
              allOrganizers = await OrganizerModel.find({}).limit(1000).lean();
            }
          } else {
            allOrganizers = await OrganizerModel.find({}).limit(1000).lean();
          }
          
          console.log(`Successfully fetched ${allOrganizers.length} organizers directly from MongoDB`);
          await mongoose.disconnect();
        } catch (mongoError) {
          console.error('Error with direct MongoDB connection:', mongoError.message);
        }
      } else {
        console.error('Valid MONGODB_URI environment variable not set, cannot connect directly');
      }
    }
    
    if (allOrganizers.length === 0) {
      console.error('Could not fetch any organizers from any available endpoint');
      return;
    }
    
    console.log(`Found ${allOrganizers.length} total organizers`);
    
    // 2. Filter for temporary organizers with various temp prefixes
    const tempOrganizers = allOrganizers.filter(organizer => 
      organizer.firebaseUserId && 
      typeof organizer.firebaseUserId === 'string' && 
      (organizer.firebaseUserId.startsWith('temp_') || 
       organizer.firebaseUserId.startsWith('fake_firebase_') ||
       organizer.firebaseUserId.startsWith('temp-') ||
       organizer.firebaseUserId.includes('temp') ||
       organizer.firebaseUserId.includes('fake'))
    );
    
    console.log(`Found ${tempOrganizers.length} organizers with temporary firebaseUserId`);
    
    // Log details about any found temporary organizers
    if (tempOrganizers.length > 0) {
      console.log('Temp organizer patterns found:');
      const patterns = {};
      
      tempOrganizers.forEach(organizer => {
        let pattern = 'other';
        if (organizer.firebaseUserId.startsWith('temp_')) pattern = 'temp_';
        else if (organizer.firebaseUserId.startsWith('fake_firebase_')) pattern = 'fake_firebase_';
        else if (organizer.firebaseUserId.startsWith('temp-')) pattern = 'temp-';
        else if (organizer.firebaseUserId.includes('temp')) pattern = 'contains_temp';
        else if (organizer.firebaseUserId.includes('fake')) pattern = 'contains_fake';
        
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      });
      
      Object.entries(patterns).forEach(([pattern, count]) => {
        console.log(`- ${pattern}: ${count} organizers`);
      });
    }
    
    // 3. Filter for all BTC imported organizers
    const btcOrganizers = allOrganizers.filter(organizer => 
      organizer.btcNiceName && organizer.btcNiceName.length > 0
    );
    
    console.log(`Found ${btcOrganizers.length} organizers imported from BTC (with btcNiceName field)`);
    
    // Determine which ones to remove based on configuration
    let organizersToRemove = [];
    
    if (REMOVE_BTC_ORGANIZERS) {
      console.log('Configured to remove ALL BTC imported organizers');
      organizersToRemove = btcOrganizers;
    } else {
      console.log('Configured to remove ONLY organizers with temporary firebaseUserId');
      organizersToRemove = tempOrganizers;
    }
    
    if (organizersToRemove.length === 0) {
      console.log('No organizers found to remove. Nothing to do.');
      return;
    }
    
    // 4. Display the organizers to be removed
    console.log('\nOrganizers to be removed:');
    organizersToRemove.forEach((organizer, index) => {
      console.log(
        `${index + 1}. ID: ${organizer._id}, ` +
        `Name: ${organizer.fullName || organizer.name}, ` +
        `Firebase ID: ${organizer.firebaseUserId}, ` +
        `BTC ID: ${organizer.btcNiceName || 'N/A'}`
      );
    });
    
    // 5. Confirm and delete
    if (DRY_RUN) {
      console.log('\nDRY RUN: No organizers will be deleted.');
      console.log('Set DRY_RUN = false to actually delete these organizers.');
      return;
    }
    
    console.log('\nDeleting organizers...');
    
    // Delete organizers one by one
    for (const organizer of organizersToRemove) {
      try {
        console.log(`Deleting organizer ${organizer._id} (${organizer.fullName || organizer.name})...`);
        
        try {
          // Try the API endpoint
          await axios.delete(`${BE_URL}/api/organizers/${organizer._id}?appId=${APP_ID}`);
          console.log(`Successfully deleted organizer ${organizer._id} using /api/organizers endpoint`);
        } catch (firstDeleteError) {
          console.log(`Error with /api/organizers delete attempt: ${firstDeleteError.message}`);
            
          // Try direct MongoDB deletion as fallback
          if (hasValidMongoDBUri()) {
            try {
              console.log(`Attempting direct MongoDB deletion as fallback...`);
              await mongoose.connect(MONGODB_URI);
              
              // Try to determine the correct collection name
              const collections = await mongoose.connection.db.listCollections().toArray();
              const collectionNames = collections.map(c => c.name);
              console.log('Available collections for deletion:', collectionNames.join(', '));
              
              // Try different collection names based on what's available
              let organizerCollection = 'organizers'; // Default collection name
              
              if (collectionNames.includes('organizers')) {
                organizerCollection = 'organizers';
              } else if (collectionNames.includes('Organizers')) {
                organizerCollection = 'Organizers';
              }
              
              console.log(`Using collection for deletion: ${organizerCollection}`);
              const OrganizerModel = mongoose.model('OrganizerDelete', new mongoose.Schema({}, { strict: false }), organizerCollection);
              
              // Convert string ID to ObjectId if needed
              let organizerId = organizer._id;
              if (typeof organizerId === 'string') {
                try {
                  organizerId = new mongoose.Types.ObjectId(organizerId);
                } catch (objectIdError) {
                  console.warn(`Could not convert ${organizerId} to ObjectId: ${objectIdError.message}`);
                  // Continue with string ID
                }
              }
              
              let result;
              try {
                // First try with appId
                result = await OrganizerModel.deleteOne({ _id: organizerId, appId: APP_ID });
                
                if (result.deletedCount === 0) {
                  // If no match with appId, try without it
                  console.log(`No match found with appId, trying without appId filter...`);
                  result = await OrganizerModel.deleteOne({ _id: organizerId });
                }
              } catch (deleteQueryError) {
                console.log(`Error with appId in delete query: ${deleteQueryError.message}`);
                // Try without appId filter
                result = await OrganizerModel.deleteOne({ _id: organizerId });
              }
              
              if (result.deletedCount > 0) {
                console.log(`Successfully deleted organizer ${organizer._id} directly from MongoDB`);
              } else {
                throw new Error(`Organizer ${organizer._id} not found in database`);
              }
              await mongoose.disconnect();
              } catch (mongoDeleteError) {
                console.error(`Failed to delete via direct MongoDB connection:`, mongoDeleteError.message);
                throw new Error('All delete attempts failed');
              }
            } else {
              throw new Error('API delete failed and valid MONGODB_URI not available');
            }
          }
        } catch (error) {
          console.error(`Failed to delete organizer ${organizer._id}:`, error.message);
          
          if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
          }
      }
    }
    
    console.log('\nOrganizer cleanup completed.');
    
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