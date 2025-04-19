import { NextResponse } from 'next/server';
import firebaseAdmin from '@/lib/firebase-admin';

// This endpoint checks if Firebase Admin SDK is available and properly initialized
export async function GET() {
  try {
    // Check if Firebase Admin is available
    const isInitialized = firebaseAdmin.isAvailable();
    
    if (!isInitialized) {
      return NextResponse.json({
        success: false,
        status: 'Firebase Admin SDK is NOT initialized',
        possible_causes: [
          'FIREBASE_JSON environment variable is missing',
          'FIREBASE_JSON contains invalid JSON',
          'Firebase service account credentials are invalid',
        ],
        help: 'Set FIREBASE_JSON environment variable with base64-encoded service account credentials'
      });
    }
    
    // Try to get Firebase Auth instance to verify it's working
    const auth = firebaseAdmin.getAuth();
    
    if (!auth) {
      return NextResponse.json({
        success: false,
        status: 'Firebase Admin SDK is initialized but Auth is not available',
        possible_causes: [
          'Firebase Admin SDK initialization is incomplete',
          'Firebase service account does not have auth permissions'
        ]
      });
    }
    
    // Try to list users (just 1) to verify auth is working
    try {
      const usersList = await auth.listUsers(1);
      
      return NextResponse.json({
        success: true,
        status: 'Firebase Admin SDK is properly initialized and functional',
        users_available: usersList.users.length > 0,
        admin_initialized: true,
        auth_available: true,
        firebase_app: {
          name: firebaseAdmin.admin.apps[0]?.name || 'unknown',
          options: {
            projectId: firebaseAdmin.admin.apps[0]?.options?.projectId || 'unknown',
            serviceAccountId: firebaseAdmin.admin.apps[0]?.options?.serviceAccountId || 'unknown'
          }
        }
      });
    } catch (authError) {
      return NextResponse.json({
        success: false,
        status: 'Firebase Admin SDK is initialized but Auth API call failed',
        error: authError.message,
        code: authError.code,
        possible_causes: [
          'Firebase service account does not have required permissions',
          'Network connectivity issues to Firebase',
          'Project quotas or limits reached'
        ]
      });
    }
  } catch (error) {
    console.error('Error checking Firebase status:', error);
    
    return NextResponse.json({
      success: false,
      status: 'Error checking Firebase status',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}