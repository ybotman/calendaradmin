'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchBar from '@/components/common/SearchBar';
import AllOrganizersTab from './tabs/AllOrganizersTab';
import ActiveOrganizersTab from './tabs/ActiveOrganizersTab';
import InactiveOrganizersTab from './tabs/InactiveOrganizersTab';
import OrganizerEditDialog from './dialogs/OrganizerEditDialog';
import OrganizerCreateDialog from './dialogs/OrganizerCreateDialog';
import ImportDialog from './import/ImportDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { OrganizerProvider, useOrganizerContext } from '../context/OrganizerContext';
import useOrganizerData from '../hooks/useOrganizerData';
import useOrganizerFilters from '../hooks/useOrganizerFilters';
import useImport from '../hooks/useImport';
import { useAppContext } from '@/lib/AppContext';

/**
 * Inner component for Organizer Management page
 * 
 * @returns {JSX.Element} OrganizerPageContent component
 */
function OrganizerPageContent() {
  const { currentApp } = useAppContext();
  const { 
    tabValue, 
    searchTerm, 
    dispatch,
    importedOrganizers,
    importResults
  } = useOrganizerContext();
  
  // State for confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [organizerToDelete, setOrganizerToDelete] = useState(null);
  
  // Custom hooks
  const { fetchOrganizers, updateOrganizer, createOrganizer, deleteOrganizer } = useOrganizerData(currentApp.id);
  const { setTabValue, setSearchTerm } = useOrganizerFilters();
  const { 
    openImportDialog, 
    closeImportDialog,
    fetchBTCOrganizers,
    selectAllOrganizers,
    selectOrganizer,
    selectNewOnly,
    processImport
  } = useImport(currentApp.id);
  
  // Load organizers on mount
  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);
  
  // Handle tab change
  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, [setTabValue]);
  
  // Handle search input change
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, [setSearchTerm]);
  
  // Handle edit organizer button click
  const handleEditOrganizer = useCallback((organizer) => {
    dispatch({ type: 'SET_EDITING_ORGANIZER', payload: organizer });
  }, [dispatch]);
  
  // Handle add organizer button click
  const handleAddOrganizer = useCallback(() => {
    dispatch({ type: 'SET_CREATE_DIALOG_OPEN', payload: true });
  }, [dispatch]);
  
  // Handle delete organizer button click
  const handleDeleteOrganizer = useCallback((organizer) => {
    setOrganizerToDelete(organizer);
    setConfirmDialogOpen(true);
  }, []);
  
  // Handle confirm delete organizer
  const handleConfirmDelete = useCallback(async () => {
    if (!organizerToDelete) return;
    
    try {
      await deleteOrganizer(organizerToDelete);
      alert('Organizer deleted successfully!');
    } catch (error) {
      console.error('Error deleting organizer:', error);
      alert(`Error deleting organizer: ${error.message}`);
    } finally {
      setOrganizerToDelete(null);
      setConfirmDialogOpen(false);
    }
  }, [organizerToDelete, deleteOrganizer]);
  
  // Handle opening the import dialog
  const handleImportOrganizers = useCallback(() => {
    openImportDialog();
    fetchBTCOrganizers();
  }, [openImportDialog, fetchBTCOrganizers]);
  
  // Update organizer
  const handleUpdateOrganizer = useCallback(async (updatedOrganizer) => {
    try {
      await updateOrganizer(updatedOrganizer);
      alert('Organizer updated successfully!');
      return updatedOrganizer;
    } catch (error) {
      console.error('Error updating organizer:', error);
      throw error;
    }
  }, [updateOrganizer]);
  
  // Create organizer
  const handleCreateOrganizer = useCallback(async (newOrganizer) => {
    try {
      const createdOrganizer = await createOrganizer(newOrganizer);
      alert('Organizer created successfully!');
      return createdOrganizer;
    } catch (error) {
      console.error('Error creating organizer:', error);
      let errorMessage = error.message;
      
      if (error.response && error.response.data) {
        errorMessage = error.response.data.details || error.response.data.error || error.message;
      }
      
      alert(`Error creating organizer: ${errorMessage}`);
      throw error;
    }
  }, [createOrganizer]);
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Organizer Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleImportOrganizers}
          >
            Import from BTC
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddOrganizer}
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
        
        <SearchBar
          placeholder="Search organizers..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>
      
      {/* Tab Panels */}
      <AllOrganizersTab 
        value={tabValue} 
        index={0} 
        onEditOrganizer={handleEditOrganizer} 
        onDeleteOrganizer={handleDeleteOrganizer}
      />
      
      <ActiveOrganizersTab 
        value={tabValue} 
        index={1} 
        onEditOrganizer={handleEditOrganizer} 
        onDeleteOrganizer={handleDeleteOrganizer}
      />
      
      <InactiveOrganizersTab 
        value={tabValue} 
        index={2} 
        onEditOrganizer={handleEditOrganizer} 
        onDeleteOrganizer={handleDeleteOrganizer}
      />
      
      {/* Dialogs */}
      <OrganizerEditDialog onUpdateOrganizer={handleUpdateOrganizer} />
      <OrganizerCreateDialog onCreateOrganizer={handleCreateOrganizer} appId={currentApp.id} />
      <ImportDialog
        onClose={closeImportDialog}
        onFetchBTCOrganizers={fetchBTCOrganizers}
        onSelectAllOrganizers={selectAllOrganizers}
        onSelectOrganizer={selectOrganizer}
        onSelectNewOnly={selectNewOnly}
        onProcessImport={processImport}
        importedOrganizers={importedOrganizers}
        importResults={importResults}
      />
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Organizer"
        message={`Are you sure you want to delete the organizer "${organizerToDelete?.displayName}"?
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
 * @returns {JSX.Element} OrganizerPage component
 */
export default function OrganizerPage() {
  return (
    <OrganizerProvider>
      <OrganizerPageContent />
    </OrganizerProvider>
  );
}