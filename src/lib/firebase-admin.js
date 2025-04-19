import admin from 'firebase-admin';

// Initialize admin if needed and possible
let isInitialized = false;
let initError = null;

function initializeFirebaseAdmin() {
  // Only initialize once
  if (admin.apps.length) {
    isInitialized = true;
    return true;
  }
  
  try {
    // Check for Firebase credentials
    if (!process.env.FIREBASE_JSON) {
      initError = new Error('FIREBASE_JSON environment variable is missing');
      console.warn('FIREBASE_JSON not found, Firebase Admin SDK not initialized');
      return false;
    }
    
    // Parse the base64-encoded Firebase service account credentials
    let serviceAccount;
    try {
      const decodedJson = Buffer.from(process.env.FIREBASE_JSON, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedJson);
    } catch (parseError) {
      initError = new Error(`Invalid FIREBASE_JSON format: ${parseError.message}`);
      console.error('Failed to parse Firebase credentials:', parseError);
      return false;
    }
    
    // Verify essential service account fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      initError = new Error(`Firebase service account missing required fields: ${missingFields.join(', ')}`);
      console.error('Invalid Firebase service account:', initError.message);
      return false;
    }
    
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    isInitialized = true;
    console.log(`Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}`);
    return true;
  } catch (error) {
    initError = error;
    console.error('Firebase Admin initialization error:', error);
    return false;
  }
}

// Try to initialize on module load
try {
  initializeFirebaseAdmin();
} catch (err) {
  console.error('Error setting up Firebase Admin:', err);
}

// Export an object with the admin instance and initialization status
export default {
  admin,
  
  // Helper function to check if Firebase is available
  isAvailable: () => {
    if (!isInitialized && !initError) {
      // Try again if not already initialized and there's no error
      return initializeFirebaseAdmin();
    }
    return isInitialized;
  },
  
  // Force initialization (useful for error recovery)
  initialize: () => {
    return initializeFirebaseAdmin();
  },
  
  // Get auth if available
  getAuth: () => {
    if (!isInitialized) {
      // Try to initialize if not already initialized
      if (initializeFirebaseAdmin()) {
        return admin.auth();
      }
      console.warn('Firebase Admin SDK not initialized, auth not available');
      return null;
    }
    return admin.auth();
  },
  
  // Get initialization error if any
  getInitError: () => initError
};