'use client';

import { createContext, useReducer, useContext } from 'react';
import userReducer from './userReducer';

// Create the context
const UserContext = createContext();

/**
 * Initial state for the user context
 */
const initialState = {
  users: [],
  filteredUsers: [],
  roles: { roles: [] },
  loading: false,
  error: null,
  searchTerm: '',
  tabValue: 0,
  appId: '1', // Default to TangoTiempo
  editingUser: null,
  dialogOpen: false,
  addUserDialogOpen: false,
  selectedUser: null,
  newUser: {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    active: true,
    isOrganizer: false,
  },
};

/**
 * Provider component for user management state
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} UserProvider component
 */
export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  
  // Value to be provided to consumers
  const contextValue = {
    ...state,
    dispatch,
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Custom hook to use the user context
 * 
 * @returns {Object} User context value
 */
export function useUserContext() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  
  return context;
}