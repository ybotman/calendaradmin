'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/Add';
import SearchBar from '@/components/common/SearchBar';
import AllUsersTab from './tabs/AllUsersTab';
import OrganizersTab from './tabs/OrganizersTab';
import AdminsTab from './tabs/AdminsTab';
import UserEditDialog from './dialogs/UserEditDialog';
import UserCreateDialog from './dialogs/UserCreateDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { UserProvider, useUserContext } from '../context/UserContext';
import useUserData from '../hooks/useUserData';
import useUserFilters from '../hooks/useUserFilters';
import { useAppContext } from '@/lib/AppContext';

/**
 * Inner component for User Management page
 * 
 * @returns {JSX.Element} UserPageContent component
 */
function UserPageContent() {
  const { currentApp } = useAppContext();
  const { 
    tabValue, 
    searchTerm, 
    dispatch,
    selectedUser,
  } = useUserContext();
  
  // State for confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Custom hooks
  const { fetchUsers, updateUser, createUser, deleteUser, syncFirebaseUsers } = useUserData(currentApp.id);
  const { setTabValue, setSearchTerm } = useUserFilters();
  
  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Handle tab change
  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, [setTabValue]);
  
  // Handle search input change
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, [setSearchTerm]);
  
  // Handle edit user button click
  const handleEditUser = useCallback((user) => {
    dispatch({ type: 'SET_EDITING_USER', payload: user });
  }, [dispatch]);
  
  // Handle add user button click
  const handleAddUser = useCallback(() => {
    dispatch({ type: 'SET_ADD_USER_DIALOG_OPEN', payload: true });
  }, [dispatch]);
  
  // Handle delete user button click
  const handleDeleteUser = useCallback((user) => {
    setUserToDelete(user);
    setConfirmDialogOpen(true);
  }, []);
  
  // Handle confirm delete user
  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      dispatch({ type: 'SET_SELECTED_USER', payload: userToDelete });
      await deleteUser(userToDelete);
      alert('User deleted successfully!');
    } catch (error) {
      console.error("Error deleting user:", error);
      
      let errorMessage = 'Failed to delete user';
      if (error.response && error.response.data) {
        errorMessage += `: ${error.response.data.message || JSON.stringify(error.response.data)}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      dispatch({ type: 'SET_SELECTED_USER', payload: null });
      setUserToDelete(null);
      setConfirmDialogOpen(false);
    }
  }, [userToDelete, deleteUser, dispatch]);
  
  // Handle Firebase user synchronization
  const handleSyncFirebaseUsers = useCallback(async () => {
    try {
      // Get confirmation
      if (!window.confirm('This will synchronize all Firebase users with the database. Continue?')) {
        return;
      }
      
      dispatch({ type: 'FETCH_USERS_START' });
      
      // Perform the synchronization
      const syncResults = await syncFirebaseUsers();
      
      // Show results
      const stats = syncResults.stats;
      const detailedMessage = stats ? 
        `\n\n• Total Firebase users processed: ${stats.total}` +
        `\n• New users created: ${stats.created}` + 
        `\n• Existing users updated: ${stats.updated}` +
        `\n• Users skipped: ${stats.skipped}` +
        `\n• Errors encountered: ${stats.errors}` : '';
      
      alert(`Successfully synchronized users!${detailedMessage}`);
    } catch (error) {
      console.error('Error synchronizing Firebase users:', error);
      
      // Format the error message for better readability
      let errorMessage = 'Error synchronizing users: ';
      
      if (error.response && error.response.data) {
        // API returned a structured error response
        const responseData = error.response.data;
        errorMessage += responseData.error || responseData.message || error.message;
        
        if (responseData.details) {
          errorMessage += `\n\nDetails: ${responseData.details}`;
        }
        
        if (responseData.help) {
          errorMessage += `\n\nTroubleshooting: ${responseData.help}`;
        }
      } else {
        // Standard error
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    }
  }, [syncFirebaseUsers, dispatch]);
  
  // Update user
  const handleUpdateUser = useCallback(async (updatedUser) => {
    try {
      await updateUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [updateUser]);
  
  // Create user
  const handleCreateUser = useCallback(async (newUserData) => {
    try {
      const createdUser = await createUser(newUserData);
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }, [createUser]);
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PersonAddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Users" />
          <Tab label="Organizers" />
          <Tab label="Admins" />
        </Tabs>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleSyncFirebaseUsers}
          >
            Sync Firebase Users
          </Button>
          
          <SearchBar
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </Box>
      </Box>
      
      {/* Tab Panels */}
      <AllUsersTab 
        value={tabValue} 
        index={0} 
        onEditUser={handleEditUser} 
        onDeleteUser={handleDeleteUser}
      />
      
      <OrganizersTab 
        value={tabValue} 
        index={1} 
        onEditUser={handleEditUser} 
        onDeleteUser={handleDeleteUser}
      />
      
      <AdminsTab 
        value={tabValue} 
        index={2} 
        onEditUser={handleEditUser} 
        onDeleteUser={handleDeleteUser}
      />
      
      {/* Dialogs */}
      <UserEditDialog onUpdateUser={handleUpdateUser} />
      <UserCreateDialog onCreateUser={handleCreateUser} />
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.displayName}"?
          \nWARNING: This will permanently remove this user and they will no longer be able to log in.
          ${userToDelete?.regionalOrganizerInfo?.organizerId 
            ? "\n\nIMPORTANT: This user is linked to an organizer. The organizer will NOT be deleted, but will have its user connection removed." 
            : ""}
          \nThis action cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
}

/**
 * Wrapper component that provides context
 * 
 * @returns {JSX.Element} UserPage component
 */
export default function UserPage() {
  return (
    <UserProvider>
      <UserPageContent />
    </UserProvider>
  );
}