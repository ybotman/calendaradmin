import { NextResponse } from 'next/server';
import axios from 'axios';
import firebaseAdmin from '@/lib/firebase-admin'; // Import the improved firebase admin object

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// GET handler - Get all users or filter by parameters
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || "1";
    const active = searchParams.has('active') ? searchParams.get('active') === 'true' : undefined;
    
    // Build query string for backend request
    let queryString = `appId=${appId}`;
    if (active !== undefined) {
      queryString += `&active=${active}`;
    }
    
    // Fetch users from backend
    const response = await axios.get(`${BE_URL}/api/userlogins/all?${queryString}`);
    
    // Log users with organizer connections
    const usersWithOrganizers = response.data.filter(user => 
      user.regionalOrganizerInfo && user.regionalOrganizerInfo.organizerId
    );
    
    console.log(`API: Found ${usersWithOrganizers.length} users with organizer connections`);
    usersWithOrganizers.forEach(user => {
      console.log(`API: User ${user.firebaseUserId} has organizerId: ${user.regionalOrganizerInfo.organizerId}`);
    });
    
    // Return the data directly
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    }, { status: 500 });
  }
}

// POST handler - Create a new user - with or without Firebase authentication
export async function POST(request) {
  try {
    const { email, password, firstName, lastName, appId = '1', active = true } = await request.json();

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Generate a unique Firebase-like ID for the user (if we don't have Firebase)
    let firebaseUserId;
    
    // Try to create user in Firebase if available
    if (firebaseAdmin.isAvailable() && password) {
      const auth = firebaseAdmin.getAuth();
      
      try {
        const firebaseUser = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
        });
        firebaseUserId = firebaseUser.uid;
        console.log(`Firebase user created: ${firebaseUserId}`);
      } catch (firebaseError) {
        console.warn('Firebase user creation failed:', firebaseError);
        // Return an error rather than creating a temporary ID
        return NextResponse.json(
          { success: false, message: `Firebase user creation failed: ${firebaseError.message}` }, 
          { status: 500 }
        );
      }
    } else {
      // Firebase not available, return an error
      console.error('Firebase not available, cannot create user');
      return NextResponse.json(
        { success: false, message: 'Firebase authentication is required to create users' }, 
        { status: 503 }
      );
    }
    
    console.log(`Creating user with ID: ${firebaseUserId}`);

    // Prepare data for backend
    const userLoginData = {
      firebaseUserId,
      appId,
      active,
      localUserInfo: {
        firstName,
        lastName,
        isActive: true,
        isApproved: true,
        isEnabled: true,
      },
      roleIds: [], // Default to no roles
      firebaseUserInfo: {
        email,
        displayName: `${firstName} ${lastName}`,
      }
    };

    // Call backend API to create the user login
    const response = await axios.post(`${BE_URL}/api/userlogins`, userLoginData);

    return NextResponse.json(
      { message: 'User created successfully', ...response.data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Determine the appropriate error message and status
    let errorMessage = 'Error creating user';
    let statusCode = 500;
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Email address is already in use';
      statusCode = 409; // Conflict
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
      statusCode = 400; // Bad Request
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak (minimum 6 characters)';
      statusCode = 400; // Bad Request
    } else if (error.response) {
      // If it's an error response from the API call
      errorMessage = error.response.data?.message || errorMessage;
      statusCode = error.response.status || statusCode;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: statusCode }
    );
  }
}

// PATCH handler - Update user
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { firebaseUserId, appId = "1" } = data;
    
    // Forward request to backend
    const response = await axios.put(`${BE_URL}/api/userlogins/updateUserInfo`, data);
    
    return NextResponse.json({
      message: 'User updated successfully',
      user: response.data.updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error.response?.data?.message || error.message 
    }, { status: error.response?.status || 500 });
  }
}