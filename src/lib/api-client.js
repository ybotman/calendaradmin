/**
 * API client for the calendar-admin application
 * Provides a centralized way to make API requests to the backend
 */

import axios from 'axios';

// Base URL for the API - defaults to localhost:3010
const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

// Create a configured axios instance
const apiClient = axios.create({
  baseURL: BE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Users API
export const usersApi = {
  getUsers: async (appId = '1', active, timestamp, page = 1, limit = 100) => {
    try {
      // First try our frontend API which acts as a proxy
      let frontendUrl = `/api/users?appId=${appId}&page=${page}&limit=${limit}`;
      if (active !== undefined) {
        frontendUrl += `&active=${active}`;
      }
      // Add timestamp for cache busting if needed
      if (timestamp) {
        frontendUrl += `&_=${timestamp}`;
      }
      
      console.log('Getting users via frontend API:', frontendUrl);
      const frontendResponse = await axios.get(frontendUrl);
      
      // Check if the response has the new format with pagination
      if (frontendResponse.data && frontendResponse.data.users) {
        const { users, pagination } = frontendResponse.data;
        console.log(`Frontend API returned ${users.length} users (page ${pagination.page}/${pagination.pages} of ${pagination.total} total)`);
        
        // Augment users array with pagination info for apps that rely on it
        users.pagination = pagination;
        return users;
      } else if (Array.isArray(frontendResponse.data) && frontendResponse.data.length > 0) {
        // Legacy format
        console.log(`Frontend API returned ${frontendResponse.data.length} users (legacy format)`);
        return frontendResponse.data;
      } else {
        console.warn('Frontend API returned no users, falling back to direct backend call');
      }
    } catch (frontendError) {
      console.warn('Error using frontend API:', frontendError.message);
      console.warn('Falling back to direct backend call');
    }
    
    // Fallback to direct backend call
    let url = `${BE_URL}/api/userlogins/all?appId=${appId}&page=${page}&limit=${limit}`;
    if (active !== undefined) {
      url += `&active=${active}`;
    }
    // Add timestamp for cache busting if needed
    if (timestamp) {
      url += `&_=${timestamp}`;
    }
    
    console.log('Fetching users directly from backend:', url);
    const response = await axios.get(url);
    
    // Check if the response has the new format with pagination
    if (response.data && response.data.users) {
      const { users, pagination } = response.data;
      console.log(`Backend API returned ${users.length} users (page ${pagination.page}/${pagination.pages} of ${pagination.total} total)`);
      
      // Augment users array with pagination info for apps that rely on it
      users.pagination = pagination;
      return users;
    } else {
      // Legacy format
      console.log(`Backend API returned ${response.data.length} users (legacy format)`);
      return response.data;
    }
  },
  
  getUserById: async (firebaseUserId, appId = '1') => {
    const response = await apiClient.get(`/api/userlogins/firebase/${firebaseUserId}?appId=${appId}`);
    return response.data;
  },
  
  updateUser: async (userData) => {
    try {
      const { firebaseUserId, appId = '1', ...data } = userData;
      
      // Log what we're sending for debugging
      console.log('Sending update to backend:', {
        firebaseUserId,
        appId,
        ...data
      });
      
      // First try using direct API implementation - PUT to /userlogins/firebase/{id} instead
      try {
        const response = await apiClient.put(`/api/userlogins/firebase/${firebaseUserId}`, {
          appId,
          ...data
        });
        console.log('Update successful through firebase ID endpoint');
        return response.data;
      } catch (directError) {
        console.warn('First update approach failed:', directError.message);
        // If this fails, try the updateUserInfo endpoint
        
        const response = await apiClient.put('/api/userlogins/updateUserInfo', {
          firebaseUserId,
          appId,
          ...data
        });
        return response.data;
      }
    } catch (error) {
      console.error('All update approaches failed:', error);
      if (error.response && error.response.data) {
        console.error('Backend error details:', error.response.data);
      }
      throw error;
    }
  },
  
  updateUserRoles: async (firebaseUserId, roleIds, appId = '1') => {
    const response = await apiClient.put(`/api/userlogins/${firebaseUserId}/roles`, {
      roleIds,
      appId
    });
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await apiClient.post('/api/userlogins', userData);
    return response.data;
  },
  
  deleteUser: async (userId, appId = '1') => {
    try {
      console.log(`Deleting user ${userId} with appId ${appId}...`);
      
      // First attempt the direct database access via our debug endpoint
      const directResponse = await apiClient.delete(`/api/debug?userId=${userId}&appId=${appId}`);
      return directResponse.data;
    } catch (directError) {
      console.error('Direct database deletion failed:', directError.message);
      
      // Try the backend API route
      try {
        const response = await apiClient.delete(`/api/userlogins/${userId}?appId=${appId}`);
        return response.data;
      } catch (firstError) {
        console.error('First API deletion attempt failed:', firstError.message);
        
        // Try alternative endpoint
        try {
          const alternativeResponse = await apiClient.delete(`/api/users/${userId}?appId=${appId}`);
          return alternativeResponse.data;
        } catch (secondError) {
          console.error('All deletion attempts failed');
          throw new Error(`Failed to delete user: ${directError.message}`);
        }
      }
    }
  },
  
  deleteAllTempUsers: async (appId = '1') => {
    try {
      console.log(`Attempting to delete all temporary users for appId ${appId}...`);
      
      // Use the direct MongoDB access through our debug endpoint
      const response = await apiClient.post('/api/debug', {
        action: 'deleteAllTempUsers',
        appId
      });
      
      console.log('Delete all temp users response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to delete all temporary users:', error);
      throw error;
    }
  }
};

// Roles API
export const rolesApi = {
  getRoles: async (appId = '1') => {
    try {
      const response = await apiClient.get(`/api/roles?appId=${appId}`);
      return response.data;
    } catch (error) {
      console.warn('Error fetching roles from backend:', error.message);
      
      // Fallback - return hardcoded default roles
      return [
        {
          _id: "66cb85ac74dca51e34e268ed",
          roleName: "RegionalOrganizer",
          description: "Can create and manage events for their region",
          appId: appId
        },
        {
          _id: "66cb85ac74dca51e34e268ec",
          roleName: "SystemAdmin",
          description: "Has full access to all system features",
          appId: appId
        },
        {
          _id: "66cb85ac74dca51e34e268ee",
          roleName: "RegionalAdmin",
          description: "Can administer settings for their region",
          appId: appId
        },
        {
          _id: "66cb85ac74dca51e34e268ef",
          roleName: "User",
          description: "Standard user account",
          appId: appId
        }
      ];
    }
  }
};

// Organizers API
export const organizersApi = {
  getOrganizers: async (appId = '1', active, approved, page = 1, limit = 100) => {
    try {
      // Build simple query with required filter params
      let queryParams = new URLSearchParams({
        appId: appId,
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add a filter to satisfy the backend requirement
      queryParams.append('isActive', active !== undefined ? active : 'true');
      
      if (approved !== undefined) {
        queryParams.append('isApproved', approved);
      }
      
      // Use the regular endpoint with the required filters
      const response = await apiClient.get(`/api/organizers?${queryParams.toString()}`);
      
      // Handle the new response format which includes pagination
      if (response.data && response.data.organizers) {
        const { organizers, pagination } = response.data;
        console.log(`Fetched organizers successfully: ${organizers.length} (page ${pagination.page}/${pagination.pages}, total: ${pagination.total})`);
        return organizers;
      } else {
        // Legacy format - just return the data directly
        console.log('Fetched organizers successfully (legacy format):', response.data.length);
        return response.data;
      }
    } catch (error) {
      console.error('Error in getOrganizers:', error);
      // Return empty array to prevent UI errors
      return [];
    }
  },
  
  getOrganizerById: async (id, appId = '1') => {
    const response = await apiClient.get(`/api/organizers/${id}?appId=${appId}`);
    return response.data;
  },
  
  createOrganizer: async (organizerData) => {
    const response = await apiClient.post('/api/organizers', organizerData);
    return response.data;
  },
  
  updateOrganizer: async (id, organizerData) => {
    // Include appId as a query parameter
    const appId = organizerData.appId || '1';
    const response = await apiClient.patch(`/api/organizers/${id}?appId=${appId}`, organizerData);
    return response.data;
  },
  
  // Helper function to check if a Firebase ID is already in use by another organizer
  checkFirebaseIdUsage: async (firebaseUserId, currentOrganizerId, appId = '1') => {
    try {
      // Get all organizers (this should be a small list)
      const response = await apiClient.get(`/api/organizers?appId=${appId}&isActive=true`);
      const organizers = response.data || [];
      
      // Find any organizer with this Firebase ID that is NOT the current one
      const existingOrganizer = organizers.find(org => 
        org.firebaseUserId === firebaseUserId && 
        org._id !== currentOrganizerId
      );
      
      if (existingOrganizer) {
        return {
          inUse: true,
          organizer: existingOrganizer
        };
      }
      
      return { inUse: false };
    } catch (error) {
      console.warn('Error checking Firebase ID usage:', error);
      // Default to allowing connection if we can't check
      return { inUse: false, error: error.message };
    }
  },
  
  connectToUser: async (id, firebaseUserId, appId = '1') => {
    console.log(`Connecting organizer ${id} to user ${firebaseUserId} with appId ${appId}`);
    
    // First, check if the Firebase ID is already in use
    const usageCheck = await organizersApi.checkFirebaseIdUsage(firebaseUserId, id, appId);
    if (usageCheck.inUse) {
      const msg = `Cannot connect: Firebase ID ${firebaseUserId} is already used by organizer "${usageCheck.organizer.fullName || usageCheck.organizer.name}" (ID: ${usageCheck.organizer._id})`;
      console.error(msg);
      throw new Error(msg);
    }
    
    // Try approach #1: Direct database connection using our custom API
    try {
      console.log('Attempting connection via direct database operation...');
      
      const directResponse = await fetch(`/api/organizers/${id}/connect-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUserId,
          appId
        }),
      });
      
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('Connection successful via direct database operation');
        return data;
      } else {
        console.warn('Direct database connection failed:', await directResponse.text());
        // Continue to next approach
      }
    } catch (directError) {
      console.error('Error with direct database connection:', directError);
      // Continue to next approach
    }
    
    // Try approach #2: First clear any existing user connections, then update
    try {
      console.log('Attempting to clear existing connections first...');
      
      // 1. First, fetch the organizer
      const organizerResponse = await apiClient.get(`/api/organizers/${id}?appId=${appId}`);
      const organizer = organizerResponse.data;
      
      // 2. Clear the existing firebase ID if there is one
      if (organizer.firebaseUserId) {
        console.log(`Clearing existing Firebase ID ${organizer.firebaseUserId} from organizer ${id}`);
        
        // Clear the Firebase ID
        const clearResponse = await apiClient.patch(`/api/organizers/${id}`, {
          firebaseUserId: null,
          linkedUserLogin: null,
          appId: appId
        });
        
        console.log('Successfully cleared existing connection');
      }
      
      // 3. Now add the new connection
      console.log(`Adding new Firebase ID ${firebaseUserId} to organizer ${id}`);
      
      // Make a simple update request
      const updateResponse = await apiClient.patch(`/api/organizers/${id}`, {
        firebaseUserId: firebaseUserId,
        appId: appId
      });
      
      console.log('Successfully updated organizer via two-phase PATCH');
      
      // Now, try to update the user separately
      try {
        // Create route to find user by Firebase ID
        const userRoute = `/api/userlogins/firebase/${firebaseUserId}?appId=${appId}`;
        const userResponse = await apiClient.get(userRoute);
        
        if (userResponse.data) {
          const user = userResponse.data;
          
          // Update the user to include the organizer reference
          await apiClient.put(`/api/userlogins/updateUserInfo`, {
            firebaseUserId: firebaseUserId,
            appId: appId,
            regionalOrganizerInfo: {
              ...user.regionalOrganizerInfo,
              organizerId: id,
              isApproved: true,
              isEnabled: true,
              isActive: true,
              organizerCommunicationSettingsAdmin: {
                messagePrimaryMethod: "app"
              }
            }
          });
          
          console.log('Successfully updated user with organizer reference');
          
          // Add RegionalOrganizer role if not present
          const rolesResponse = await apiClient.get(`/api/roles?appId=${appId}`);
          const roles = rolesResponse.data;
          const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
          
          if (organizerRole) {
            // Ensure roleIds is an array and convert objects to IDs
            const userRoleIds = [...(user.roleIds || [])].map(role => 
              typeof role === 'object' ? role._id : role
            );
            
            // Check if role needs to be added
            if (!userRoleIds.includes(organizerRole._id)) {
              userRoleIds.push(organizerRole._id);
              await apiClient.put(`/api/userlogins/${firebaseUserId}/roles`, {
                roleIds: userRoleIds,
                appId
              });
              console.log('Added RegionalOrganizer role to user');
            }
          }
        }
      } catch (userError) {
        console.warn('Could not update user, but organizer was updated:', userError.message);
      }
      
      return {
        success: true,
        message: 'Connected user to organizer via two-phase update',
        organizer: updateResponse.data
      };
    } catch (updateError) {
      console.error('Error with two-phase update approach:', updateError);
      // Continue to fallback approach
    }
    
    // Last resort: Try our direct database endpoint
    try {
      console.log('Attempting direct database connection via debug endpoint...');
      
      // Use the debug endpoint
      const debugResponse = await fetch(`/api/debug/connect-user-to-organizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUserId,
          organizerId: id,
          appId,
          clearExisting: true
        }),
      });
      
      if (!debugResponse.ok) {
        throw new Error(`Failed to connect via debug endpoint: ${await debugResponse.text()}`);
      }
      
      const result = await debugResponse.json();
      console.log('Successfully connected via debug endpoint');
      
      return {
        success: true,
        message: 'Connected user to organizer via direct database access',
        data: result
      };
    } catch (fallbackError) {
      console.error('All connection approaches failed:', fallbackError);
      throw new Error(`Failed to connect user to organizer: ${fallbackError.message}`);
    }
  },
  
  disconnectUser: async (id, appId = '1') => {
    console.log(`Disconnecting user from organizer ${id} with appId ${appId}`);
    
    // Try approach #1: Use the dedicated disconnect-user endpoint
    try {
      console.log('Attempting disconnection via dedicated endpoint...');
      
      const directResponse = await fetch(`/api/organizers/${id}/disconnect-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId
        }),
      });
      
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('Disconnection successful via direct database operation');
        return data;
      } else {
        console.warn('Direct disconnection failed:', await directResponse.text());
        // Continue to fallback approach
      }
    } catch (directError) {
      console.error('Error with direct disconnection:', directError);
      // Continue to fallback approach
    }
    
    // Fallback: Update organizer record directly
    try {
      console.log('Falling back to direct update...');
      
      // Update organizer to remove user connection
      const updateResponse = await apiClient.patch(`/api/organizers/${id}`, {
        firebaseUserId: null,
        linkedUserLogin: null,
        appId: appId
      });
      
      console.log('Successfully disconnected user from organizer via direct update');
      
      return {
        success: true,
        message: 'Disconnected user from organizer via direct update',
        organizer: updateResponse.data
      };
    } catch (updateError) {
      console.error('All disconnection approaches failed:', updateError);
      throw new Error(`Failed to disconnect user from organizer: ${updateError.message}`);
    }
  }
};

// Debug API
export const debugApi = {
  checkBackend: async () => {
    try {
      const response = await apiClient.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default {
  users: usersApi,
  roles: rolesApi,
  organizers: organizersApi,
  debug: debugApi
};