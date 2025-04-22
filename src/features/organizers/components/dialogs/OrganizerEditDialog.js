'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import OrganizerEditForm from '@/components/organizers/OrganizerEditForm';
import { useOrganizerContext } from '../../context/OrganizerContext';

/**
 * Dialog component for editing an organizer
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onUpdateOrganizer - Callback for organizer update
 * @returns {JSX.Element} OrganizerEditDialog component
 */
export default function OrganizerEditDialog({ onUpdateOrganizer }) {
  const { dialogOpen, editingOrganizer, dispatch } = useOrganizerContext();
  
  // Handle dialog close
  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_DIALOG' });
  }, [dispatch]);
  
  // Handle organizer update
  const handleUpdateOrganizer = useCallback(async (updatedOrganizer) => {
    try {
      await onUpdateOrganizer(updatedOrganizer);
      handleClose();
    } catch (error) {
      console.error('Error in OrganizerEditDialog:', error);
      alert(`Error updating organizer: ${error.message}`);
    }
  }, [onUpdateOrganizer, handleClose]);
  
  return (
    <Dialog 
      open={dialogOpen} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>Edit Organizer</DialogTitle>
      <DialogContent>
        {editingOrganizer && (
          <OrganizerEditForm
            organizer={editingOrganizer}
            onSubmit={handleUpdateOrganizer}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}