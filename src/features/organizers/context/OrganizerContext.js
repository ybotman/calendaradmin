'use client';

import { createContext, useReducer, useContext } from 'react';
import organizerReducer from './organizerReducer';

// Create the context
const OrganizerContext = createContext();

/**
 * Initial state for the organizer context
 */
const initialState = {
  organizers: [],
  filteredOrganizers: [],
  loading: false,
  error: null,
  searchTerm: '',
  tabValue: 0,
  editingOrganizer: null,
  dialogOpen: false,
  createDialogOpen: false,
  
  // Import state
  importDialogOpen: false,
  importStatus: 'idle', // idle, loading, ready, importing, complete, error
  fetchingBTCOrganizers: false,
  importedOrganizers: [],
  selectedOrganizers: {},
  importProgress: 0,
  importResults: { success: 0, error: 0, skipped: 0 },
};

/**
 * Provider component for organizer management state
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} OrganizerProvider component
 */
export function OrganizerProvider({ children }) {
  const [state, dispatch] = useReducer(organizerReducer, initialState);
  
  // Value to be provided to consumers
  const contextValue = {
    ...state,
    dispatch,
  };
  
  return (
    <OrganizerContext.Provider value={contextValue}>
      {children}
    </OrganizerContext.Provider>
  );
}

/**
 * Custom hook to use the organizer context
 * 
 * @returns {Object} Organizer context value
 */
export function useOrganizerContext() {
  const context = useContext(OrganizerContext);
  
  if (context === undefined) {
    throw new Error('useOrganizerContext must be used within an OrganizerProvider');
  }
  
  return context;
}