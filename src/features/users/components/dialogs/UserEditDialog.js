'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import UserEditForm from '@/components/users/UserEditForm';
import { useUserContext } from '../../context/UserContext';

/**
 * Dialog component for editing a user
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onUpdateUser - Callback for user update
 * @returns {JSX.Element} UserEditDialog component
 */
export default function UserEditDialog({ onUpdateUser }) {
  const { dialogOpen, editingUser, roles, dispatch } = useUserContext();
  
  // Handle dialog close
  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_DIALOG' });
  }, [dispatch]);
  
  // Handle user update
  const handleUpdateUser = useCallback(async (updatedUser) => {
    try {
      await onUpdateUser(updatedUser);
      handleClose();
    } catch (error) {
      console.error('Error in UserEditDialog:', error);
      alert(`Error updating user: ${error.message}`);
    }
  }, [onUpdateUser, handleClose]);
  
  return (
    <Dialog 
      open={dialogOpen} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        {editingUser && roles?.roles && (
          <UserEditForm
            user={editingUser}
            roles={roles.roles}
            onSubmit={handleUpdateUser}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}