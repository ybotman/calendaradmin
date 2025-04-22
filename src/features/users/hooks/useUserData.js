'use client';

import { useCallback } from 'react';
import { usersApi, rolesApi } from '@/lib/api-client';
import { useUserContext } from '../context/UserContext';

/**
 * Custom hook for handling user data operations
 * 
 * @param {string} appId - Application ID
 * @returns {Object} User data operations
 */
export default function useUserData(appId) {
  const { dispatch } = useUserContext();
  
  /**
   * Helper function to process raw user data
   * 
   * @param {Array} usersData - Raw user data from API
   * @param {Object} roles - Roles data for role name mapping
   * @returns {Array} Processed user data
   */
  const processUsersData = useCallback((usersData, roles) => {
    return usersData.map(user => {
      try {
        const userId = user._id || 'unknown';
        const isOrganizerRecord = user._isOrganizer === true;
        
        // Handle active/inactive status
        const isActiveValue = user.active !== undefined 
          ? user.active 
          : user.isActive !== undefined
            ? user.isActive
            : user.localUserInfo?.isActive !== undefined
              ? user.localUserInfo.isActive
              : user.isActiveAsOrganizer !== undefined
                ? user.isActiveAsOrganizer
                : false;
              
        // Use Firebase display name if available
        const displayName = user.firebaseUserInfo?.displayName || 
          user.fullName || 
          `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 
          user.shortName || 
          user.loginId || 
          '';

        // Use Firebase email if available
        const email = user.firebaseUserInfo?.email || 
          user.publicEmail || 
          user.loginId ? `${user.loginId}@example.com` : 
          '';
          
        // Handle role name codes
        let roleNameCodes = '';
        if (isOrganizerRecord) {
          roleNameCodes = 'RO'; // Organizer role code
        } else {
          // Get all role IDs from the user
          const roleIds = (user.roleIds || []).map(role => 
            typeof role === 'object' ? role._id : role
          );
          
          // Convert roleIds to roleNameCodes
          if (roleIds.length === 0) {
            roleNameCodes = ''; // Empty string if no roles
          } else {
            const roleCodes = roleIds.map(roleId => {
              const code = getRoleCodeForId(roleId, roles);
              return code || '?'; // Use ? for any unrecognized role IDs
            });
            roleNameCodes = roleCodes.join(', ');
          }
        }
        
        // For organizer records, create a regionalOrganizerInfo
        let regionalOrganizerInfo = user.regionalOrganizerInfo || {};
        if (isOrganizerRecord) {
          regionalOrganizerInfo = {
            organizerId: user._id,
            isApproved: user.isEnabled !== false,
            isEnabled: user.isEnabled !== false,
            isActive: user.isActive !== false
          };
        }
        
        // Determine if user has organizer profile
        const hasOrganizerProfile = !!(user.regionalOrganizerInfo && user.regionalOrganizerInfo.organizerId);
        
        return {
          ...user, // Keep all original fields
          id: userId, // For DataGrid key
          displayName,
          email,
          roleNameCodes,
          loginUserName: user.localUserInfo?.loginUserName || '',
          isActive: isActiveValue ? 'Active' : 'Inactive',
          firebaseUserId: user.firebaseUserId || '',
          localUserInfo: user.localUserInfo || {},
          regionalOrganizerInfo: user.regionalOrganizerInfo || {},
          localAdminInfo: user.localAdminInfo || {},
          isRealUser: !!user.firebaseUserId && !user.firebaseUserId.startsWith('temp_'),
          isOrganizer: hasOrganizerProfile,
          source: 'userLogins'
        };
      } catch (err) {
        console.error('Error processing user:', err, user);
        
        // Return a minimal valid user object to prevent UI crashes
        return {
          id: user._id || Math.random().toString(36),
          displayName: '',
          email: '',
          isActive: '',
          firebaseUserId: '',
          localUserInfo: {},
          regionalOrganizerInfo: {},
          localAdminInfo: {},
          isRealUser: false,
          isOrganizer: false,
          source: 'error'
        };
      }
    });
  }, []);
  
  /**
   * Helper function to get role code for a role ID
   * 
   * @param {string} roleId - Role ID
   * @param {Object} roles - Roles data
   * @returns {string} Role code or empty string
   */
  const getRoleCodeForId = useCallback((roleId, roles) => {
    try {
      if (!roles?.roles || !Array.isArray(roles.roles) || roles.roles.length === 0) {
        return '';
      }
      
      // Convert roleId to string for safer comparison
      const roleIdStr = roleId?.toString();
      
      // Find role by comparing string versions of IDs
      const role = roles.roles.find(r => 
        r._id?.toString() === roleIdStr || 
        r.id?.toString() === roleIdStr
      );
      
      return role?.roleNameCode || '?';
    } catch (error) {
      console.error('Error in getRoleCodeForId:', error);
      return '?';
    }
  }, []);
  
  /**
   * Fetches roles from the API
   * 
   * @returns {Promise<Object>} Roles data
   */
  const fetchRoles = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_USERS_START' });
      
      // Fetch roles
      const rolesData = await rolesApi.getRoles(appId);
      
      if (rolesData && rolesData.roles && Array.isArray(rolesData.roles)) {
        console.log("Roles array:", rolesData.roles.map(r => ({id: r._id, code: r.roleNameCode})));
        return rolesData;
      } else if (Array.isArray(rolesData)) {
        console.log("Roles array (legacy format):", rolesData.map(r => ({id: r._id, code: r.roleNameCode})));
        return { roles: rolesData };
      } else {
        console.error("Error: Roles data is not in expected format:", rolesData);
        return { roles: [] };
      }
    } catch (error) {
      console.error('Error loading roles data:', error);
      dispatch({ type: 'FETCH_USERS_ERROR', payload: error.message });
      return { roles: [] };
    }
  }, [appId, dispatch]);
  
  /**
   * Fetches users from the API
   * 
   * @returns {Promise<Array>} Processed user data
   */
  const fetchUsers = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_USERS_START' });
      
      // Add a small delay to ensure backend has time to process any updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use timestamp to force fresh data
      const timestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
      
      // First fetch roles
      const rolesData = await fetchRoles();
      
      // Then fetch users
      const BE_URL = process.env.NEXT_PUBLIC_BE_URL;
      let usersData = [];
      
      try {
        console.log('Fetching user login records...');
        const usersResponse = await fetch(`${BE_URL}/api/userlogins/all?appId=${appId}&_=${timestamp}`);
        
        if (usersResponse.ok) {
          const response = await usersResponse.json();
          
          // Handle paginated response format
          if (response && response.users) {
            usersData = response.users;
            console.log(`User login API returned ${usersData.length} user records (paginated format)`);
          } else if (Array.isArray(response)) {
            usersData = response;
            console.log(`User login API returned ${usersData.length} user records (array format)`);
          } else {
            console.warn(`User login API returned unexpected format:`, response);
            usersData = [];
          }
        } else {
          console.warn(`User login API returned status ${usersResponse.status}`);
          usersData = [];
        }
      } catch (fetchError) {
        console.error('Error fetching users:', fetchError);
        usersData = [];
      }
      
      console.log(`Received ${usersData.length} users from backend`);
      
      // Process users data
      const processedUsers = processUsersData(usersData, rolesData);
      
      // Update state
      dispatch({ 
        type: 'FETCH_USERS_SUCCESS', 
        payload: { 
          users: processedUsers,
          roles: rolesData
        } 
      });
      
      return processedUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      dispatch({ type: 'FETCH_USERS_ERROR', payload: error.message });
      throw error;
    }
  }, [appId, dispatch, fetchRoles, processUsersData]);
  
  /**
   * Updates a user
   * 
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user data
   */
  const updateUser = useCallback(async (userData) => {
    try {
      // Extract role IDs from the updatedUser object
      const roleIds = [...userData.roleIds];
      
      // First update general user information (without roleIds to prevent issues)
      const userUpdateData = {
        firebaseUserId: userData.firebaseUserId,
        appId: userData.appId || appId,
        active: userData.active,
        localUserInfo: userData.localUserInfo,
        regionalOrganizerInfo: userData.regionalOrganizerInfo,
        localAdminInfo: userData.localAdminInfo
      };
      
      // Update user basic information
      await usersApi.updateUser(userUpdateData);
      
      // Update user roles separately
      await usersApi.updateUserRoles(userData.firebaseUserId, roleIds, appId);
      
      // Refresh users list
      await fetchUsers();
      
      return userData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [appId, fetchUsers]);
  
  /**
   * Creates a new user
   * 
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user data
   */
  const createUser = useCallback(async (userData) => {
    try {
      // Create user data
      const userCreateData = {
        email: userData.email,
        password: userData.password || '',
        firstName: userData.firstName,
        lastName: userData.lastName,
        appId: appId,
        active: userData.active
      };
      
      // Make the API call
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userCreateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      const createdUser = await response.json();
      
      // If the user requested to create an organizer, do that now
      if (userData.isOrganizer && createdUser.firebaseUserId) {
        try {
          // Prepare organizer data
          const organizerData = {
            firebaseUserId: createdUser.firebaseUserId,
            linkedUserLogin: createdUser._id,
            appId: appId,
            fullName: `${userData.firstName} ${userData.lastName}`.trim(),
            shortName: userData.firstName,
            organizerRegion: "66c4d99042ec462ea22484bd", // US region default
            isActive: true,
            isEnabled: true,
            wantRender: true,
            organizerTypes: {
              isEventOrganizer: true,
              isVenue: false,
              isTeacher: false,
              isMaestro: false,
              isDJ: false,
              isOrchestra: false
            }
          };
          
          // Create the organizer
          const organizerResponse = await fetch('/api/organizers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(organizerData),
          });
          
          if (!organizerResponse.ok) {
            throw new Error('Failed to create organizer');
          }
          
          const createdOrganizer = await organizerResponse.json();
          
          // Update user to include organizerId reference
          const userUpdateData = {
            firebaseUserId: createdUser.firebaseUserId,
            appId: appId,
            regionalOrganizerInfo: {
              organizerId: createdOrganizer._id,
              isApproved: true,
              isEnabled: true,
              isActive: true
            }
          };
          
          // Update user with organizer reference
          await usersApi.updateUser(userUpdateData);
          
          // Get roles to add organizer role
          const rolesData = await fetchRoles();
          
          // Add organizer role to the user
          const organizerRole = rolesData.roles.find(role => role.roleNameCode === 'RO');
          if (organizerRole) {
            await usersApi.updateUserRoles(createdUser.firebaseUserId, [organizerRole._id], appId);
          }
        } catch (organizerError) {
          console.error("Error creating organizer for new user:", organizerError);
        }
      }
      
      // Refresh the user list
      await fetchUsers();
      
      return createdUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }, [appId, fetchRoles, fetchUsers]);
  
  /**
   * Deletes a user
   * 
   * @param {string} userId - User ID to delete
   * @returns {Promise<void>}
   */
  const deleteUser = useCallback(async (user) => {
    try {
      // Check if user is linked to an organizer
      const hasOrganizer = user.regionalOrganizerInfo?.organizerId;
      if (hasOrganizer) {
        try {
          console.log(`User has organizer connection. Updating organizer before deleting user...`);
          
          // Get the organizer ID (handling both string and object formats)
          const organizerId = typeof user.regionalOrganizerInfo.organizerId === 'object'
            ? user.regionalOrganizerInfo.organizerId._id
            : user.regionalOrganizerInfo.organizerId;
          
          // Update the organizer to remove user references
          const response = await fetch(`/api/organizers/${organizerId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebaseUserId: null,
              linkedUserLogin: null,
              appId: user.appId || appId
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to disconnect user from organizer');
          } else {
            console.log(`Successfully disconnected user from organizer ${organizerId}`);
          }
        } catch (organizerError) {
          console.error('Error disconnecting user from organizer:', organizerError);
          // Continue with user deletion even if organizer update fails
        }
      }
      
      // Delete the user
      await usersApi.deleteUser(user._id, user.appId || appId);
      
      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }, [appId, fetchUsers]);
  
  /**
   * Synchronizes users with Firebase
   * 
   * @returns {Promise<Object>} Sync results
   */
  const syncFirebaseUsers = useCallback(async () => {
    try {
      // First check Firebase status to make sure it's available
      let statusResponse;
      try {
        statusResponse = await fetch('/api/debug/firebase-status');
        const statusData = await statusResponse.json();
        
        // If Firebase is not available, show error and instructions
        if (!statusData.success) {
          const errorMessage = statusData.status || 'Firebase is not properly configured';
          const helpText = statusData.possible_causes ? 
            `\n\nPossible causes:\n- ${statusData.possible_causes.join('\n- ')}` : '';
          
          throw new Error(`${errorMessage}${helpText}`);
        }
        
        console.log('Firebase status check passed:', statusData);
      } catch (statusError) {
        console.error('Firebase status check failed:', statusError);
        throw new Error(`Unable to verify Firebase availability: ${statusError.message}`);
      }
      
      // Now call the API to import users from Firebase
      const syncResponse = await fetch('/api/debug/import-firebase-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId,
          forceInit: false // Set to true to force Firebase reinitialization if needed
        }),
      });
      
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        const errorDetails = errorData.details ? 
          `\nDetails: ${errorData.details}` : '';
        const helpText = errorData.help ? 
          `\n\nTroubleshooting: ${errorData.help}` : '';
          
        throw new Error(`${errorData.error || 'Synchronization failed'}${errorDetails}${helpText}`);
      }
      
      const syncData = await syncResponse.json();
      
      // Refresh the users list
      await fetchUsers();
      
      return syncData;
    } catch (error) {
      console.error('Error synchronizing Firebase users:', error);
      throw error;
    }
  }, [appId, fetchUsers]);
  
  return {
    fetchUsers,
    updateUser,
    createUser,
    deleteUser,
    syncFirebaseUsers,
  };
}