'use client';

import { useState, useEffect } from 'react';
import { 
  Grid, 
  TextField, 
  MenuItem, 
  Button,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography
} from '@mui/material';
import SearchBar from '@/components/common/SearchBar';
import apiClient from '@/lib/api-client';
import { useAppContext } from '@/lib/AppContext';

/**
 * Component for filtering events
 * 
 * @param {Object} props - Component props
 * @returns {JSX.Element} EventFilterPanel component
 */
export default function EventFilterPanel({
  dateRange,
  selectedGeoFilter,
  selectedOrganizerShortname,
  selectedVenue,
  selectedCategory,
  searchTerm,
  searchDescriptionTerm,
  onDateRangeChange,
  onGeoFilterChange,
  onOrganizerChange,
  onVenueChange,
  onCategoryChange,
  onSearchChange,
  onDescriptionSearchChange
}) {
  const { currentApp } = useAppContext();
  
  // State for dropdown options
  const [regions, setRegions] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [cities, setCities] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Load initial data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch all geo-hierarchy data at once
        const response = await apiClient.get(`/api/geo-hierarchy?appId=${currentApp.id}`);
        const geoData = response.data;
        
        if (geoData) {
          // Extract regions from the returned data
          if (Array.isArray(geoData.regions)) {
            setRegions(geoData.regions);
          } else if (Array.isArray(geoData)) {
            // If it returned a direct array (might be the case based on the endpoint)
            setRegions(geoData);
          }
        }
        
        // Fetch organizers
        const organizersResponse = await apiClient.get(`/api/organizers?appId=${currentApp.id}`);
        setOrganizers(organizersResponse.data || []);
        
        // Set categories
        const categories = [
          { id: 'milonga', name: 'Milonga' },
          { id: 'workshop', name: 'Workshop' },
          { id: 'practica', name: 'Practica' },
          { id: 'festival', name: 'Festival' },
          { id: 'marathon', name: 'Marathon' },
          { id: 'concert', name: 'Concert' },
          { id: 'class', name: 'Class' }
        ];
        setCategories(categories);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, [currentApp.id]);
  
  // Load divisions when a region is selected
  useEffect(() => {
    const fetchDivisions = async () => {
      if (!selectedGeoFilter.regionName) {
        setDivisions([]);
        return;
      }
      
      try {
        const region = regions.find(r => r.regionName === selectedGeoFilter.regionName);
        if (!region) return;
        
        const response = await apiClient.get(
          `/api/geo-hierarchy?type=division&appId=${currentApp.id}`
        );
        
        // Filter divisions by the selected region
        const allDivisions = response.data || [];
        const filteredDivisions = allDivisions.filter(div => 
          div.masteredRegionId && 
          (div.masteredRegionId._id === region._id || 
           div.masteredRegionId === region._id)
        );
        
        setDivisions(filteredDivisions);
      } catch (error) {
        console.error('Error fetching divisions:', error);
      }
    };
    
    fetchDivisions();
  }, [selectedGeoFilter.regionName, regions, currentApp.id]);
  
  // Load cities when a division is selected
  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedGeoFilter.divisionName) {
        setCities([]);
        return;
      }
      
      try {
        const division = divisions.find(d => d.divisionName === selectedGeoFilter.divisionName);
        if (!division) return;
        
        const response = await apiClient.get(
          `/api/geo-hierarchy?type=city&appId=${currentApp.id}`
        );
        
        // Filter cities by the selected division
        const allCities = response.data || [];
        const filteredCities = allCities.filter(city => 
          city.masteredDivisionId && 
          (city.masteredDivisionId._id === division._id || 
           city.masteredDivisionId === division._id)
        );
        
        setCities(filteredCities);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    
    fetchCities();
  }, [selectedGeoFilter.divisionName, divisions, currentApp.id]);
  
  // Load venues when a region/city is selected
  useEffect(() => {
    const fetchVenues = async () => {
      if (!selectedGeoFilter.regionName) {
        setVenues([]);
        return;
      }
      
      try {
        let url = `/api/venues?appId=${currentApp.id}`;
        
        // Add geo filters to URL
        if (selectedGeoFilter.regionName) {
          url += `&masteredRegionName=${selectedGeoFilter.regionName}`;
        }
        
        if (selectedGeoFilter.divisionName) {
          url += `&masteredDivisionName=${selectedGeoFilter.divisionName}`;
        }
        
        if (selectedGeoFilter.cityName) {
          url += `&masteredCityName=${selectedGeoFilter.cityName}`;
        }
        
        const response = await apiClient.get(url);
        
        // Some venues don't have appropriate masteredCity/Region fields
        // Filter venues based on the response
        let filteredVenues = response.data || [];
        
        // If no venues found, try to fetch all venues
        if (!filteredVenues.length) {
          // Fallback to a more generic fetch
          const allVenuesResponse = await apiClient.get(`/api/venues?appId=${currentApp.id}`);
          filteredVenues = allVenuesResponse.data || [];
        }
        
        setVenues(filteredVenues);
      } catch (error) {
        console.error('Error fetching venues:', error);
      }
    };
    
    fetchVenues();
  }, [selectedGeoFilter, currentApp.id]);
  
  // Handle date range change
  const handleStartDateChange = (date) => {
    onDateRangeChange({
      ...dateRange,
      startDate: date
    });
  };
  
  const handleEndDateChange = (date) => {
    onDateRangeChange({
      ...dateRange,
      endDate: date
    });
  };
  
  // Handle geo filter changes
  const handleRegionChange = (event) => {
    onGeoFilterChange({
      regionName: event.target.value,
      divisionName: '',
      cityName: ''
    });
  };
  
  const handleDivisionChange = (event) => {
    onGeoFilterChange({
      ...selectedGeoFilter,
      divisionName: event.target.value,
      cityName: ''
    });
  };
  
  const handleCityChange = (event) => {
    onGeoFilterChange({
      ...selectedGeoFilter,
      cityName: event.target.value
    });
  };
  
  // Handle filter changes
  const handleOrganizerChange = (event) => {
    onOrganizerChange(event.target.value);
  };
  
  const handleVenueChange = (event) => {
    onVenueChange(event.target.value);
  };
  
  const handleCategoryChange = (event) => {
    onCategoryChange(event.target.value);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    onDateRangeChange({
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
    });
    onGeoFilterChange({
      regionName: '',
      divisionName: '',
      cityName: ''
    });
    onOrganizerChange('');
    onVenueChange('');
    onCategoryChange('');
  };
  
  return (
      <Grid container spacing={3}>
        {/* Column 1: Date Range */}
        <Grid item xs={12} sm={4} md={3}>
          <Typography variant="subtitle1" gutterBottom>Date Range</Typography>
          <TextField
            label="Start Date"
            type="date"
            value={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              handleStartDateChange(newDate);
            }}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            margin="normal"
          />
          <TextField
            label="End Date"
            type="date"
            value={dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              handleEndDateChange(newDate);
            }}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            margin="normal"
            inputProps={{
              min: dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : '',
            }}
          />
        </Grid>
        
        {/* Column 2: Region/Division/City Selection */}
        <Grid item xs={12} sm={4} md={3}>
          <Typography variant="subtitle1" gutterBottom>Location</Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel id="region-select-label">Region</InputLabel>
            <Select
              labelId="region-select-label"
              id="region-select"
              value={selectedGeoFilter.regionName}
              label="Region"
              onChange={handleRegionChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {regions.map((region) => (
                <MenuItem key={region._id || region.regionName} value={region.regionName}>
                  {region.regionName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal" disabled={!selectedGeoFilter.regionName}>
            <InputLabel id="division-select-label">Division</InputLabel>
            <Select
              labelId="division-select-label"
              id="division-select"
              value={selectedGeoFilter.divisionName}
              label="Division"
              onChange={handleDivisionChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {divisions.map((division) => (
                <MenuItem key={division._id || division.divisionName} value={division.divisionName}>
                  {division.divisionName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal" disabled={!selectedGeoFilter.divisionName}>
            <InputLabel id="city-select-label">City</InputLabel>
            <Select
              labelId="city-select-label"
              id="city-select"
              value={selectedGeoFilter.cityName}
              label="City"
              onChange={handleCityChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {cities.map((city) => (
                <MenuItem key={city._id || city.cityName} value={city.cityName}>
                  {city.cityName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Column 3: Organizer/Venue/Category Selection */}
        <Grid item xs={12} sm={4} md={3}>
          <Typography variant="subtitle1" gutterBottom>Event Details</Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel id="organizer-select-label">Organizer</InputLabel>
            <Select
              labelId="organizer-select-label"
              id="organizer-select"
              value={selectedOrganizerShortname}
              label="Organizer"
              onChange={handleOrganizerChange}
            >
              <MenuItem value="">
                <em>All Organizers</em>
              </MenuItem>
              {organizers.map((organizer) => (
                <MenuItem 
                  key={organizer._id} 
                  value={organizer._id}
                >
                  {organizer.name || organizer.shortName || organizer.displayName || organizer.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="venue-select-label">Venue</InputLabel>
            <Select
              labelId="venue-select-label"
              id="venue-select"
              value={selectedVenue}
              label="Venue"
              onChange={handleVenueChange}
            >
              <MenuItem value="">
                <em>All Venues</em>
              </MenuItem>
              {venues.map((venue) => (
                <MenuItem 
                  key={venue._id} 
                  value={venue._id}
                >
                  {venue.name || venue.venueName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              id="category-select"
              value={selectedCategory}
              label="Category"
              onChange={handleCategoryChange}
            >
              <MenuItem value="">
                <em>All Categories</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Column 4: Text Searches */}
        <Grid item xs={12} sm={12} md={3}>
          <Typography variant="subtitle1" gutterBottom>Text Searches</Typography>
          
          {/* Title Search */}
          <Typography variant="body2" sx={{ mt: 1 }}>Title Search:</Typography>
          <SearchBar
            placeholder="Search in titles (max 15 chars, min 3)"
            value={searchTerm}
            onChange={onSearchChange}
            fullWidth
            size="small"
            inputProps={{ maxLength: 15 }}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0, mb: 2, display: 'block' }}>
            Case-insensitive, auto-trimmed search in event titles
          </Typography>
          
          {/* Description Search */}
          <Typography variant="body2" sx={{ mt: 2 }}>Description Search:</Typography>
          <SearchBar
            placeholder="Search in descriptions (wildcard)"
            value={searchDescriptionTerm}
            onChange={onDescriptionSearchChange}
            fullWidth
            size="small"
            inputProps={{ maxLength: 20 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0, mb: 1, display: 'block' }}>
            Searches event descriptions with wildcard matching
          </Typography>
          
          {/* Reset Button */}
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleResetFilters}
              fullWidth
            >
              Reset All Filters
            </Button>
          </Box>
        </Grid>
      </Grid>
  );
}