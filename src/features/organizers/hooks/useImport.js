'use client';

import { useCallback } from 'react';
import { useOrganizerContext } from '../context/OrganizerContext';
import { organizersApi } from '@/lib/api-client';
import axios from 'axios';

/**
 * Custom hook for BTC organizer import functionality
 * 
 * @param {string} appId - Application ID
 * @returns {Object} Import utilities
 */
export default function useImport(appId) {
  const { 
    dispatch, 
    selectedOrganizers, 
    importedOrganizers 
  } = useOrganizerContext();
  
  /**
   * Opens the import dialog
   */
  const openImportDialog = useCallback(() => {
    dispatch({ type: 'SET_IMPORT_DIALOG_OPEN', payload: true });
  }, [dispatch]);
  
  /**
   * Closes the import dialog
   */
  const closeImportDialog = useCallback(() => {
    dispatch({ type: 'SET_IMPORT_DIALOG_OPEN', payload: false });
  }, [dispatch]);
  
  /**
   * Transforms BTC organizer data to our format
   * 
   * @param {Object} organizer - BTC organizer data
   * @param {Array} existingOrganizers - Existing organizers in the system
   * @returns {Object} Transformed organizer data
   */
  const transformOrganizerFromBTC = useCallback((organizer, existingOrganizers) => {
    // Check if the organizer object is valid
    if (!organizer || typeof organizer !== 'object') {
      console.error('Invalid organizer data:', organizer);
      return null;
    }
    
    // Determine if this organizer already exists in our system (check by fullName field)
    const isDuplicate = existingOrganizers.some(existingOrganizer => 
      existingOrganizer.fullName?.toLowerCase() === organizer.organizer?.toLowerCase()
    );
    
    // Format shortName from organizer name (slug)
    let shortName = '';
    try {
      shortName = organizer.slug ? 
        organizer.slug.replace(/\s+/g, '').replace(/-/g, '').toUpperCase().substring(0, 10) : 
        organizer.organizer ? organizer.organizer.replace(/\s+/g, '').toUpperCase().substring(0, 10) : '';
    } catch (err) {
      console.error('Error formatting shortName:', err);
      shortName = organizer.id?.toString().substring(0, 10) || 'UNKNOWN';
    }
    
    // Create an organizer object in our application's format
    return {
      id: organizer.id,
      originalId: organizer.id,
      fullName: organizer.organizer || '',
      name: organizer.organizer || '',
      shortName: shortName,
      description: organizer.description || '',
      btcNiceName: organizer.id?.toString() || '',
      // Contact info
      publicContactInfo: {
        phone: organizer.phone || '',
        email: organizer.email || '',
        url: organizer.website || '',
      },
      // Other attributes
      appId: appId,
      isActive: true,
      isEnabled: true,
      isRendered: true,
      wantRender: true,
      isActiveAsOrganizer: false,
      // Organizer types
      organizerTypes: {
        isEventOrganizer: true,
        isTeacher: false,
        isDJ: false,
        isOrchestra: false
      },
      // Images
      images: organizer.image && organizer.image.url ? {
        originalUrl: organizer.image.url
      } : {},
      // Set updated date
      updatedAt: new Date().toISOString(),
      isDuplicate, // Flag to indicate if this organizer already exists
      // Original WordPress data for reference
      original: organizer
    };
  }, []);
  
  /**
   * Fetches organizers from BTC
   */
  const fetchBTCOrganizers = useCallback(async () => {
    try {
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'loading' });
      dispatch({ type: 'SET_FETCHING_BTC_ORGANIZERS', payload: true });
      dispatch({ type: 'SET_IMPORTED_ORGANIZERS', payload: [] });
      dispatch({ type: 'SET_SELECTED_ORGANIZERS', payload: {} });
      
      // Get all existing organizers for comparison
      const existingOrganizersResponse = await organizersApi.getOrganizers(appId);
      
      const existingOrganizers = existingOrganizersResponse || [];
      console.log(`Found ${existingOrganizers.length} existing organizers for comparison`);
      
      // Fetch all pages from BTC WordPress API using pagination
      let allOrganizers = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        console.log(`Fetching BTC organizers page ${currentPage}...`);
        const response = await axios.get(`https://bostontangocalendar.com/wp-json/tribe/events/v1/organizers`, {
          params: {
            page: currentPage
          }
        });
        
        // Get total pages from headers or response
        if (currentPage === 1) {
          // Try to get from X-WP-TotalPages header
          const totalPagesHeader = response.headers['x-wp-totalpages'] || response.headers['X-WP-TotalPages'];
          if (totalPagesHeader) {
            totalPages = parseInt(totalPagesHeader, 10);
          } else if (response.data && response.data.total_pages) {
            // Fallback to response data
            totalPages = response.data.total_pages;
          }
          console.log(`Total pages of organizers: ${totalPages}`);
        }
        
        if (response.data && response.data.organizers) {
          allOrganizers = [...allOrganizers, ...response.data.organizers];
          console.log(`Fetched ${response.data.organizers.length} organizers from page ${currentPage}`);
        } else {
          throw new Error(`Invalid response format from BTC API on page ${currentPage}`);
        }
        
        currentPage++;
      } while (currentPage <= totalPages);
      
      console.log(`Fetched a total of ${allOrganizers.length} organizers from BTC API`);
      
      // Transform the WordPress organizer format to our application format
      const transformedOrganizers = allOrganizers
        .map(organizer => transformOrganizerFromBTC(organizer, existingOrganizers))
        .filter(Boolean); // Remove any null entries
      
      // Initialize organizers as selected by default (except duplicates)
      const initialSelected = {};
      transformedOrganizers.forEach(organizer => {
        initialSelected[organizer.id] = !organizer.isDuplicate; // Only select non-duplicates by default
      });
      
      dispatch({ type: 'SET_IMPORTED_ORGANIZERS', payload: transformedOrganizers });
      dispatch({ type: 'SET_SELECTED_ORGANIZERS', payload: initialSelected });
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'ready' });
    } catch (error) {
      console.error('Error fetching BTC organizers:', error);
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'SET_FETCHING_BTC_ORGANIZERS', payload: false });
    }
  }, [appId, transformOrganizerFromBTC, dispatch]);
  
  /**
   * Selects or deselects all organizers
   * 
   * @param {boolean} selected - Whether to select all
   */
  const selectAllOrganizers = useCallback((selected) => {
    const newSelected = {};
    
    importedOrganizers.forEach(organizer => {
      newSelected[organizer.id] = selected;
    });
    
    dispatch({ type: 'SET_SELECTED_ORGANIZERS', payload: newSelected });
  }, [importedOrganizers, dispatch]);
  
  /**
   * Selects or deselects a single organizer
   * 
   * @param {string} id - Organizer ID
   * @param {boolean} selected - Whether to select
   */
  const selectOrganizer = useCallback((id, selected) => {
    dispatch({
      type: 'SET_SELECTED_ORGANIZERS',
      payload: {
        ...selectedOrganizers,
        [id]: selected
      }
    });
  }, [selectedOrganizers, dispatch]);
  
  /**
   * Selects only new organizers (excludes duplicates)
   */
  const selectNewOnly = useCallback(() => {
    const newSelected = {};
    importedOrganizers.forEach(organizer => {
      newSelected[organizer.id] = !organizer.isDuplicate;
    });
    dispatch({ type: 'SET_SELECTED_ORGANIZERS', payload: newSelected });
  }, [importedOrganizers, dispatch]);
  
  /**
   * Processes the import of selected organizers
   */
  const processImport = useCallback(async () => {
    try {
      // Get only the selected organizers
      const organizersToImport = importedOrganizers.filter(
        organizer => selectedOrganizers[organizer.id]
      );
      
      if (organizersToImport.length === 0) {
        throw new Error('No organizers selected for import');
      }
      
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'importing' });
      dispatch({ type: 'SET_IMPORT_PROGRESS', payload: 0 });
      dispatch({ 
        type: 'SET_IMPORT_RESULTS', 
        payload: { success: 0, error: 0, skipped: 0 } 
      });
      
      // Process organizers one by one
      for (let i = 0; i < organizersToImport.length; i++) {
        const organizer = organizersToImport[i];
        
        try {
          // If the organizer is already in the system and the user selected it anyway,
          // we'll skip it and record it separately
          if (organizer.isDuplicate) {
            console.log(`Skipping duplicate organizer: ${organizer.fullName}`);
            
            dispatch({ 
              type: 'UPDATE_IMPORT_RESULTS', 
              payload: { key: 'skipped' } 
            });
          } else {
            // Save to the database - use the test-create endpoint for reliable organizer creation
            await axios.post('/api/organizers/test-create', {
              ...organizer,
              appId: appId
            });
            
            dispatch({ 
              type: 'UPDATE_IMPORT_RESULTS', 
              payload: { key: 'success' } 
            });
          }
        } catch (error) {
          console.error(`Error importing organizer ${organizer.fullName}:`, error);
          dispatch({ 
            type: 'UPDATE_IMPORT_RESULTS', 
            payload: { key: 'error' } 
          });
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / organizersToImport.length) * 100);
        dispatch({ type: 'SET_IMPORT_PROGRESS', payload: progress });
      }
      
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'complete' });
    } catch (error) {
      console.error('Error during import process:', error);
      dispatch({ type: 'SET_IMPORT_STATUS', payload: 'error' });
      throw error;
    }
  }, [appId, importedOrganizers, selectedOrganizers, dispatch]);
  
  return {
    openImportDialog,
    closeImportDialog,
    fetchBTCOrganizers,
    selectAllOrganizers,
    selectOrganizer,
    selectNewOnly,
    processImport,
  };
}