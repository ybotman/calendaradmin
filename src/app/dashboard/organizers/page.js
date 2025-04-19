'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { organizersApi, usersApi } from '@/lib/api-client';
import OrganizerEditForm from '@/components/organizers/OrganizerEditForm';
import OrganizerCreateForm from '@/components/organizers/OrganizerCreateForm';
import { useAppContext } from '@/lib/AppContext';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function OrganizersPage() {
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const { currentApp } = useAppContext();
  const [editingOrganizer, setEditingOrganizer] = useState(null);
  const [creatingOrganizer, setCreatingOrganizer] = useState(false);
  // Connection functionality moved to edit form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('idle'); // idle, loading, success, error
  const [importedOrganizers, setImportedOrganizers] = useState([]);
  const [selectedOrganizers, setSelectedOrganizers] = useState({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, error: 0, skipped: 0 });
  const [fetchingBTCOrganizers, setFetchingBTCOrganizers] = useState(false);

  // Fetch organizers when tab or app changes
  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        setLoading(true);
        let organizersData;
        const appId = currentApp.id;
        
        console.log(`Fetching organizers for AppId: ${appId}, Tab: ${tabValue}`);
        
        // Fetch based on tab
        if (tabValue === 0) { // All
          organizersData = await organizersApi.getOrganizers(appId);
        } else if (tabValue === 1) { // Active
          organizersData = await organizersApi.getOrganizers(appId, true);
        } else if (tabValue === 2) { // Inactive
          organizersData = await organizersApi.getOrganizers(appId, false);
        }
        
        // Process organizers data
        const processedOrganizers = organizersData.map(organizer => ({
          ...organizer,
          id: organizer._id, // For DataGrid key
          displayName: organizer.fullName || organizer.name || 'Unnamed Organizer',
          shortDisplayName: organizer.shortName || 'No short name',
          status: organizer.isActive ? 'Active' : 'Inactive',
          enabled: organizer.isEnabled ? 'Yes' : 'No',
          wantRender: organizer.wantRender ? 'Yes' : 'No',
          userConnected: organizer.firebaseUserId ? 'Yes' : 'No',
        }));
        
        setOrganizers(processedOrganizers);
        setFilteredOrganizers(processedOrganizers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching organizers:', error);
        setLoading(false);
        alert(`Failed to fetch organizers: ${error.message}`);
      }
    };

    fetchOrganizers();
  }, [currentApp.id, tabValue]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    filterOrganizers(term);
  };

  // Filter organizers based on search term
  const filterOrganizers = (term) => {
    if (!term) {
      setFilteredOrganizers(organizers);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = organizers.filter(organizer =>
      (organizer.displayName.toLowerCase().includes(lowerTerm)) ||
      (organizer.shortDisplayName.toLowerCase().includes(lowerTerm))
    );
    
    setFilteredOrganizers(filtered);
  };

  // Handle edit organizer button click
  const handleEditOrganizer = (organizer) => {
    setEditingOrganizer(organizer);
    setDialogOpen(true);
  };

  // This functionality has been moved to the edit form
  // Keeping empty function for backward compatibility
  const handleConnectOrganizer = (organizer) => {
    // Redirect to edit instead
    handleEditOrganizer(organizer);
  };
  
  // Function to refresh organizers
  const refreshOrganizers = async () => {
    try {
      // Fetch organizers with a cache-busting parameter
      const timestamp = new Date().getTime();
      console.log(`Refreshing organizers at ${timestamp}...`);
      
      // Use direct API call to bypass caching
      const response = await axios.get(`/api/organizers?appId=${appId}&_=${timestamp}`);
      const organizersData = response.data;
      
      // Process organizers data
      const processedOrganizers = organizersData.map(org => ({
        ...org,
        id: org._id,
        displayName: org.fullName || org.name || 'Unnamed Organizer',
        shortDisplayName: org.shortName || 'No short name',
        status: org.isActive ? 'Active' : 'Inactive',
        enabled: org.isEnabled ? 'Yes' : 'No',
        wantRender: org.wantRender ? 'Yes' : 'No',
        userConnected: org.firebaseUserId ? 'Yes' : 'No',
      }));
      
      console.log(`Refreshed ${processedOrganizers.length} organizers`);
      setOrganizers(processedOrganizers);
      return processedOrganizers;
    } catch (error) {
      console.error('Error refreshing organizers:', error);
      throw error;
    }
  };

  // Handle delete organizer
  const handleDeleteOrganizer = async (organizer) => {
    try {
      // Get confirmation
      if (!window.confirm(`Are you sure you want to delete the organizer "${organizer.displayName}"?\nThis action cannot be undone.`)) {
        return;
      }
      
      setLoading(true);
      
      // First, check if this organizer is connected to a user
      // We now only use firebaseUserId, not linkedUserLogin
      if (organizer.firebaseUserId) {
        // Find which user is connected to this organizer
        const users = await usersApi.getUsers(currentApp.id);
        const connectedUser = users.find(user => 
          user.regionalOrganizerInfo?.organizerId === organizer._id ||
          (typeof user.regionalOrganizerInfo?.organizerId === 'object' && 
           user.regionalOrganizerInfo?.organizerId._id === organizer._id)
        );
        
        if (connectedUser) {
          // First try the new disconnect API endpoint
          try {
            console.log(`Disconnecting user from organizer using the disconnect API...`);
            const disconnectResponse = await axios.patch(`/api/organizers/${organizer._id}/disconnect-user`, {
              appId: currentApp.id
            });
            console.log('Disconnect response:', disconnectResponse.data);
          } catch (disconnectError) {
            console.error('Error using the disconnect API:', disconnectError);
            
            // Fallback: Update user directly to remove organizer connection
            console.log('Falling back to direct user update...');
            const userUpdateData = {
              firebaseUserId: connectedUser.firebaseUserId,
              appId: connectedUser.appId || currentApp.id,
              regionalOrganizerInfo: {
                ...connectedUser.regionalOrganizerInfo,
                organizerId: null,
                isEnabled: false,
                isActive: false,
                wantRender: false
              }
            };
            
            // Update user to remove organizer connection
            await usersApi.updateUser(userUpdateData);
          }
        }
      }
      
      // Delete the organizer using the API
      const deleteResponse = await axios.delete(`/api/organizers/${organizer._id}?appId=${currentApp.id}`);
      console.log('Delete response:', deleteResponse.data);
      
      // Force a delay before refreshing to allow server-side propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the organizers list
      const updatedOrganizers = await refreshOrganizers();
      
      // Apply any current filters
      filterOrganizers(searchTerm);
      
      // Set a short timeout to reapply filters (sometimes needed for UI refresh)
      setTimeout(() => {
        filterOrganizers(searchTerm);
      }, 100);
      
      alert('Organizer deleted successfully!');
    } catch (error) {
      console.error('Error deleting organizer:', error);
      alert(`Error deleting organizer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle create organizer button click
  const handleCreateOrganizer = () => {
    setCreatingOrganizer(true);
    setCreateDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingOrganizer(null);
  };

  // Handle create dialog close
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setCreatingOrganizer(false);
  };

  // Removed connect dialog functionality (moved to edit form)
  
  // Handle import organizers from BTC
  const handleImportOrganizers = async () => {
    try {
      setImportDialogOpen(true);
      setImportStatus('loading');
      setFetchingBTCOrganizers(true);
      setImportedOrganizers([]);
      setSelectedOrganizers({});
      
      // Get all existing organizers for comparison
      const existingOrganizersResponse = await organizersApi.getOrganizers(currentApp.id);
      
      const existingOrganizers = existingOrganizersResponse || [];
      console.log(`Found ${existingOrganizers.length} existing organizers for comparison`);
      
      // Fetch all pages from BTC WordPress API using pagination
      let allOrganizers = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        console.log(`Fetching BTC organizers page ${currentPage}...`);
        const response = await axios.get(`https://bostontangocalendar.com/wp-json/tribe/events/v1/organizers`, {
          params: {
            page: currentPage
          }
        });
        
        // Get total pages from headers or response
        if (currentPage === 1) {
          // Try to get from X-WP-TotalPages header
          const totalPagesHeader = response.headers['x-wp-totalpages'] || response.headers['X-WP-TotalPages'];
          if (totalPagesHeader) {
            totalPages = parseInt(totalPagesHeader, 10);
          } else if (response.data && response.data.total_pages) {
            // Fallback to response data
            totalPages = response.data.total_pages;
          }
          console.log(`Total pages of organizers: ${totalPages}`);
        }
        
        if (response.data && response.data.organizers) {
          allOrganizers = [...allOrganizers, ...response.data.organizers];
          console.log(`Fetched ${response.data.organizers.length} organizers from page ${currentPage}`);
        } else {
          throw new Error(`Invalid response format from BTC API on page ${currentPage}`);
        }
        
        currentPage++;
      } while (currentPage <= totalPages);
      
      console.log(`Fetched a total of ${allOrganizers.length} organizers from BTC API`);
      
      // Transform the WordPress organizer format to our application format
      const transformedOrganizers = allOrganizers.map(organizer => {
        // Check if the organizer object is valid
        if (!organizer || typeof organizer !== 'object') {
          console.error('Invalid organizer data:', organizer);
          return null;
        }
        
        // Determine if this organizer already exists in our system (check by fullName field)
        const isDuplicate = existingOrganizers.some(existingOrganizer => 
          existingOrganizer.fullName?.toLowerCase() === organizer.organizer?.toLowerCase()
        );
        
        // Format shortName from organizer name (slug)
        let shortName = '';
        try {
          shortName = organizer.slug ? 
            organizer.slug.replace(/\s+/g, '').replace(/-/g, '').toUpperCase().substring(0, 10) : 
            organizer.organizer ? organizer.organizer.replace(/\s+/g, '').toUpperCase().substring(0, 10) : '';
        } catch (err) {
          console.error('Error formatting shortName:', err);
          shortName = organizer.id?.toString().substring(0, 10) || 'UNKNOWN';
        }
        
        // Create an organizer object in our application's format
        return {
          id: organizer.id,
          originalId: organizer.id,
          fullName: organizer.organizer || '',
          name: organizer.organizer || '',
          shortName: shortName,
          description: organizer.description || '',
          btcNiceName: organizer.id?.toString() || '',
          // Contact info
          publicContactInfo: {
            phone: organizer.phone || '',
            email: organizer.email || '',
            url: organizer.website || '',
          },
          // Other attributes
          appId: currentApp.id,
          isActive: true,
          isEnabled: true,
          isRendered: true,
          wantRender: true,
          isActiveAsOrganizer: false,
          // Organizer types
          organizerTypes: {
            isEventOrganizer: true,
            isTeacher: false,
            isDJ: false,
            isOrchestra: false
          },
          // Images
          images: organizer.image && organizer.image.url ? {
            originalUrl: organizer.image.url
          } : {},
          // Set updated date
          updatedAt: new Date().toISOString(),
          isDuplicate, // Flag to indicate if this organizer already exists
          // Original WordPress data for reference
          original: organizer
        };
      }).filter(Boolean); // Remove any null entries
      
      // Initialize organizers as selected by default (except duplicates)
      const initialSelected = {};
      transformedOrganizers.forEach(organizer => {
        initialSelected[organizer.id] = !organizer.isDuplicate; // Only select non-duplicates by default
      });
      
      setImportedOrganizers(transformedOrganizers);
      setSelectedOrganizers(initialSelected);
      setImportStatus('ready');
    } catch (error) {
      console.error('Error fetching BTC organizers:', error);
      setImportStatus('error');
      alert(`Failed to fetch organizers from BTC: ${error.message}`);
    } finally {
      setFetchingBTCOrganizers(false);
    }
  };
  
  // Handle select all organizers
  const handleSelectAllOrganizers = (event) => {
    const checked = event.target.checked;
    const newSelected = {};
    
    importedOrganizers.forEach(organizer => {
      newSelected[organizer.id] = checked;
    });
    
    setSelectedOrganizers(newSelected);
  };
  
  // Handle select individual organizer
  const handleSelectOrganizer = (event, id) => {
    setSelectedOrganizers(prev => ({
      ...prev,
      [id]: event.target.checked
    }));
  };
  
  // Process organizer import
  const processOrganizerImport = async () => {
    try {
      // Get only the selected organizers
      const organizersToImport = importedOrganizers.filter(organizer => selectedOrganizers[organizer.id]);
      
      if (organizersToImport.length === 0) {
        alert('No organizers selected for import');
        return;
      }
      
      // Count how many duplicates were selected
      const selectedDuplicates = organizersToImport.filter(organizer => organizer.isDuplicate).length;
      
      setImportStatus('importing');
      setImportProgress(0);
      setImportResults({ success: 0, error: 0, skipped: 0 });
      
      // Process organizers one by one
      for (let i = 0; i < organizersToImport.length; i++) {
        const organizer = organizersToImport[i];
        
        try {
          // If the organizer is already in the system and the user selected it anyway,
          // we'll skip it and record it separately
          let isDuplicate = organizer.isDuplicate;
          
          if (isDuplicate) {
            console.log(`Skipping duplicate organizer: ${organizer.fullName}`);
            
            setImportResults(prev => ({
              ...prev,
              skipped: prev.skipped + 1
            }));
          } else {
            // Save to the database - use the test-create endpoint for reliable organizer creation
            const response = await axios.post('/api/organizers/test-create', {
              ...organizer,
              appId: currentApp.id
            });
            
            console.log(`Successfully imported organizer: ${organizer.fullName}`, response.data);
            
            setImportResults(prev => ({
              ...prev,
              success: prev.success + 1
            }));
          }
        } catch (error) {
          console.error(`Error importing organizer ${organizer.fullName}:`, error);
          
          // Show more detailed error information
          if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            
            // If we have detailed error information, display it in the console
            if (error.response.data) {
              console.error('Detailed error:', JSON.stringify(error.response.data, null, 2));
            }
          }
          
          setImportResults(prev => ({
            ...prev,
            error: prev.error + 1
          }));
        }
        
        // Update progress
        setImportProgress(Math.round(((i + 1) / organizersToImport.length) * 100));
      }
      
      setImportStatus('complete');
      
      // Refresh organizers list
      const organizersData = await organizersApi.getOrganizers(currentApp.id);
      
      // Process organizers data
      const processedOrganizers = organizersData.map(organizer => ({
        ...organizer,
        id: organizer._id,
        displayName: organizer.fullName || organizer.name || 'Unnamed Organizer',
        shortDisplayName: organizer.shortName || 'No short name',
        status: organizer.isActive ? 'Active' : 'Inactive',
        enabled: organizer.isEnabled ? 'Yes' : 'No',
        wantRender: organizer.wantRender ? 'Yes' : 'No',
        userConnected: organizer.firebaseUserId ? 'Yes' : 'No',
      }));
      
      setOrganizers(processedOrganizers);
      filterOrganizers(searchTerm);
      
      // Provide a detailed summary in the console
      console.log('Import summary:', {
        totalSelected: organizersToImport.length,
        duplicatesSelected: selectedDuplicates,
        imported: importResults.success,
        failed: importResults.error,
        skipped: importResults.skipped
      });
      
    } catch (error) {
      console.error('Error during import process:', error);
      setImportStatus('error');
      alert(`Import process failed: ${error.message}`);
    }
  };

  // Handle organizer update
  const handleUpdateOrganizer = async (updatedOrganizer) => {
    try {
      setLoading(true);
      
      console.log('Updating organizer:', updatedOrganizer);
      
      // Make sure we have the appId in the updatedOrganizer and ensure boolean fields are properly set
      const organizerWithAppId = {
        ...updatedOrganizer,
        appId: updatedOrganizer.appId || currentApp.id,
        // Ensure both name fields are set consistently
        name: updatedOrganizer.name,
        fullName: updatedOrganizer.name,
        shortName: updatedOrganizer.shortName || updatedOrganizer.name,
        // Explicitly convert boolean fields with ternary to ensure true/false values
        wantRender: updatedOrganizer.wantRender === true ? true : false,
        isActive: updatedOrganizer.isActive === true ? true : false,
        isEnabled: updatedOrganizer.isEnabled === true ? true : false
      };
      
      // Remove isApproved as it's no longer used
      delete organizerWithAppId.isApproved;
      
      console.log('Formatted organizer for update:', organizerWithAppId);
      
      // Try direct update via axios instead of the api-client
      try {
        // First log what we're attempting to do
        console.log(`Directly updating organizer ${organizerWithAppId._id} with appId ${organizerWithAppId.appId}`);
        
        const response = await axios.patch(
          `/api/organizers/${organizerWithAppId._id}?appId=${organizerWithAppId.appId}`, 
          organizerWithAppId
        );
        
        console.log('Update successful:', response.data);
      } catch (axiosError) {
        console.error('Direct PATCH failed:', axiosError);
        console.log('Falling back to direct PUT to backend...');
        
        // If that fails, try to use the backend API directly
        const directResponse = await axios.put(
          `${process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010'}/api/organizers/${organizerWithAppId._id}?appId=${organizerWithAppId.appId}`,
          organizerWithAppId
        );
        
        console.log('Direct PUT to backend successful:', directResponse.data);
      }
      
      // Refresh organizers list
      const organizersData = await organizersApi.getOrganizers(currentApp.id);
      
      // Process organizers data
      const processedOrganizers = organizersData.map(organizer => ({
        ...organizer,
        id: organizer._id,
        displayName: organizer.fullName || organizer.name || 'Unnamed Organizer',
        shortDisplayName: organizer.shortName || 'No short name',
        status: organizer.isActive ? 'Active' : 'Inactive',
        enabled: organizer.isEnabled ? 'Yes' : 'No',
        wantRender: organizer.wantRender ? 'Yes' : 'No',
        userConnected: organizer.firebaseUserId ? 'Yes' : 'No',
      }));
      
      setOrganizers(processedOrganizers);
      filterOrganizers(searchTerm);
      setDialogOpen(false);
      setEditingOrganizer(null);
      
      // Show success message
      alert('Organizer updated successfully!');
    } catch (error) {
      console.error('Error updating organizer:', error);
      
      // More detailed error reporting
      let errorMessage = 'Failed to update organizer';
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        errorMessage += `: ${error.response.status} - ${JSON.stringify(error.response.data || error.message)}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle organizer creation
  const handleCreateOrganizerSubmit = async (newOrganizer) => {
    try {
      setLoading(true);
      
      console.log('Creating organizer:', newOrganizer);
      
      // Use the test-create endpoint for more reliable organizer creation
      const response = await axios.post('/api/organizers/test-create', {
        ...newOrganizer,
        appId: currentApp.id
      });
      
      console.log('Organizer created:', response.data);
      
      // Refresh organizers list
      const organizersData = await organizersApi.getOrganizers(currentApp.id);
      
      // Process organizers data
      const processedOrganizers = organizersData.map(organizer => ({
        ...organizer,
        id: organizer._id,
        displayName: organizer.fullName || organizer.name || 'Unnamed Organizer',
        shortDisplayName: organizer.shortName || 'No short name',
        status: organizer.isActive ? 'Active' : 'Inactive',
        enabled: organizer.isEnabled ? 'Yes' : 'No',
        wantRender: organizer.wantRender ? 'Yes' : 'No',
        userConnected: organizer.firebaseUserId ? 'Yes' : 'No',
      }));
      
      setOrganizers(processedOrganizers);
      filterOrganizers(searchTerm);
      setCreateDialogOpen(false);
      setCreatingOrganizer(false);
      setLoading(false);
      
      // Show success message
      alert('Organizer created successfully!');
    } catch (error) {
      console.error('Error creating organizer:', error);
      let errorMessage = error.message;
      
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
        errorMessage = error.response.data.details || error.response.data.error || error.message;
      }
      
      alert(`Error creating organizer: ${errorMessage}`);
      setLoading(false);
    }
  };

  // Connect functionality has been moved to edit form

  // Define columns for DataGrid
  const columns = [
    { field: 'displayName', headerName: 'Name', flex: 1 },
    { field: 'shortDisplayName', headerName: 'Short Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'enabled', headerName: 'Enabled', width: 120 },
    { field: 'wantRender', headerName: 'Want Render', width: 120 },
    { field: 'userConnected', headerName: 'User Connected', width: 150 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => handleEditOrganizer(params.row)}
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => handleDeleteOrganizer(params.row)}
            startIcon={<DeleteIcon />}
            size="small"
          >
            Delete
          </Button>
        </Box>
      ) 
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Organizer Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={() => handleImportOrganizers()}
          >
            Import from BTC
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateOrganizer}
          >
            Add Organizer
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Organizers" />
          <Tab label="Active" />
          <Tab label="Inactive" />
        </Tabs>
        
        <TextField
          placeholder="Search organizers..."
          value={searchTerm}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredOrganizers}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredOrganizers}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredOrganizers}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      {/* Organizer Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
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
          <Button onClick={handleDialogClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Organizer Create Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCreateDialogClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Create New Organizer</DialogTitle>
        <DialogContent>
          <OrganizerCreateForm
            onSubmit={handleCreateOrganizerSubmit}
            appId={currentApp.id}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Connect User functionality moved to Edit form */}
      
      {/* Import Organizers Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          if (importStatus !== 'importing') {
            setImportDialogOpen(false);
          }
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Import Organizers from BTC</DialogTitle>
        <DialogContent>
          {importStatus === 'loading' || fetchingBTCOrganizers ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Fetching organizers from BostonTangoCalendar...
              </Typography>
            </Box>
          ) : importStatus === 'error' ? (
            <Alert severity="error" sx={{ my: 2 }}>
              Failed to fetch organizers. Please try again.
            </Alert>
          ) : importStatus === 'importing' ? (
            <Box sx={{ my: 2 }}>
              <Typography variant="body1" gutterBottom>
                Importing organizers...
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress variant="determinate" value={importProgress} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">{`${importProgress}%`}</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Box sx={{ bgcolor: 'success.light', px: 2, py: 1, borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Imported: {importResults.success}
                  </Typography>
                </Box>
                {importResults.skipped > 0 && (
                  <Box sx={{ bgcolor: 'warning.light', px: 2, py: 1, borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Skipped: {importResults.skipped}
                    </Typography>
                  </Box>
                )}
                {importResults.error > 0 && (
                  <Box sx={{ bgcolor: 'error.light', px: 2, py: 1, borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Failed: {importResults.error}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : importStatus === 'complete' ? (
            <Box sx={{ my: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Import completed!
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body1">
                  Successfully imported {importResults.success} organizers.
                </Typography>
                
                {importResults.skipped > 0 && (
                  <Typography variant="body1" sx={{ color: 'warning.main' }}>
                    Skipped {importResults.skipped} organizers (already exist in system).
                  </Typography>
                )}
                
                {importResults.error > 0 && (
                  <Typography variant="body1" color="error">
                    Failed to import {importResults.error} organizers.
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    The imported organizers are now available in your system.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="body1">
                    Found {importedOrganizers.length} organizers from BostonTangoCalendar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {importedOrganizers.filter(o => o.isDuplicate).length} already exist in the system
                  </Typography>
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importedOrganizers.length > 0 && 
                          Object.values(selectedOrganizers).length > 0 &&
                          Object.values(selectedOrganizers).every(value => value === true)}
                        indeterminate={Object.values(selectedOrganizers).some(value => value === true) && 
                          Object.values(selectedOrganizers).some(value => value === false)}
                        onChange={handleSelectAllOrganizers}
                      />
                    }
                    label="Select All"
                  />
                  <Button
                    size="small"
                    onClick={() => {
                      const newSelected = {};
                      importedOrganizers.forEach(organizer => {
                        newSelected[organizer.id] = !organizer.isDuplicate;
                      });
                      setSelectedOrganizers(newSelected);
                    }}
                    sx={{ ml: 1 }}
                  >
                    Select New Only
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox 
                          checked={importedOrganizers.length > 0 && 
                            Object.values(selectedOrganizers).length > 0 &&
                            Object.values(selectedOrganizers).every(value => value === true)}
                          indeterminate={Object.values(selectedOrganizers).some(value => value === true) && 
                            Object.values(selectedOrganizers).some(value => value === false)}
                          onChange={handleSelectAllOrganizers}
                        />
                      </TableCell>
                      <TableCell>Found</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Short Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Website</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importedOrganizers.map((organizer) => (
                      <TableRow key={organizer.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={!!selectedOrganizers[organizer.id]}
                            onChange={(e) => handleSelectOrganizer(e, organizer.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {organizer.isDuplicate ? (
                            <Chip 
                              label="Exists" 
                              size="small" 
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Chip 
                              label="New" 
                              size="small" 
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>{organizer.fullName || ''}</TableCell>
                        <TableCell>{organizer.shortName || ''}</TableCell>
                        <TableCell>{organizer.publicContactInfo?.email || ''}</TableCell>
                        <TableCell>{organizer.publicContactInfo?.phone || ''}</TableCell>
                        <TableCell>{organizer.publicContactInfo?.url || ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2" gutterBottom>
                    Selected organizers will be imported into the current application.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Notes:</strong>
                    <ul>
                      <li>Organizers marked as "Exists" are already in your system (based on matching name).</li>
                      <li>By default, only new organizers are selected for import.</li>
                      <li>All imported organizers will be set to active and enabled.</li>
                      <li>Organizer types will be set to EventOrganizer by default.</li>
                    </ul>
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {(importStatus === 'ready') && (
            <>
              <Button 
                onClick={() => setImportDialogOpen(false)} 
              >
                Cancel
              </Button>
              <Button 
                onClick={processOrganizerImport} 
                variant="contained" 
                color="primary"
                disabled={Object.values(selectedOrganizers).every(value => value === false)}
              >
                Import Selected ({Object.values(selectedOrganizers).filter(v => v).length})
              </Button>
            </>
          )}
          
          {(importStatus === 'error' || importStatus === 'complete') && (
            <Button 
              onClick={() => setImportDialogOpen(false)} 
              variant="contained"
            >
              Close
            </Button>
          )}
          
          {importStatus === 'importing' && (
            <Button disabled>
              Importing...
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}