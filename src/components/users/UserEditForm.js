'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';

export default function UserEditForm({ user, roles, onSubmit }) {
  const [formData, setFormData] = useState({
    localUserInfo: {
      firstName: '',
      lastName: '',
      isActive: true,
      isApproved: true,
      isEnabled: true,
      userDefaults: {
        region: '',
        division: '',
        city: ''
      }
    },
    roleIds: [],
    active: true,
    regionalOrganizerInfo: {
      isApproved: false,
      isEnabled: false,
      isActive: false,
      organizerId: null,
    },
    localAdminInfo: {
      isApproved: false,
      isEnabled: false,
      isActive: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizers, setOrganizers] = useState([]);
  const [organizersLoading, setOrganizersLoading] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);

  // Fetch organizers
  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        setOrganizersLoading(true);
        // Use the appId from the user if available, or default to "1"
        const appId = user?.appId || "1";
        
        // Try first approach - using our specific API endpoint
        try {
          // Make sure to add isActive=true as a parameter to satisfy backend requirements
          const response = await axios.get(`/api/organizers?appId=${appId}&isActive=true`);
          
          if (response.data && Array.isArray(response.data)) {
            console.log(`Loaded ${response.data.length} organizers for dropdown`);
            setOrganizers(response.data);
            setOrganizersLoading(false);
            return; // Exit early if successful
          } else {
            console.warn('Invalid organizers data format, trying direct backend access:', response.data);
            // Continue to fallback approach
          }
        } catch (apiError) {
          console.warn('First organizer fetch approach failed, trying direct backend access:', apiError);
          // Continue to fallback approach
        }
        
        // Fallback - try fetching directly from backend
        try {
          const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
          const directResponse = await axios.get(`${BE_URL}/api/organizers/all?appId=${appId}&isActive=true`);
          
          if (directResponse.data && Array.isArray(directResponse.data)) {
            console.log(`Loaded ${directResponse.data.length} organizers from direct backend call`);
            setOrganizers(directResponse.data);
          } else {
            console.error('Invalid organizers data from direct backend call:', directResponse.data);
            setOrganizers([]);
          }
        } catch (directError) {
          console.error('All organizer fetch approaches failed:', directError);
          setOrganizers([]); // Set empty array to prevent errors
        }
        
        setOrganizersLoading(false);
      } catch (error) {
        console.error('Error in organizer fetch process:', error);
        setOrganizersLoading(false);
        setOrganizers([]); // Set empty array to prevent errors
      }
    };

    fetchOrganizers();
  }, [user]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const organizerId = user.regionalOrganizerInfo?.organizerId 
        ? (typeof user.regionalOrganizerInfo.organizerId === 'object' 
           ? user.regionalOrganizerInfo.organizerId._id 
           : user.regionalOrganizerInfo.organizerId)
        : null;
        
      // Find the selected organizer if organizerId is available
      if (organizerId && organizers.length > 0) {
        const foundOrganizer = organizers.find(org => org._id === organizerId);
        setSelectedOrganizer(foundOrganizer || null);
      }
      
      setFormData({
        firebaseUserId: user.firebaseUserId,
        localUserInfo: {
          firstName: user.localUserInfo?.firstName || '',
          lastName: user.localUserInfo?.lastName || '',
          isActive: user.localUserInfo?.isActive !== false, // Default to true if undefined
          isApproved: user.localUserInfo?.isApproved !== false, // Default to true if undefined
          isEnabled: user.localUserInfo?.isEnabled !== false, // Default to true if undefined
          userDefaults: {
            region: user.localUserInfo?.userDefaults?.region || '',
            division: user.localUserInfo?.userDefaults?.division || '',
            city: user.localUserInfo?.userDefaults?.city || ''
          }
        },
        roleIds: user.roleIds?.map(role => typeof role === 'object' ? role._id : role) || [],
        active: user.active !== false, // Default to true if undefined
        regionalOrganizerInfo: {
          isApproved: user.regionalOrganizerInfo?.isApproved || false,
          isEnabled: user.regionalOrganizerInfo?.isEnabled || false,
          isActive: user.regionalOrganizerInfo?.isActive || false,
          organizerId: organizerId,
        },
        localAdminInfo: {
          isApproved: user.localAdminInfo?.isApproved || false,
          isEnabled: user.localAdminInfo?.isEnabled || false,
          isActive: user.localAdminInfo?.isActive || false,
        },
      });
    }
  }, [user, organizers]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
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

  // Handle role selection changes
  const handleRoleChange = (e, roleId) => {
    const { checked } = e.target;
    
    setFormData(prev => {
      if (checked) {
        // Add role if it doesn't exist
        return {
          ...prev,
          roleIds: [...prev.roleIds, roleId]
        };
      } else {
        // Remove role if it exists
        return {
          ...prev,
          roleIds: prev.roleIds.filter(id => id !== roleId)
        };
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Check if the organizer relationship has changed
      const originalOrganizerId = user.regionalOrganizerInfo?.organizerId 
        ? (typeof user.regionalOrganizerInfo.organizerId === 'object' 
           ? user.regionalOrganizerInfo.organizerId._id 
           : user.regionalOrganizerInfo.organizerId)
        : null;
      
      const newOrganizerId = formData.regionalOrganizerInfo.organizerId;
      
      // If the user has selected a different organizer, use connectToUser API
      if (newOrganizerId && newOrganizerId !== originalOrganizerId) {
        try {
          console.log(`Connecting user ${formData.firebaseUserId} to organizer ${newOrganizerId} before saving user data`);
          
          // Call the organizer connect-user API to establish the relationship
          const connectResponse = await axios.patch(`/api/organizers/${newOrganizerId}/connect-user`, {
            firebaseUserId: formData.firebaseUserId,
            appId: user.appId || '1'
          });
          
          console.log('Successfully connected user to organizer:', connectResponse.data);
          
          // Make sure the RegionalOrganizer role is also included
          const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
          if (organizerRole && !formData.roleIds.includes(organizerRole._id)) {
            formData.roleIds.push(organizerRole._id);
            console.log('Added RegionalOrganizer role to user roles');
          }
        } catch (connectError) {
          console.warn('Error connecting user to organizer via API, will rely on standard update:', connectError);
          // Continue with regular update, which will set the organizerId reference
        }
      }
      
      // Update user information with the prepared data
      onSubmit({
        ...formData,
        appId: user.appId || '1', // Default to TangoTiempo if not specified
      });
    } catch (err) {
      console.error('Error in form submission:', err);
      setError('Failed to update user. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Basic User Information */}
      <Typography variant="h6" gutterBottom>Basic Information</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="localUserInfo.firstName"
            value={formData.localUserInfo.firstName}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="localUserInfo.lastName"
            value={formData.localUserInfo.lastName}
            onChange={handleChange}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Firebase User ID"
            value={formData.firebaseUserId || ''}
            disabled
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.active} 
                onChange={handleChange}
                name="active"
                color="primary"
              />
            }
            label="User is Active"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localUserInfo.isApproved} 
                onChange={handleChange}
                name="localUserInfo.isApproved"
                color="primary"
              />
            }
            label="Local User Approved"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localUserInfo.isEnabled} 
                onChange={handleChange}
                name="localUserInfo.isEnabled"
                color="primary"
              />
            }
            label="Local User Enabled"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localUserInfo.isActive} 
                onChange={handleChange}
                name="localUserInfo.isActive"
                color="primary"
              />
            }
            label="Local User Active"
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* User Defaults Section */}
      <Typography variant="h6" gutterBottom>User Default Locations</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Default Region"
            name="localUserInfo.userDefaults.region"
            value={formData.localUserInfo.userDefaults?.region?._id || formData.localUserInfo.userDefaults?.region || ''}
            onChange={handleChange}
            placeholder="Region ID"
            helperText="The default region for this user (ObjectId)"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Default Division"
            name="localUserInfo.userDefaults.division"
            value={
              typeof formData.localUserInfo.userDefaults?.division === 'object' 
                ? formData.localUserInfo.userDefaults?.division?._id 
                : formData.localUserInfo.userDefaults?.division || ''
            }
            onChange={handleChange}
            placeholder="Division ID"
            helperText="The default division for this user (ObjectId)"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Default City"
            name="localUserInfo.userDefaults.city"
            value={
              typeof formData.localUserInfo.userDefaults?.city === 'object' 
                ? formData.localUserInfo.userDefaults?.city?._id 
                : formData.localUserInfo.userDefaults?.city || ''
            }
            onChange={handleChange}
            placeholder="City ID"
            helperText="The default city for this user (ObjectId)"
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Roles Section */}
      <Typography variant="h6" gutterBottom>User Roles</Typography>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Role Assignments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {roles.map((role) => (
              <ListItem key={role._id} dense>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.roleIds.includes(role._id)}
                      onChange={(e) => handleRoleChange(e, role._id)}
                      name={`role-${role._id}`}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{role.roleName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Organizer Section */}
      <Typography variant="h6" gutterBottom>Organizer Status</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.regionalOrganizerInfo.isApproved} 
                onChange={handleChange}
                name="regionalOrganizerInfo.isApproved"
                color="primary"
              />
            }
            label="Approved as Organizer"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.regionalOrganizerInfo.isEnabled} 
                onChange={handleChange}
                name="regionalOrganizerInfo.isEnabled"
                color="primary"
              />
            }
            label="Enabled as Organizer"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.regionalOrganizerInfo.isActive} 
                onChange={handleChange}
                name="regionalOrganizerInfo.isActive"
                color="primary"
              />
            }
            label="Active as Organizer"
          />
        </Grid>

        <Grid item xs={12}>
          <Autocomplete
            options={organizers}
            loading={organizersLoading}
            value={selectedOrganizer}
            onChange={(event, newValue) => {
              setSelectedOrganizer(newValue);
              // Update formData with the new organizerId
              setFormData(prev => ({
                ...prev,
                regionalOrganizerInfo: {
                  ...prev.regionalOrganizerInfo,
                  organizerId: newValue?._id || null
                }
              }));
            }}
            getOptionLabel={(option) => `${option.shortName || ''} - ${option.fullName || option.name || 'Unnamed'}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Organizer"
                variant="outlined"
                helperText="Select an organizer to connect to this user"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {organizersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {option.shortName || 'No Short Name'}
                  </Typography>
                  <Typography variant="body2">
                    {option.fullName || option.name || 'Unnamed Organizer'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {option._id}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Grid>
        
        <Grid item xs={12}>
          {selectedOrganizer ? (
            <Box sx={{ mt: 1, p: 1.5, border: '1px solid #eee', borderRadius: 1 }}>
              <Typography variant="subtitle2">Selected Organizer:</Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedOrganizer.fullName || selectedOrganizer.name}
              </Typography>
              <Typography variant="body2">
                <strong>Short Name:</strong> {selectedOrganizer.shortName}
              </Typography>
              <Typography variant="body2">
                <strong>ID:</strong> {selectedOrganizer._id}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Note: To link an organizer to this user, you can also use the Organizers section 
              and click the "Link" button on an organizer to connect it to a user.
            </Typography>
          )}
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Admin Section */}
      <Typography variant="h6" gutterBottom>Admin Status</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localAdminInfo.isApproved} 
                onChange={handleChange}
                name="localAdminInfo.isApproved"
                color="primary"
              />
            }
            label="Approved as Admin"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localAdminInfo.isEnabled} 
                onChange={handleChange}
                name="localAdminInfo.isEnabled"
                color="primary"
              />
            }
            label="Enabled as Admin"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={formData.localAdminInfo.isActive} 
                onChange={handleChange}
                name="localAdminInfo.isActive"
                color="primary"
              />
            }
            label="Active as Admin"
          />
        </Grid>
      </Grid>
      
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