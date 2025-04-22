'use client';

import { useCallback } from 'react';
import { useOrganizerContext } from '../context/OrganizerContext';

/**
 * Custom hook for filtering and searching organizers
 * 
 * @returns {Object} Organizer filtering utilities
 */
export default function useOrganizerFilters() {
  const { organizers, tabValue, searchTerm, dispatch } = useOrganizerContext();
  
  /**
   * Sets the active tab value
   * 
   * @param {number} value - Tab index value
   */
  const setTabValue = useCallback((value) => {
    dispatch({ type: 'SET_TAB_VALUE', payload: value });
    filterOrganizers(value, searchTerm);
  }, [dispatch, searchTerm]);
  
  /**
   * Sets the search term
   * 
   * @param {string} term - Search term
   */
  const setSearchTerm = useCallback((term) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
    filterOrganizers(tabValue, term);
  }, [dispatch, tabValue]);
  
  /**
   * Filters organizers based on search term
   * 
   * @param {string} term - Search term
   */
  const filterOrganizers = useCallback((tabVal, term) => {
    if (!term) {
      dispatch({ type: 'SET_FILTERED_ORGANIZERS', payload: organizers });
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = organizers.filter(organizer =>
      (organizer.displayName.toLowerCase().includes(lowerTerm)) ||
      (organizer.shortDisplayName.toLowerCase().includes(lowerTerm))
    );
    
    dispatch({ type: 'SET_FILTERED_ORGANIZERS', payload: filtered });
  }, [organizers, dispatch]);
  
  return {
    filterOrganizers,
    setTabValue,
    setSearchTerm,
  };
}