'use client';

import { useCallback } from 'react';
import { useUserContext } from '../context/UserContext';

/**
 * Custom hook for filtering and searching users
 * 
 * @returns {Object} User filtering utilities
 */
export default function useUserFilters() {
  const { users, tabValue, searchTerm, dispatch } = useUserContext();
  
  /**
   * Sets the active tab value
   * 
   * @param {number} value - New tab value
   */
  const setTabValue = useCallback((value) => {
    dispatch({ type: 'SET_TAB_VALUE', payload: value });
    filterUsers(value, searchTerm);
  }, [dispatch, searchTerm]);
  
  /**
   * Sets the search term value
   * 
   * @param {string} term - New search term
   */
  const setSearchTerm = useCallback((term) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
    filterUsers(tabValue, term);
  }, [dispatch, tabValue]);
  
  /**
   * Applies search filter to the provided list
   * 
   * @param {Array} userList - List of users to filter
   * @param {string} term - Search term to apply
   */
  const applySearch = useCallback((userList, term) => {
    if (!term) {
      dispatch({ type: 'SET_FILTERED_USERS', payload: userList });
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = userList.filter(user => {
      try {
        const nameMatch = user.displayName && user.displayName.toLowerCase().includes(lowerTerm);
        const emailMatch = user.email && user.email.toLowerCase().includes(lowerTerm);
        const roleMatch = user.roleNameCodes && user.roleNameCodes.toLowerCase().includes(lowerTerm);
        const idMatch = user.firebaseUserId && user.firebaseUserId.toLowerCase().includes(lowerTerm);
        const fullNameMatch = user.fullName && user.fullName.toLowerCase().includes(lowerTerm);
        
        return nameMatch || emailMatch || roleMatch || idMatch || fullNameMatch;
      } catch (err) {
        console.warn('Error filtering user:', err);
        return false;
      }
    });
    
    dispatch({ type: 'SET_FILTERED_USERS', payload: filtered });
  }, [dispatch]);
  
  /**
   * Filters users based on tab value and search term
   * 
   * @param {number} tabVal - Active tab value
   * @param {string} term - Search term
   */
  const filterUsers = useCallback((tabVal, term) => {
    console.log(`Filtering ${users.length} users for tab ${tabVal} with search term "${term}"`);
    
    let filtered = users;
    
    // Apply tab filtering
    if (tabVal === 1) { // Organizers
      // Filter to show only users with valid organizerId in regionalOrganizerInfo
      filtered = filtered.filter(user => {
        const hasOrganizerId = user.regionalOrganizerInfo && 
          user.regionalOrganizerInfo.organizerId && 
          user.regionalOrganizerInfo.organizerId !== null &&
          user.regionalOrganizerInfo.organizerId !== undefined;
        
        return hasOrganizerId;
      });
    } else if (tabVal === 2) { // Admins
      // Filter admin users by role code
      filtered = filtered.filter(user => {
        const roleCodes = user.roleNameCodes?.split(', ') || [];
        return roleCodes.includes('SA') || roleCodes.includes('RA');
      });
    }
    
    // Apply search term filtering
    applySearch(filtered, term);
  }, [applySearch, users]);
  
  return {
    filterUsers,
    setTabValue,
    setSearchTerm,
  };
}