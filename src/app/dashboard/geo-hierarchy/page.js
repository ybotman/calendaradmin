'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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

export default function GeoHierarchyPage() {
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0: Cities, 1: Divisions, 2: Regions
  const { currentApp } = useAppContext();
  const [editingItem, setEditingItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch geo hierarchy data on component mount and when app changes
  useEffect(() => {
    const fetchGeoHierarchy = async () => {
      try {
        setLoading(true);
        console.log(`Fetching geo hierarchy for AppId: ${currentApp.id}`);
        
        // Fetch all geo hierarchy data in a single request - simplify to just fetch everything
        console.log(`Fetching ALL geo hierarchy data for AppId: ${currentApp.id}`);
        const response = await axios.get(`/api/geo-hierarchy?type=all&appId=${currentApp.id}`);
        
        if (response.data) {
          // Process cities - city uses isActive, others use active
          const processedCities = response.data.cities?.map(city => ({
            ...city,
            id: city._id,
            type: 'city',
            displayName: city.cityName,
            parentName: city.masteredDivisionId?.divisionName || 'Unknown Division',
            regionName: city.masteredDivisionId?.masteredRegionId?.regionName || 'Unknown Region',
            countryName: city.masteredDivisionId?.masteredRegionId?.masteredCountryId?.countryName || 'Unknown Country',
            status: city.isActive ? 'Active' : 'Inactive',
            latitude: city.latitude,
            longitude: city.longitude,
          })) || [];
          
          // Process divisions
          const processedDivisions = response.data.divisions?.map(division => ({
            ...division,
            id: division._id,
            type: 'division',
            displayName: division.divisionName,
            parentName: division.masteredRegionId?.regionName || 'Unknown Region',
            countryName: division.masteredRegionId?.masteredCountryId?.countryName || 'Unknown Country',
            status: division.active ? 'Active' : 'Inactive',
          })) || [];
          
          // Process regions
          const processedRegions = response.data.regions?.map(region => ({
            ...region,
            id: region._id,
            type: 'region',
            displayName: region.regionName,
            parentName: region.masteredCountryId?.countryName || 'Unknown Country',
            status: region.active ? 'Active' : 'Inactive',
          })) || [];
          
          // Set state
          setCities(processedCities);
          setDivisions(processedDivisions);
          setRegions(processedRegions);
          
          // Set initial filtered items based on active tab
          updateFilteredItems(tabValue, processedCities, processedDivisions, processedRegions, '');
        }
      } catch (error) {
        console.error('Error fetching geo hierarchy:', error);
        
        // Extract more detailed error message if available
        let errorMessage = error.message;
        if (error.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error('Server error response:', error.response.data);
          errorMessage = error.response.data.error || error.response.data.details || error.response.statusText;
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. Please check if backend is running.';
        }
        
        alert(`Failed to fetch geo hierarchy: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoHierarchy();
  }, [currentApp.id, tabValue]);

  // Update filtered items when tab changes
  const updateFilteredItems = (tab, citiesData = cities, divisionsData = divisions, regionsData = regions, search = searchTerm) => {
    const term = search.toLowerCase();
    
    switch (tab) {
      case 0: // Cities
        setFilteredItems(
          citiesData.filter(item => 
            item.displayName.toLowerCase().includes(term) ||
            item.parentName.toLowerCase().includes(term) ||
            item.regionName.toLowerCase().includes(term) ||
            item.countryName.toLowerCase().includes(term)
          )
        );
        break;
      case 1: // Divisions
        setFilteredItems(
          divisionsData.filter(item => 
            item.displayName.toLowerCase().includes(term) ||
            item.parentName.toLowerCase().includes(term) ||
            item.countryName.toLowerCase().includes(term)
          )
        );
        break;
      case 2: // Regions
        setFilteredItems(
          regionsData.filter(item => 
            item.displayName.toLowerCase().includes(term) ||
            item.parentName.toLowerCase().includes(term)
          )
        );
        break;
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    updateFilteredItems(newValue);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    updateFilteredItems(tabValue, cities, divisions, regions, term);
  };

  // Handle edit button click
  const handleEditItem = (item) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  // Handle delete item
  const handleDeleteItem = async (item) => {
    try {
      // Get confirmation
      if (!window.confirm(`Are you sure you want to delete the ${item.type} "${item.displayName}"?\nThis action cannot be undone.`)) {
        return;
      }
      
      setLoading(true);
      
      // Delete the item using the API - use currentApp.id
      const deleteResponse = await axios.delete(`/api/geo-hierarchy/${item.type}/${item.id}?appId=${currentApp.id}`);
      console.log('Delete response:', deleteResponse.data);
      
      // Force a delay before refreshing to allow server-side propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the geo hierarchy - simplified query to get all items
      console.log(`Refreshing ALL geo hierarchy data for AppId: ${currentApp.id} after deletion`);
      const response = await axios.get(`/api/geo-hierarchy?type=all&appId=${currentApp.id}`);
      
      if (response.data) {
        // Update state based on the type of deleted item
        if (item.type === 'city') {
          const processedCities = response.data.cities?.map(city => ({
            ...city,
            id: city._id,
            type: 'city',
            displayName: city.cityName,
            parentName: city.masteredDivisionId?.divisionName || 'Unknown Division',
            regionName: city.masteredDivisionId?.masteredRegionId?.regionName || 'Unknown Region',
            countryName: city.masteredDivisionId?.masteredRegionId?.masteredCountryId?.countryName || 'Unknown Country',
            status: city.isActive ? 'Active' : 'Inactive',
            latitude: city.latitude,
            longitude: city.longitude,
          })) || [];
          setCities(processedCities);
          updateFilteredItems(tabValue, processedCities, divisions, regions);
        } else if (item.type === 'division') {
          const processedDivisions = response.data.divisions?.map(division => ({
            ...division,
            id: division._id,
            type: 'division',
            displayName: division.divisionName,
            parentName: division.masteredRegionId?.regionName || 'Unknown Region',
            countryName: division.masteredRegionId?.masteredCountryId?.countryName || 'Unknown Country',
            status: division.active ? 'Active' : 'Inactive',
          })) || [];
          setDivisions(processedDivisions);
          updateFilteredItems(tabValue, cities, processedDivisions, regions);
        } else if (item.type === 'region') {
          const processedRegions = response.data.regions?.map(region => ({
            ...region,
            id: region._id,
            type: 'region',
            displayName: region.regionName,
            parentName: region.masteredCountryId?.countryName || 'Unknown Country',
            status: region.active ? 'Active' : 'Inactive',
          })) || [];
          setRegions(processedRegions);
          updateFilteredItems(tabValue, cities, divisions, processedRegions);
        }
      }
      
      alert(`${item.type} deleted successfully!`);
    } catch (error) {
      console.error(`Error deleting ${item.type}:`, error);
      
      // Extract more detailed error message if available
      let errorMessage = error.message;
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error('Server error response:', error.response.data);
        errorMessage = error.response.data.error || error.response.data.details || error.response.statusText;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server. Please check if backend is running.';
      }
      
      alert(`Error deleting ${item.type}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for DataGrid - Cities
  const cityColumns = [
    { field: 'displayName', headerName: 'City Name', flex: 1 },
    { field: 'parentName', headerName: 'Division', flex: 1 },
    { field: 'regionName', headerName: 'Region', flex: 1 },
    { field: 'countryName', headerName: 'Country', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => handleEditItem(params.row)}
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => handleDeleteItem(params.row)}
            startIcon={<DeleteIcon />}
            size="small"
          >
            Delete
          </Button>
        </Box>
      ) 
    },
  ];

  // Define columns for DataGrid - Divisions
  const divisionColumns = [
    { field: 'displayName', headerName: 'Division Name', flex: 1 },
    { field: 'parentName', headerName: 'Region', flex: 1 },
    { field: 'countryName', headerName: 'Country', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => handleEditItem(params.row)}
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => handleDeleteItem(params.row)}
            startIcon={<DeleteIcon />}
            size="small"
          >
            Delete
          </Button>
        </Box>
      ) 
    },
  ];

  // Define columns for DataGrid - Regions
  const regionColumns = [
    { field: 'displayName', headerName: 'Region Name', flex: 1 },
    { field: 'parentName', headerName: 'Country', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => handleEditItem(params.row)}
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => handleDeleteItem(params.row)}
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
        <Typography variant="h4">Geo Hierarchy Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => alert('Add geo hierarchy item feature coming soon!')}
        >
          Add Item
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Cities" />
          <Tab label="Divisions" />
          <Tab label="Regions" />
        </Tabs>
        
        <TextField
          placeholder="Search geo hierarchy..."
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
              rows={filteredItems}
              columns={cityColumns}
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
              rows={filteredItems}
              columns={divisionColumns}
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
              rows={filteredItems}
              columns={regionColumns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      {/* Edit Dialog - Will be implemented in future */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Edit {editingItem?.type}</DialogTitle>
        <DialogContent>
          <Typography>Edit functionality coming soon!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}