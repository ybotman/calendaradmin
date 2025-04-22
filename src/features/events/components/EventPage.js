'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Paper,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchBar from '@/components/common/SearchBar';
import AllEventsTab from './tabs/AllEventsTab';
import ActiveEventsTab from './tabs/ActiveEventsTab';
import InactiveEventsTab from './tabs/InactiveEventsTab';
import FeaturedEventsTab from './tabs/FeaturedEventsTab';
import EventFilterPanel from './EventFilterPanel';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { EventProvider, useEventContext } from '../context/EventContext';
import useEventData from '../hooks/useEventData';
import useEventFilters from '../hooks/useEventFilters';
import { useAppContext } from '@/lib/AppContext';

/**
 * Inner component for Event Management page
 * 
 * @returns {JSX.Element} EventPageContent component
 */
function EventPageContent() {
  const { currentApp } = useAppContext();
  const { 
    tabValue, 
    searchTerm, 
    searchDescriptionTerm,
    dispatch,
    dateRange,
    selectedGeoFilter,
    selectedOrganizerShortname,
    selectedVenue,
    selectedCategory,
    showImages
  } = useEventContext();
  
  // State for confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  
  // Custom hooks
  const { fetchEvents, updateEvent, createEvent, deleteEvent } = useEventData(currentApp.id);
  const { 
    setTabValue, 
    setSearchTerm,
    setSearchDescriptionTerm,
    setDateRange,
    setGeoFilter,
    setOrganizerFilter,
    setVenueFilter,
    setCategoryFilter,
    toggleImageDisplay
  } = useEventFilters();
  
  // Check if we have all required filters to load events
  const canLoadEvents = Boolean(
    dateRange.startDate && 
    dateRange.endDate && 
    (selectedGeoFilter.regionName || selectedGeoFilter.divisionName || selectedGeoFilter.cityName)
  );
  
  // Load events when filters change if we have required filters
  useEffect(() => {
    if (canLoadEvents) {
      const filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        regionName: selectedGeoFilter.regionName,
        divisionName: selectedGeoFilter.divisionName,
        cityName: selectedGeoFilter.cityName,
        organizerId: selectedOrganizerShortname,
        venue: selectedVenue,
        category: selectedCategory
      };
      
      fetchEvents(filters);
    }
  }, [
    canLoadEvents,
    fetchEvents, 
    dateRange, 
    selectedGeoFilter, 
    selectedOrganizerShortname,
    selectedVenue,
    selectedCategory
  ]);
  
  // Handle tab change
  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, [setTabValue]);
  
  // Handle search input changes
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, [setSearchTerm]);
  
  const handleDescriptionSearchChange = useCallback((event) => {
    setSearchDescriptionTerm(event.target.value);
  }, [setSearchDescriptionTerm]);
  
  // Handle edit event button click
  const handleEditEvent = useCallback((event) => {
    dispatch({ type: 'SET_EDITING_EVENT', payload: event });
  }, [dispatch]);
  
  // Handle view event details
  const handleViewEvent = useCallback((event) => {
    // For now, just edit - we can replace with a view-only dialog later
    dispatch({ type: 'SET_EDITING_EVENT', payload: event });
  }, [dispatch]);
  
  // Handle add event button click
  const handleAddEvent = useCallback(() => {
    dispatch({ type: 'SET_CREATE_DIALOG_OPEN', payload: true });
  }, [dispatch]);
  
  // Handle delete event button click
  const handleDeleteEvent = useCallback((event) => {
    setEventToDelete(event);
    setConfirmDialogOpen(true);
  }, []);
  
  // Handle confirm delete event
  const handleConfirmDelete = useCallback(async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteEvent(eventToDelete);
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Error deleting event: ${error.message}`);
    } finally {
      setEventToDelete(null);
      setConfirmDialogOpen(false);
    }
  }, [eventToDelete, deleteEvent]);
  
  // Handle toggling image display
  const handleToggleImages = useCallback((event) => {
    toggleImageDisplay(event.target.name);
  }, [toggleImageDisplay]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Event Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddEvent}
          disabled={!canLoadEvents}
        >
          Add Event
        </Button>
      </Box>
      
      {/* Filter Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
        <EventFilterPanel 
          dateRange={dateRange}
          selectedGeoFilter={selectedGeoFilter}
          selectedOrganizerShortname={selectedOrganizerShortname}
          selectedVenue={selectedVenue}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          searchDescriptionTerm={searchDescriptionTerm}
          onDateRangeChange={setDateRange}
          onGeoFilterChange={setGeoFilter}
          onOrganizerChange={setOrganizerFilter}
          onVenueChange={setVenueFilter}
          onCategoryChange={setCategoryFilter}
          onSearchChange={handleSearchChange}
          onDescriptionSearchChange={handleDescriptionSearchChange}
        />
      </Paper>
      

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Events" />
          <Tab label="Active" />
          <Tab label="Inactive" />
          <Tab label="Featured" />
        </Tabs>
      </Box>
      
      
      {!canLoadEvents ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Please select a date range and location to view events
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Tab Panels */}
          <AllEventsTab 
            value={tabValue} 
            index={0} 
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent}
            onViewEvent={handleViewEvent}
            imageFlags={showImages}
          />
          
          <ActiveEventsTab 
            value={tabValue} 
            index={1} 
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent}
            onViewEvent={handleViewEvent}
            imageFlags={showImages}
          />
          
          <InactiveEventsTab 
            value={tabValue} 
            index={2} 
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent}
            onViewEvent={handleViewEvent}
            imageFlags={showImages}
          />
          
          <FeaturedEventsTab 
            value={tabValue} 
            index={3} 
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent}
            onViewEvent={handleViewEvent}
            imageFlags={showImages}
          />
        </>
      )}
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"?
          \nThis action cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
}

/**
 * Wrapper component that provides context
 * 
 * @returns {JSX.Element} EventPage component
 */
export default function EventPage() {
  return (
    <EventProvider>
      <EventPageContent />
    </EventProvider>
  );
}