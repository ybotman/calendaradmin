'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function OrganizerCreateForm({ onSubmit, appId = '1' }) {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    fullName: '',
    description: '',
    isActive: true,
    wantRender: true,
    isEnabled: false,
    contactInfo: {
      email: '',
      phone: '',
      website: '',
    },
    publicContactInfo: {
      phone: '',
      email: '', // Changed from Email to email for consistency
      url: '',
      address: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
      }
    },
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    organizerTypes: {
      isEventOrganizer: true,
      isVenue: false,
      isTeacher: false,
      isMaestro: false,
      isDJ: false,
      isOrchestra: false
    },
    appId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  
  // Form validation
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Organizer name is required');
      return false;
    }
    if (!formData.shortName.trim()) {
      setError('Short name is required');
      return false;
    }
    if (!validateShortName(formData.shortName)) {
      setError('Short Name must be uppercase with no spaces (max 10 chars, only letters, numbers, !?-_)');
      return false;
    }
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure name fields are consistent and properly set
      const submitData = {
        ...formData,
        // Make sure all name fields are consistent
        name: formData.name,
        fullName: formData.name || formData.fullName,
        shortName: formData.shortName || formData.name,
        // Explicitly set firebaseUserId to null - no fake IDs
        // We're only using firebaseUserId now, not linkedUserLogin
        firebaseUserId: null,
        // Ensure boolean fields are explicitly true or false
        wantRender: formData.wantRender === true ? true : false,
        isActive: formData.isActive === true ? true : false,
        isEnabled: formData.isEnabled === true ? true : false
      };
      
      console.log('Submitting organizer data:', submitData);
      
      // Call the onSubmit function passed as prop
      await onSubmit(submitData);
      
      // Clear form
      setFormData({
        name: '',
        shortName: '',
        fullName: '',
        description: '',
        isActive: true,
        wantRender: true,
        isEnabled: false,
        contactInfo: {
          email: '',
          phone: '',
          website: '',
        },
        publicContactInfo: {
          phone: '',
          email: '', // Changed from Email to email for consistency
          url: '',
          address: {
            street1: '',
            street2: '',
            city: '',
            state: '',
            postalCode: '',
          }
        },
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        organizerTypes: {
          isEventOrganizer: true,
          isVenue: false,
          isTeacher: false,
          isMaestro: false,
          isDJ: false,
          isOrchestra: false
        },
        appId,
      });
    } catch (err) {
      setError('Failed to create organizer. Please try again.');
      console.error('Error in organizer creation:', err);
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
            error={error.includes('name')}
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
            error={error.includes('short name') || (formData.shortName.length > 0 && !validateShortName(formData.shortName))}
            helperText="No spaces, letters, numbers, and !?-_ only"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            helperText="Full name of the organizer (required by backend)"
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
                checked={formData.wantRender} 
                onChange={handleChange}
                name="wantRender"
                color="secondary"
              />
            }
            label="Want Render"
            title="Controls if this organizer should be shown on the public-facing site"
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
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={loading}
          startIcon={<AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Organizer'}
        </Button>
      </Box>
    </Box>
  );
}