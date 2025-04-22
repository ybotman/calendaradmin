'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { useUserContext } from '../../context/UserContext';

/**
 * Dialog component for creating a new user
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onCreateUser - Callback for user creation
 * @returns {JSX.Element} UserCreateDialog component
 */
export default function UserCreateDialog({ onCreateUser }) {
  const { addUserDialogOpen, newUser, dispatch } = useUserContext();
  const [loading, setLoading] = useState(false);
  
  // Handle dialog close
  const handleClose = useCallback(() => {
    dispatch({ type: 'SET_ADD_USER_DIALOG_OPEN', payload: false });
    dispatch({ type: 'RESET_NEW_USER' });
  }, [dispatch]);
  
  // Handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value, checked, type } = e.target;
    
    dispatch({
      type: 'UPDATE_NEW_USER_FIELD',
      payload: {
        field: name,
        value: type === 'checkbox' ? checked : value
      }
    });
  }, [dispatch]);
  
  // Handle create user form submission
  const handleSubmit = useCallback(async () => {
    try {
      // Basic validation
      if (!newUser.email || !newUser.firstName || !newUser.lastName) {
        alert('Please fill in all required fields (Email, First name, Last name)');
        return;
      }
      
      // Password validation only if we're using it
      if (newUser.password && newUser.password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      
      // Set loading state
      setLoading(true);
      
      // Confirm that the user understands temp users
      if (!newUser.password || newUser.password.length === 0) {
        const confirm = window.confirm("You are creating a temporary user without Firebase authentication. This user won't be able to log in. Continue?");
        if (!confirm) {
          setLoading(false);
          return;
        }
      }
      
      // Create the user
      await onCreateUser(newUser);
      
      // Reset form and close dialog
      dispatch({ type: 'RESET_NEW_USER' });
      dispatch({ type: 'SET_ADD_USER_DIALOG_OPEN', payload: false });
    } catch (error) {
      console.error("Error creating user:", error);
      
      let errorMessage = 'Failed to create user';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [newUser, onCreateUser, dispatch]);
  
  return (
    <Dialog
      open={addUserDialogOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="First Name"
                name="firstName"
                value={newUser.firstName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Last Name"
                name="lastName"
                value={newUser.lastName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Email"
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleChange}
                helperText="Optional. If provided, minimum 6 characters. Empty = create temporary user."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newUser.active}
                    onChange={handleChange}
                    name="active"
                  />
                }
                label="User is Active"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={newUser.isOrganizer}
                    onChange={handleChange}
                    name="isOrganizer"
                  />
                }
                label="Create Organizer for this User"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}