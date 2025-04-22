'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useOrganizerContext } from '../../context/OrganizerContext';
import ImportTable from './ImportTable';
import ImportProgress from './ImportProgress';

/**
 * Dialog component for importing organizers from BTC
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback for closing the dialog
 * @param {Function} props.onFetchBTCOrganizers - Callback for fetching BTC organizers
 * @param {Function} props.onSelectAllOrganizers - Callback for selecting all organizers
 * @param {Function} props.onSelectOrganizer - Callback for selecting a single organizer
 * @param {Function} props.onSelectNewOnly - Callback for selecting only new organizers
 * @param {Function} props.onProcessImport - Callback for processing the import
 * @returns {JSX.Element} ImportDialog component
 */
export default function ImportDialog({
  onClose,
  onFetchBTCOrganizers,
  onSelectAllOrganizers,
  onSelectOrganizer,
  onSelectNewOnly,
  onProcessImport,
}) {
  const { 
    importDialogOpen, 
    importStatus, 
    fetchingBTCOrganizers,
    importedOrganizers,
    selectedOrganizers,
  } = useOrganizerContext();
  
  // Handle dialog close
  const handleClose = useCallback(() => {
    if (importStatus !== 'importing') {
      onClose();
    }
  }, [importStatus, onClose]);
  
  // Selected count
  const selectedCount = Object.values(selectedOrganizers).filter(v => v).length;
  
  return (
    <Dialog
      open={importDialogOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Import Organizers from BTC</DialogTitle>
      <DialogContent>
        {/* Loading state */}
        {(importStatus === 'loading' || fetchingBTCOrganizers) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Fetching organizers from BostonTangoCalendar...
            </Typography>
          </Box>
        )}
        
        {/* Error state */}
        {importStatus === 'error' && (
          <Alert severity="error" sx={{ my: 2 }}>
            Failed to fetch organizers. Please try again.
          </Alert>
        )}
        
        {/* Importing state */}
        {importStatus === 'importing' && (
          <ImportProgress />
        )}
        
        {/* Completed state */}
        {importStatus === 'complete' && (
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
        )}
        
        {/* Ready state - display the table */}
        {importStatus === 'ready' && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                Found {importedOrganizers.length} organizers from BostonTangoCalendar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {importedOrganizers.filter(o => o.isDuplicate).length} already exist in the system
              </Typography>
            </Box>
            
            <ImportTable
              onSelectAllOrganizers={onSelectAllOrganizers}
              onSelectOrganizer={onSelectOrganizer}
              onSelectNewOnly={onSelectNewOnly}
            />
            
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
        {/* Ready state actions */}
        {importStatus === 'ready' && (
          <>
            <Button 
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              onClick={onProcessImport} 
              variant="contained" 
              color="primary"
              disabled={selectedCount === 0}
            >
              Import Selected ({selectedCount})
            </Button>
          </>
        )}
        
        {/* Error or complete state actions */}
        {(importStatus === 'error' || importStatus === 'complete') && (
          <Button 
            onClick={handleClose} 
            variant="contained"
          >
            Close
          </Button>
        )}
        
        {/* Importing state actions */}
        {importStatus === 'importing' && (
          <Button disabled>
            Importing...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}