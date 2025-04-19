'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Button,
  Paper,
  Autocomplete,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { usersApi } from '@/lib/api-client';

export default function OrganizerEditForm({ organizer, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    description: '',
    isActive: true,
    isEnabled: false,
    wantRender: true,
    contactInfo: {
      email: '',
      phone: '',
      website: '',
    },
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });
  
  // User connection state
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [linkedUser, setLinkedUser] = useState(null);
  const [connectingUser, setConnectingUser] = useState(false);
  const [disconnectingUser, setDisconnectingUser] = useState(false);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userError, setUserError] = useState('');

  // Initialize form with organizer data
  useEffect(() => {
    if (organizer) {
      setFormData({
        _id: organizer._id,
        appId: organizer.appId || '1', // Ensure appId is included
        name: organizer.name || organizer.fullName || '', // Handle either name format
        fullName: organizer.fullName || organizer.name || '', // Make sure fullName is set 
        shortName: organizer.shortName || '',
        description: organizer.description || '',
        isActive: organizer.isActive === true ? true : false,
        isEnabled: organizer.isEnabled === true ? true : false,
        contactInfo: {
          email: organizer.contactInfo?.email || '',
          phone: organizer.contactInfo?.phone || '',
          website: organizer.contactInfo?.website || '',
        },
        address: {
          street: organizer.address?.street || '',
          city: organizer.address?.city || '',
          state: organizer.address?.state || '',
          postalCode: organizer.address?.postalCode || '',
          country: organizer.address?.country || '',
        },
        // Add missing fields required by backend
        organizerRegion: organizer.organizerRegion || "66c4d99042ec462ea22484bd", // Default US region
        // We're only using firebaseUserId now - linkedUserLogin is deprecated
        firebaseUserId: organizer.firebaseUserId || null, // Include the Firebase user ID if any
        wantRender: organizer.wantRender !== false, // Default to true if not specified
        organizerTypes: organizer.organizerTypes || {
          isEventOrganizer: true,
          isVenue: false,
          isTeacher: false,
          isMaestro: false,
          isDJ: false,
          isOrchestra: false
        }
      });
      
      // Check if there's a linked user
      if (organizer.firebaseUserId) {
        setLinkedUser({
          firebaseUserId: organizer.firebaseUserId,
          linkedUserLogin: organizer.linkedUserLogin
        });
      }
      
      console.log('Loaded organizer with:', {
        name: organizer.name,
        fullName: organizer.fullName,
        shortName: organizer.shortName,
        linkedUser: organizer.linkedUserLogin,
        firebaseUserId: organizer.firebaseUserId,
        wantRender: organizer.wantRender
      });
    }
  }, [organizer]);
  
  // Fetch user details
  useEffect(() => {
    const fetchLinkedUserDetails = async () => {
      if (linkedUser?.firebaseUserId) {
        try {
          // Fetch the linked user's details
          const userData = await usersApi.getUserById(linkedUser.firebaseUserId, organizer.appId);
          setLinkedUser({
            ...linkedUser,
            ...userData
          });
        } catch (err) {
          console.error('Error fetching linked user details:', err);
        }
      }
    };
    
    fetchLinkedUserDetails();
  }, [linkedUser?.firebaseUserId, organizer?.appId]);
  
  // Fetch users for autocomplete
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUserLoading(true);
        // Get users from the backend
        const userData = await usersApi.getUsers(organizer?.appId || '1', true);
        setUsers(userData);
        setUserLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setUserError('Failed to load users. Please try again.');
        setUserLoading(false);
      }
    };
    
    fetchUsers();
  }, [organizer?.appId]);

  // Validate shortName format
  const validateShortName = (value) => {
    // Must be <= 10 chars, no spaces, uppercase only, and only allows !?-_
    const regex = /^[A-Z0-9!?\-_]{1,10}$/;
    return regex.test(value);
  };

  // Format shortName to match requirements
  const formatShortName = (value) => {
    // Remove spaces, convert to uppercase
    return value.replace(/\s+/g, '').toUpperCase().substring(0, 10);
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    // Special handling for shortName
    if (name === 'shortName') {
      const formattedValue = formatShortName(value);
      setFormData(prev => ({
        ...prev,
        shortName: formattedValue
      }));
      return;
    }
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: e.target.type === 'checkbox' ? checked : value
        }
      }));
    } else {
      // Handle top-level fields
      setFormData(prev => ({
        ...prev,
        [name]: e.target.type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle user selection in autocomplete
  const handleUserChange = (event, newValue) => {
    setSelectedUser(newValue);
    setSelectedUserId(newValue?.firebaseUserId || '');
  };
  
  // Filter users for Autocomplete
  const filterOptions = (options, { inputValue }) => {
    const filterValue = inputValue.toLowerCase().trim();
    return options.filter((option) => {
      const name = `${option.localUserInfo?.firstName || ''} ${option.localUserInfo?.lastName || ''}`.toLowerCase();
      const email = (option.firebaseUserInfo?.email || '').toLowerCase();
      const userId = (option.firebaseUserId || '').toLowerCase();
      
      return (
        name.includes(filterValue) ||
        email.includes(filterValue) ||
        userId.includes(filterValue)
      );
    });
  };
  
  // Connect user to organizer
  const handleConnectUser = async () => {
    if (!selectedUserId) {
      setUserError('Please select a user to connect');
      return;
    }
    
    setUserError('');
    setConnectingUser(true);
    
    try {
      // Call the API to connect the user
      const response = await fetch(`/api/organizers/${organizer._id}/connect-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUserId: selectedUserId,
          appId: formData.appId || '1'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect user');
      }
      
      const data = await response.json();
      
      // Update the state with the connected user
      setLinkedUser({
        firebaseUserId: selectedUserId,
        ...selectedUser
      });
      
      // Update form data with only firebaseUserId
      setFormData(prev => ({
        ...prev,
        firebaseUserId: selectedUserId
      }));
      
      setSelectedUser(null);
      setSelectedUserId('');
    } catch (err) {
      console.error('Error connecting user:', err);
      setUserError(`Failed to connect user: ${err.message}`);
    } finally {
      setConnectingUser(false);
    }
  };
  
  // Disconnect user from organizer
  const handleDisconnectUser = async () => {
    if (!linkedUser?.firebaseUserId) {
      return;
    }
    
    setUserError('');
    setDisconnectingUser(true);
    
    try {
      // Call the API to disconnect the user
      const response = await fetch(`/api/organizers/${organizer._id}/disconnect-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: formData.appId || '1'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect user');
      }
      
      // Clear the linked user
      setLinkedUser(null);
      
      // Update form data - only use firebaseUserId now
      setFormData(prev => ({
        ...prev,
        firebaseUserId: null
      }));
    } catch (err) {
      console.error('Error disconnecting user:', err);
      setUserError(`Failed to disconnect user: ${err.message}`);
    } finally {
      setDisconnectingUser(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate shortName
    if (formData.shortName && !validateShortName(formData.shortName)) {
      setError('Short Name must be uppercase with no spaces (max 10 chars, only letters, numbers, !?-_)');
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure all fields are properly formatted before submission
      const updatedData = {
        ...formData,
        // MongoDB backend actually uses fullName (not name)
        fullName: formData.name,
        name: formData.name,
        // Make sure shortName exists and is formatted correctly
        shortName: formatShortName(formData.shortName || formData.name.substring(0, 10)),
        // Ensure boolean fields are explicitly true or false
        wantRender: formData.wantRender === true ? true : false,
        isActive: formData.isActive === true ? true : false,
        isEnabled: formData.isEnabled === true ? true : false
      };
      
      // Remove isApproved as it's no longer used
      delete updatedData.isApproved;
      
      console.log('Submitting organizer data:', updatedData);
      
      // Call the onSubmit function passed as prop
      await onSubmit(updatedData);
    } catch (err) {
      setError('Failed to update organizer. Please try again.');
      console.error('Error in organizer update:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {/* Basic Organizer Information */}
      <Typography variant="h6" gutterBottom>Basic Information</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Short Name (UPPERCASE, max 10 chars)"
            name="shortName"
            value={formData.shortName}
            onChange={handleChange}
            required
            inputProps={{ 
              maxLength: 10,
              style: { textTransform: 'uppercase' } 
            }}
            helperText="No spaces, letters, numbers, and !?-_ only"
            error={formData.shortName.length > 0 && !validateShortName(formData.shortName)}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={3}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.isActive} 
                onChange={handleChange}
                name="isActive"
                color="primary"
              />
            }
            label="Active"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.isEnabled} 
                onChange={handleChange}
                name="isEnabled"
                color="primary"
              />
            }
            label="Enabled"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.wantRender === true} 
                onChange={handleChange}
                name="wantRender"
                color="secondary"
              />
            }
            label="Want Render"
            title="Controls if this organizer should be shown on the public-facing site"
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Contact Information */}
      <Typography variant="h6" gutterBottom>Contact Information</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Email"
            name="contactInfo.email"
            value={formData.contactInfo.email}
            onChange={handleChange}
            type="email"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Phone"
            name="contactInfo.phone"
            value={formData.contactInfo.phone}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Website"
            name="contactInfo.website"
            value={formData.contactInfo.website}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Address Information */}
      <Typography variant="h6" gutterBottom>Address</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Street"
            name="address.street"
            value={formData.address.street}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="City"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="State/Province"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Postal Code"
            name="address.postalCode"
            value={formData.address.postalCode}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Country"
            name="address.country"
            value={formData.address.country}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* User Connection Section */}
      <Typography variant="h6" gutterBottom>User Connection</Typography>
      
      {userError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {userError}
        </Alert>
      )}
      
      {/* Display current linked user (if any) */}
      {linkedUser ? (
        <Paper sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" gutterBottom>
            Connected User
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body1">
                <strong>Name:</strong> {linkedUser.localUserInfo?.firstName || ''} {linkedUser.localUserInfo?.lastName || ''}
              </Typography>
              {linkedUser.firebaseUserInfo?.email && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Email:</strong> {linkedUser.firebaseUserInfo.email}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                <strong>Firebase ID:</strong> {linkedUser.firebaseUserId}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LinkOffIcon />}
              disabled={disconnectingUser}
              onClick={handleDisconnectUser}
            >
              {disconnectingUser ? 'Disconnecting...' : 'Disconnect User'}
            </Button>
          </Box>
        </Paper>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No user connected to this organizer. You can connect a user if needed, but it's optional.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={users}
                loading={userLoading}
                value={selectedUser}
                onChange={handleUserChange}
                filterOptions={filterOptions}
                getOptionLabel={(option) => {
                  const name = `${option.localUserInfo?.firstName || ''} ${option.localUserInfo?.lastName || ''}`;
                  const email = option.firebaseUserInfo?.email || '';
                  return `${name.trim()} (${email})`;
                }}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">
                        {option.localUserInfo?.firstName || ''} {option.localUserInfo?.lastName || ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.firebaseUserInfo?.email || ''}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {option.roles && option.roles.map((role) => (
                          <Chip 
                            key={role} 
                            label={role} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select User (Optional)"
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {userLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<LinkIcon />}
                disabled={!selectedUserId || connectingUser}
                onClick={handleConnectUser}
              >
                {connectingUser ? 'Connecting...' : 'Connect User (Optional)'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={loading}
          startIcon={<SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
}