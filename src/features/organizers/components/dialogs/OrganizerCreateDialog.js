'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import OrganizerCreateForm from '@/components/organizers/OrganizerCreateForm';
import { useOrganizerContext } from '../../context/OrganizerContext';

/**
 * Dialog component for creating a new organizer
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onCreateOrganizer - Callback for organizer creation
 * @param {string} props.appId - Application ID
 * @returns {JSX.Element} OrganizerCreateDialog component
 */
export default function OrganizerCreateDialog({ onCreateOrganizer, appId }) {
  const { createDialogOpen, dispatch } = useOrganizerContext();
  
  // Handle dialog close
  const handleClose = useCallback(() => {
    dispatch({ type: 'SET_CREATE_DIALOG_OPEN', payload: false });
  }, [dispatch]);
  
  // Handle organizer creation
  const handleCreateOrganizer = useCallback(async (newOrganizer) => {
    try {
      await onCreateOrganizer(newOrganizer);
      handleClose();
    } catch (error) {
      console.error('Error in OrganizerCreateDialog:', error);
      throw error;
    }
  }, [onCreateOrganizer, handleClose]);
  
  return (
    <Dialog 
      open={createDialogOpen} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>Create New Organizer</DialogTitle>
      <DialogContent>
        <OrganizerCreateForm
          onSubmit={handleCreateOrganizer}
          appId={appId}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}