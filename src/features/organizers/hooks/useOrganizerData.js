'use client';

import { useCallback } from 'react';
import { organizersApi, usersApi } from '@/lib/api-client';
import { useOrganizerContext } from '../context/OrganizerContext';
import axios from 'axios';

/**
 * Custom hook for organizer data operations
 * 
 * @param {string} appId - Application ID
 * @returns {Object} Organizer data operations
 */
export default function useOrganizerData(appId) {
  const { dispatch } = useOrganizerContext();
  
  /**
   * Processes raw organizer data
   * 
   * @param {Array} organizersData - Raw organizer data
   * @returns {Array} Processed organizer data
   */
  const processOrganizers = useCallback((organizersData) => {
    return organizersData.map(organizer => ({
      ...organizer,
      id: organizer._id, // For DataGrid key
      displayName: organizer.fullName || organizer.name || 'Unnamed Organizer',
      shortDisplayName: organizer.shortName || 'No short name',
      status: organizer.isActive ? 'Active' : 'Inactive',
      enabled: organizer.isEnabled ? 'Yes' : 'No',
      wantRender: organizer.wantRender ? 'Yes' : 'No',
      userConnected: organizer.firebaseUserId ? 'Yes' : 'No',
    }));
  }, []);
  
  /**
   * Fetches organizers from the API
   * 
   * @param {boolean} isActive - Filter by active status (optional)
   * @returns {Promise<Array>} Processed organizer data
   */
  const fetchOrganizers = useCallback(async (isActive) => {
    try {
      dispatch({ type: 'FETCH_ORGANIZERS_START' });
      
      // Use organizersApi to fetch data
      let organizersData;
      if (isActive === undefined) {
        // Fetch all organizers
        organizersData = await organizersApi.getOrganizers(appId);
      } else {
        // Fetch based on active status
        organizersData = await organizersApi.getOrganizers(appId, isActive);
      }
      
      // Process organizers data
      const processedOrganizers = processOrganizers(organizersData);
      
      // Update state
      dispatch({ type: 'FETCH_ORGANIZERS_SUCCESS', payload: processedOrganizers });
      
      return processedOrganizers;
    } catch (error) {
      console.error('Error fetching organizers:', error);
      dispatch({ type: 'FETCH_ORGANIZERS_ERROR', payload: error.message });
      throw error;
    }
  }, [appId, dispatch, processOrganizers]);
  
  /**
   * Refreshes the organizers list
   * 
   * @returns {Promise<Array>} Refreshed organizer data
   */
  const refreshOrganizers = useCallback(async () => {
    try {
      // Fetch organizers with a cache-busting parameter
      const timestamp = new Date().getTime();
      console.log(`Refreshing organizers at ${timestamp}...`);
      
      // Use direct API call to bypass caching
      const response = await axios.get(`/api/organizers?appId=${appId}&_=${timestamp}`);
      const organizersData = response.data;
      
      // Process organizers data
      const processedOrganizers = processOrganizers(organizersData);
      
      console.log(`Refreshed ${processedOrganizers.length} organizers`);
      
      // Update state
      dispatch({ type: 'FETCH_ORGANIZERS_SUCCESS', payload: processedOrganizers });
      
      return processedOrganizers;
    } catch (error) {
      console.error('Error refreshing organizers:', error);
      dispatch({ type: 'FETCH_ORGANIZERS_ERROR', payload: error.message });
      throw error;
    }
  }, [appId, dispatch, processOrganizers]);
  
  /**
   * Updates an organizer
   * 
   * @param {Object} organizerData - Organizer data to update
   * @returns {Promise<Object>} Updated organizer
   */
  const updateOrganizer = useCallback(async (organizerData) => {
    try {
      // Make sure required fields are set
      const organizerWithAppId = {
        ...organizerData,
        appId: organizerData.appId || appId,
        // Ensure both name fields are set consistently
        name: organizerData.name,
        fullName: organizerData.name,
        shortName: organizerData.shortName || organizerData.name,
        // Explicitly convert boolean fields with ternary to ensure true/false values
        wantRender: organizerData.wantRender === true ? true : false,
        isActive: organizerData.isActive === true ? true : false,
        isEnabled: organizerData.isEnabled === true ? true : false
      };
      
      // Remove isApproved as it's no longer used
      delete organizerWithAppId.isApproved;
      
      // Update via API
      try {
        await axios.patch(
          `/api/organizers/${organizerWithAppId._id}?appId=${organizerWithAppId.appId}`, 
          organizerWithAppId
        );
      } catch (error) {
        console.error('Direct PATCH failed:', error);
        
        // Try fallback to direct backend API
        await axios.put(
          `${process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010'}/api/organizers/${organizerWithAppId._id}?appId=${organizerWithAppId.appId}`,
          organizerWithAppId
        );
      }
      
      // Refresh organizers
      await refreshOrganizers();
      
      return organizerWithAppId;
    } catch (error) {
      console.error('Error updating organizer:', error);
      throw error;
    }
  }, [appId, refreshOrganizers]);
  
  /**
   * Creates a new organizer
   * 
   * @param {Object} organizerData - Organizer data to create
   * @returns {Promise<Object>} Created organizer
   */
  const createOrganizer = useCallback(async (organizerData) => {
    try {
      // Use the test-create endpoint for more reliable organizer creation
      const response = await axios.post('/api/organizers/test-create', {
        ...organizerData,
        appId: appId
      });
      
      // Refresh organizers
      await refreshOrganizers();
      
      return response.data;
    } catch (error) {
      console.error('Error creating organizer:', error);
      throw error;
    }
  }, [appId, refreshOrganizers]);
  
  /**
   * Deletes an organizer
   * 
   * @param {Object} organizer - Organizer to delete
   * @returns {Promise<void>}
   */
  const deleteOrganizer = useCallback(async (organizer) => {
    try {
      // First, check if this organizer is connected to a user
      if (organizer.firebaseUserId) {
        // Find which user is connected to this organizer
        const users = await usersApi.getUsers(appId);
        const connectedUser = users.find(user => 
          user.regionalOrganizerInfo?.organizerId === organizer._id ||
          (typeof user.regionalOrganizerInfo?.organizerId === 'object' && 
            user.regionalOrganizerInfo?.organizerId._id === organizer._id)
        );
        
        if (connectedUser) {
          // First try the disconnect API endpoint
          try {
            await axios.patch(`/api/organizers/${organizer._id}/disconnect-user`, {
              appId: appId
            });
          } catch (disconnectError) {
            console.error('Error using the disconnect API:', disconnectError);
            
            // Fallback: Update user directly to remove organizer connection
            const userUpdateData = {
              firebaseUserId: connectedUser.firebaseUserId,
              appId: connectedUser.appId || appId,
              regionalOrganizerInfo: {
                ...connectedUser.regionalOrganizerInfo,
                organizerId: null,
                isEnabled: false,
                isActive: false,
                wantRender: false
              }
            };
            
            // Update user to remove organizer connection
            await usersApi.updateUser(userUpdateData);
          }
        }
      }
      
      // Delete the organizer using the API
      await axios.delete(`/api/organizers/${organizer._id}?appId=${appId}`);
      
      // Force a delay before refreshing to allow server-side propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the organizers list
      await refreshOrganizers();
    } catch (error) {
      console.error('Error deleting organizer:', error);
      throw error;
    }
  }, [appId, refreshOrganizers]);
  
  /**
   * Connects a user to an organizer
   * 
   * @param {string} organizerId - Organizer ID
   * @param {string} firebaseUserId - Firebase user ID
   * @returns {Promise<Object>} Connection result
   */
  const connectUserToOrganizer = useCallback(async (organizerId, firebaseUserId) => {
    try {
      const response = await axios.patch(`/api/organizers/${organizerId}/connect-user`, {
        firebaseUserId,
        appId: appId
      });
      
      // Refresh organizers
      await refreshOrganizers();
      
      return response.data;
    } catch (error) {
      console.error('Error connecting user to organizer:', error);
      throw error;
    }
  }, [appId, refreshOrganizers]);
  
  /**
   * Disconnects a user from an organizer
   * 
   * @param {string} organizerId - Organizer ID
   * @returns {Promise<Object>} Disconnection result
   */
  const disconnectUserFromOrganizer = useCallback(async (organizerId) => {
    try {
      const response = await axios.patch(`/api/organizers/${organizerId}/disconnect-user`, {
        appId: appId
      });
      
      // Refresh organizers
      await refreshOrganizers();
      
      return response.data;
    } catch (error) {
      console.error('Error disconnecting user from organizer:', error);
      throw error;
    }
  }, [appId, refreshOrganizers]);
  
  return {
    fetchOrganizers,
    refreshOrganizers,
    updateOrganizer,
    createOrganizer,
    deleteOrganizer,
    connectUserToOrganizer,
    disconnectUserFromOrganizer,
  };
}