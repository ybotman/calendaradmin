import { NextResponse } from 'next/server';
import axios from 'axios';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// GET organizer by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || "1";
    
    // Fetch organizer from backend
    const response = await axios.get(`${BE_URL}/api/organizers/${id}?appId=${appId}`);
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error(`Error fetching organizer ${params.id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to fetch organizer',
      details: error.response?.data?.message || error.message
    }, { status: error.response?.status || 500 });
  }
}

// PATCH update organizer by ID
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || "1";
    const updates = await request.json();
    
    console.log(`API: Updating organizer ${id} with appId ${appId}`);
    console.log(`API: Update data:`, JSON.stringify(updates, null, 2));
    
    // Explicitly validate that id is a valid string and not undefined or other
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error(`API: Invalid organizer ID: "${id}"`);
      return NextResponse.json({ 
        error: 'Invalid organizer ID',
        details: `ID must be a valid MongoDB ObjectId string, got: ${typeof id} ${id}`
      }, { status: 400 });
    }
    
    // Check if this is a user disconnection operation (setting firebaseUserId to null)
    // We no longer use linkedUserLogin - only check firebaseUserId
    const isUserDisconnection = updates.hasOwnProperty('firebaseUserId') && updates.firebaseUserId === null;
    
    // If disconnecting a user, we need to update the user's references as well
    if (isUserDisconnection) {
      try {
        // First, fetch the organizer to get the current user information
        const getResponse = await axios.get(`${BE_URL}/api/organizers/${id}?appId=${appId}`);
        const organizer = getResponse.data;
        
        if (organizer && organizer.firebaseUserId) {
          console.log(`Disconnecting user ${organizer.firebaseUserId} from organizer ${id}`);
          
          try {
            // Fetch the user to update their references
            const userResponse = await axios.get(`${BE_URL}/api/userlogins/firebase/${organizer.firebaseUserId}?appId=${appId}`);
            const user = userResponse.data;
            
            if (user && user.regionalOrganizerInfo?.organizerId) {
              // Update the user to remove the organizer reference
              await axios.put(`${BE_URL}/api/userlogins/updateUserInfo`, {
                firebaseUserId: organizer.firebaseUserId,
                appId: appId,
                regionalOrganizerInfo: {
                  ...user.regionalOrganizerInfo,
                  organizerId: null,
                  wantRender: false,
                  isEnabled: false,
                  isActive: false
                }
              });
              
              console.log(`Successfully updated user to remove organizer reference`);
            }
          } catch (userError) {
            console.warn(`Error updating user references: ${userError.message}`);
            // Continue with organizer update even if user update fails
          }
        }
      } catch (getError) {
        console.warn(`Error fetching organizer details: ${getError.message}`);
        // Continue with organizer update even if we can't fetch organizer details
      }
    }
    
    // Check if this is a user connection operation (setting firebaseUserId to new values)
    // We now only use firebaseUserId, not linkedUserLogin
    const isUserConnection = updates.hasOwnProperty('firebaseUserId') && 
                             updates.firebaseUserId !== null &&
                             typeof updates.firebaseUserId === 'string';
    
    if (isUserConnection) {
      try {
        // Use our dedicated connect-user endpoint for proper bidirectional updates
        console.log(`Connecting user ${updates.firebaseUserId} to organizer ${id}`);
        
        await axios.patch(`/api/organizers/${id}/connect-user`, {
          firebaseUserId: updates.firebaseUserId,
          appId: appId
        });
        
        console.log(`Successfully connected user to organizer via dedicated endpoint`);
        
        // If the connection was successful, we don't need to update the organizer again
        // Just return success
        return NextResponse.json({ 
          message: 'User connected to organizer successfully',
          organizerId: id,
          firebaseUserId: updates.firebaseUserId
        });
      } catch (connectError) {
        console.warn(`Error using dedicated connection endpoint: ${connectError.message}`);
        console.log(`Continuing with standard update approach...`);
        // Continue with standard update approach
      }
    }
    
    // Prepare the backend URL
    const updateUrl = `${BE_URL}/api/organizers/${id}?appId=${appId}`;
    console.log(`API: PUT request to: ${updateUrl}`);
    
    // Make sure all required fields are present
    const organizer = {
      ...updates,
      appId,
      _id: id, // Ensure _id is included
      // Both fullName and name need to be synchronized for compatibility
      fullName: updates.name || updates.fullName, // The backend actually uses fullName (not name)
      name: updates.name || updates.fullName, // Admin UI uses name but backend expects fullName
      shortName: updates.shortName || updates.name || updates.fullName, // Ensure shortName exists
      // Ensure boolean fields are properly sent as booleans
      wantRender: updates.wantRender === true || updates.wantRender === 'true' ? true : false,
      isActive: updates.isActive === true || updates.isActive === 'true' ? true : false,
      isEnabled: updates.isEnabled === true || updates.isEnabled === 'true' ? true : false,
      organizerRegion: updates.organizerRegion || "66c4d99042ec462ea22484bd" // Default US region
    };
    
    console.log('API: Normalized organizer data:', JSON.stringify(organizer, null, 2));
    
    // Forward request to backend
    try {
      const response = await axios.put(updateUrl, organizer);
      console.log('API: Update successful:', response.data);
      return NextResponse.json(response.data);
    } catch (backendError) {
      console.error(`API: Backend error:`, backendError);
      console.error(`API: Backend response:`, backendError.response?.data);
      
      // Try an alternative approach - sometimes the backend expects different endpoints
      if (backendError.response?.status === 404) {
        console.log(`API: 404 returned, trying alternate endpoint...`);
        try {
          // Try without trailing slash
          const altUrl = `${BE_URL}/api/organizers/${id}?appId=${appId}`;
          console.log(`API: Trying alternate URL: ${altUrl}`);
          const altResponse = await axios.put(altUrl, organizer);
          console.log('API: Alternate URL successful:', altResponse.data);
          return NextResponse.json(altResponse.data);
        } catch (altError) {
          console.error(`API: Alternative approach also failed:`, altError);
          throw altError; // Rethrow to be caught by outer catch
        }
      }
      
      throw backendError; // Rethrow to be caught by outer catch
    }
  } catch (error) {
    console.error(`API: Error updating organizer ${params.id}:`, error);
    let errorDetails = error.message;
    let statusCode = 500;
    
    if (error.response) {
      statusCode = error.response.status || 500;
      errorDetails = JSON.stringify(error.response.data || {});
      console.error(`API: Error status: ${statusCode}, details:`, errorDetails);
    }
    
    return NextResponse.json({ 
      error: 'Failed to update organizer',
      details: errorDetails
    }, { status: statusCode });
  }
}

// DELETE organizer by ID
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || "1";
    
    console.log(`Deleting organizer ${id} with appId ${appId}`);
    
    // First, fetch the organizer to get user connection information
    try {
      const getResponse = await axios.get(`${BE_URL}/api/organizers/${id}?appId=${appId}`);
      const organizer = getResponse.data;
      
      // Check if this organizer has a connected user
      if (organizer && organizer.firebaseUserId) {
        console.log(`Organizer has linked user with Firebase ID: ${organizer.firebaseUserId}`);
        
        try {
          // Fetch the user to update its references
          const userResponse = await axios.get(`${BE_URL}/api/userlogins/firebase/${organizer.firebaseUserId}?appId=${appId}`);
          const user = userResponse.data;
          
          if (user && user.regionalOrganizerInfo?.organizerId) {
            console.log(`Found linked user, removing organizer reference...`);
            
            // Update the user to remove the organizer reference
            await axios.put(`${BE_URL}/api/userlogins/updateUserInfo`, {
              firebaseUserId: organizer.firebaseUserId,
              appId: appId,
              regionalOrganizerInfo: {
                ...user.regionalOrganizerInfo,
                organizerId: null,
                wantRender: false,
                isEnabled: false,
                isActive: false
              }
            });
            
            // Check if user has the RegionalOrganizer role and consider removing it
            if (user.roleIds && user.roleIds.length > 0) {
              try {
                // Fetch roles to find the RegionalOrganizer role
                const rolesResponse = await axios.get(`${BE_URL}/api/roles?appId=${appId}`);
                const roles = rolesResponse.data;
                const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
                
                if (organizerRole) {
                  // Filter out the RegionalOrganizer role
                  const updatedRoleIds = user.roleIds.filter(roleId => {
                    const roleIdStr = typeof roleId === 'object' ? roleId._id : roleId.toString();
                    return roleIdStr !== organizerRole._id.toString();
                  });
                  
                  if (updatedRoleIds.length !== user.roleIds.length) {
                    console.log(`Removing RegionalOrganizer role from user...`);
                    
                    // Update user roles
                    await axios.put(`${BE_URL}/api/userlogins/${organizer.firebaseUserId}/roles`, {
                      roleIds: updatedRoleIds,
                      appId: appId
                    });
                  }
                }
              } catch (roleError) {
                console.warn(`Error updating user roles: ${roleError.message}`);
                // Continue with deletion even if role update fails
              }
            }
            
            console.log(`Successfully updated user to remove organizer references`);
          }
        } catch (userError) {
          console.warn(`Error updating linked user: ${userError.message}`);
          // Continue with deletion even if user update fails
        }
      }
    } catch (getError) {
      console.warn(`Error fetching organizer details: ${getError.message}`);
      // Continue with deletion even if we can't fetch organizer details
    }
    
    // Now proceed with organizer deletion
    const response = await axios.delete(`${BE_URL}/api/organizers/${id}?appId=${appId}`);
    
    console.log('Delete successful');
    return NextResponse.json({ message: 'Organizer deleted successfully' });
  } catch (error) {
    console.error(`Error deleting organizer ${params.id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to delete organizer',
      details: error.response?.data?.message || error.message
    }, { status: error.response?.status || 500 });
  }
}