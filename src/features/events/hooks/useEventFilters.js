'use client';

import { useCallback, useEffect } from 'react';
import { useEventContext } from '../context/EventContext';

/**
 * Hook for managing event filtering operations
 * 
 * @returns {Object} Event filtering operations
 */
export default function useEventFilters() {
  const { 
    events, 
    searchTerm, 
    searchDescriptionTerm,
    tabValue, 
    dateRange,
    selectedGeoFilter,
    selectedOrganizerShortname,
    selectedVenue,
    selectedCategory,
    dispatch 
  } = useEventContext();

  // Set tab value
  const setTabValue = useCallback((value) => {
    dispatch({ type: 'SET_TAB_VALUE', payload: value });
  }, [dispatch]);

  // Set search term
  const setSearchTerm = useCallback((value) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: value });
  }, [dispatch]);
  
  // Set description search term
  const setSearchDescriptionTerm = useCallback((value) => {
    dispatch({ type: 'SET_SEARCH_DESCRIPTION_TERM', payload: value });
  }, [dispatch]);

  // Set date range
  const setDateRange = useCallback((range) => {
    dispatch({ type: 'SET_DATE_RANGE', payload: range });
  }, [dispatch]);

  // Set geo filter
  const setGeoFilter = useCallback((filter) => {
    dispatch({ type: 'SET_GEO_FILTER', payload: filter });
  }, [dispatch]);

  // Set organizer filter
  const setOrganizerFilter = useCallback((organizerShortname) => {
    dispatch({ type: 'SET_ORGANIZER_FILTER', payload: organizerShortname });
  }, [dispatch]);

  // Set venue filter
  const setVenueFilter = useCallback((venue) => {
    dispatch({ type: 'SET_VENUE_FILTER', payload: venue });
  }, [dispatch]);

  // Set category filter
  const setCategoryFilter = useCallback((category) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, [dispatch]);

  // Toggle image display
  const toggleImageDisplay = useCallback((imageType) => {
    dispatch({ type: 'TOGGLE_IMAGE_DISPLAY', payload: imageType });
  }, [dispatch]);

  // Apply filters
  useEffect(() => {
    if (!events.length) return;

    let filteredEvents = [...events];

    // Apply title search filter
    if (searchTerm && searchTerm.trim().length >= 3) {
      // Limit to max 15 characters, trim spaces, and convert to lowercase
      const searchLower = searchTerm.trim().toLowerCase().substring(0, 15);
      
      filteredEvents = filteredEvents.filter(event => 
        event.title?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply description search filter
    if (searchDescriptionTerm && searchDescriptionTerm.trim()) {
      const descSearchTerm = searchDescriptionTerm.trim().toLowerCase();
      
      filteredEvents = filteredEvents.filter(event => 
        event.description?.toLowerCase().includes(descSearchTerm)
      );
    }

    // Apply tab filter
    if (tabValue === 1) { // Active events
      filteredEvents = filteredEvents.filter(event => event.isActive);
    } else if (tabValue === 2) { // Inactive events
      filteredEvents = filteredEvents.filter(event => !event.isActive);
    } else if (tabValue === 3) { // Featured events
      filteredEvents = filteredEvents.filter(event => event.isFeatured);
    }

    dispatch({ type: 'SET_FILTERED_EVENTS', payload: filteredEvents });
  }, [events, searchTerm, searchDescriptionTerm, tabValue, dispatch]);

  return {
    setTabValue,
    setSearchTerm,
    setSearchDescriptionTerm,
    setDateRange,
    setGeoFilter,
    setOrganizerFilter,
    setVenueFilter,
    setCategoryFilter,
    toggleImageDisplay
  };
}