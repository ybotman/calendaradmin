'use client';

import { useState } from 'react';
import { 
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BackupIcon from '@mui/icons-material/Backup';
import BtcOrganizerTab from './BtcOrganizerTab';

/**
 * BTC Event Import tab component for importing events from Boston Tango Calendar
 */
const BtcImportTab = () => {
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Tab panel component
  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`btc-import-tabpanel-${index}`}
        aria-labelledby={`btc-import-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ pt: 2 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };
  
  // If on organizer tab, render the organizer component
  if (currentTab === 1) {
    return (
      <Box>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Boston Tango Calendar Import</Typography>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="BTC Import tabs">
            <Tab label="Events Import" />
            <Tab label="Organizers Log" />
          </Tabs>
        </Paper>
        
        <TabPanel value={currentTab} index={1}>
          <BtcOrganizerTab />
        </TabPanel>
      </Box>
    );
  }
  
  // For events tab, continue with the original component
  // State for import parameters
  const [afterEqualDate, setAfterEqualDate] = useState(null);
  const [beforeEqualDate, setBeforeEqualDate] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [dryRun, setDryRun] = useState(true);
  
  // State for import status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [progress, setProgress] = useState(null); // Track import progress
  
  // Function to handle import
  const handleImport = async () => {
    // Validate input
    if (!afterEqualDate) {
      setError('Start date is required');
      return;
    }
    
    if (!beforeEqualDate) {
      setError('End date is required');
      return;
    }
    
    if (!authToken) {
      setError('Authentication token is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setImportResults(null);
    setProgress({ step: 'initializing', message: 'Starting import process...' });
    
    try {
      // Sanitize token to ISO-8859-1 compatible
      let cleanToken = authToken.normalize('NFKC').replace(/[^\x00-\xFF]/g, '');
      if (cleanToken !== authToken) {
        console.warn('Authentication token contained non-ISO-8859-1 characters; sanitized.');
      }

      // Format dates for API
      const startDateStr = afterEqualDate.toISOString().split('T')[0];
      const endDateStr = beforeEqualDate.toISOString().split('T')[0];
      
      // Make the API request
      const response = await fetch('/api/events/import-btc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify({
          startDate: startDateStr,
          endDate: endDateStr,
          dryRun,
          appId: '1' // Default app ID
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import events');
      }
      
      const result = await response.json();
      
      // Set success message and results
      const eventCount = result.btcEvents?.total || 0;
      const createdCount = result.ttEvents?.created || 0;
      const failedCount = result.ttEvents?.failed || 0;
      
      setSuccess(dryRun 
        ? `Dry run completed successfully. Found ${eventCount} events that would be processed. No events were created.` 
        : `Import completed successfully. Created ${createdCount} events${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`);
      setImportResults(result);
    } catch (err) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };
  
  // Function to handle clear
  const handleClear = () => {
    setAfterEqualDate(null);
    setBeforeEqualDate(null);
    setAuthToken('');
    setDryRun(true);
    setError(null);
    setSuccess(null);
    setImportResults(null);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Boston Tango Calendar Import</Typography>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="BTC Import tabs" sx={{ mb: 3 }}>
          <Tab label="Events Import" />
          <Tab label="Organizers Log" />
        </Tabs>
        
        <TabPanel value={currentTab} index={0}>
          <Typography variant="subtitle1" gutterBottom>Import Events from Boston Tango Calendar</Typography>
        
        <Grid container spacing={3}>
          {/* Date Filters */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Date Range</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Specify the date range for events to import. This filters based on event start date.
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <DatePicker
                  label="From Date (Inclusive)"
                  value={afterEqualDate}
                  onChange={setAfterEqualDate}
                  slotProps={{
                    textField: { 
                      fullWidth: true,
                      size: "small",
                      required: true
                    }
                  }}
                />
                
                <DatePicker
                  label="To Date (Inclusive)"
                  value={beforeEqualDate}
                  onChange={setBeforeEqualDate}
                  slotProps={{
                    textField: { 
                      fullWidth: true,
                      size: "small",
                      required: true
                    }
                  }}
                />
              </Box>
            </Box>
          </Grid>
          
          {/* Authentication */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Authentication</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Provide a valid Firebase authentication token for the import operation.
              </Typography>
              
              <TextField
                label="Authentication Token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                fullWidth
                size="small"
                required
                type="password"
                sx={{ mt: 2 }}
              />
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Import Options */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Import Options</Typography>
          
          <FormControlLabel
            control={
              <Switch 
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                color="primary"
              />
            }
            label="Dry Run (no actual data changes)"
          />
          
          <Typography variant="body2" color="text.secondary">
            When enabled, the import will run without creating or modifying any events.
            Use this to verify the import process before making actual changes.
          </Typography>
        </Box>
        
        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleImport}
            disabled={loading || !afterEqualDate || !beforeEqualDate || !authToken}
            startIcon={loading ? <CircularProgress size={18} /> : (dryRun ? <UploadFileIcon /> : <BackupIcon />)}
          >
            {loading ? 'Importing...' : (dryRun ? 'Run Dry Import' : 'Run Actual Import')}
          </Button>
        </Box>
          </TabPanel>
      </Paper>
      
      {/* Results and Error Display */}
      {currentTab === 0 && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Import Error</AlertTitle>
          {error}
          {importResults && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Partial Results:</Typography>
              <Typography variant="body2">
                {importResults.btcEvents?.processed || 0} events processed out of {importResults.btcEvents?.total || 0} found.
              </Typography>
              {importResults.ttEvents?.created > 0 && (
                <Typography variant="body2">
                  {importResults.ttEvents.created} events successfully created.
                </Typography>
              )}
              {importResults.ttEvents?.failed > 0 && (
                <Typography variant="body2">
                  {importResults.ttEvents.failed} events failed to import.
                </Typography>
              )}
            </Box>
          )}
        </Alert>
      )}
      
      {progress && loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Import In Progress</AlertTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>{progress.message || 'Processing import...'}</Typography>
          </Box>
        </Alert>
      )}
      
      {currentTab === 0 && success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Import Successful</AlertTitle>
          {success}
        </Alert>
      )}
      
      {currentTab === 0 && importResults && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Import Results</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Summary</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography>
                  <strong>Date Range:</strong> {importResults.dateRange?.start} to {importResults.dateRange?.end}
                </Typography>
                <Typography>
                  <strong>BTC Events Found:</strong> {importResults.btcEvents?.total || 0}
                </Typography>
                <Typography>
                  <strong>Events Processed:</strong> {importResults.btcEvents?.processed || 0}
                </Typography>
                <Typography>
                  <strong>Import Time:</strong> {importResults.duration?.toFixed(2) || 0} seconds
                </Typography>
                {importResults.dates && importResults.dates.length > 0 && (
                  <Typography>
                    <strong>Dates Processed:</strong> {importResults.dates.length}
                  </Typography>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Metrics</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography>
                  <strong>Entity Resolution Success:</strong> {importResults.entityResolution?.success || 0} 
                  ({importResults.btcEvents?.total ? ((importResults.entityResolution?.success / importResults.btcEvents?.total) * 100).toFixed(1) : 0}%)
                </Typography>
                <Typography>
                  <strong>Validation Success:</strong> {importResults.validation?.valid || 0}
                  ({importResults.entityResolution?.success ? ((importResults.validation?.valid / importResults.entityResolution?.success) * 100).toFixed(1) : 0}%)
                </Typography>
                <Typography>
                  <strong>Events Created:</strong> {importResults.ttEvents?.created || 0}
                </Typography>
                <Typography>
                  <strong>Failed Events:</strong> {importResults.ttEvents?.failed || 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Assessment */}
          {importResults.assessment && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1">Import Assessment</Typography>
              <Alert 
                severity={importResults.assessment.canProceed ? "success" : "warning"}
                sx={{ mt: 1 }}
              >
                <AlertTitle>
                  {importResults.assessment.canProceed ? "GO ✅" : "NO-GO ❌"}
                </AlertTitle>
                
                {importResults.assessment.recommendations && importResults.assessment.recommendations.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Recommendations:</Typography>
                    <ul style={{ marginTop: 4 }}>
                      {importResults.assessment.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Alert>
            </Box>
          )}
          
          {/* Detailed Results (if available) */}
          {importResults.dates && importResults.dates.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1">Import Details</Typography>
              
              <Box sx={{ mt: 1 }}>
                {importResults.dates.map((dateResult, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2">
                      Date: {dateResult.date}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2">
                          <strong>Events Found:</strong> {dateResult.results.btcEvents?.total || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2">
                          <strong>Created:</strong> {dateResult.results.ttEvents?.created || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2">
                          <strong>Failed:</strong> {dateResult.results.ttEvents?.failed || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2">
                          <strong>Duration:</strong> {dateResult.results.duration?.toFixed(2) || 0}s
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    {/* Failed Events Detail Section */}
                    {dateResult.results.ttEvents?.failed > 0 && dateResult.results.failedEvents && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Failed Events ({dateResult.results.ttEvents.failed})
                        </Typography>
                        
                        <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                          {dateResult.results.failedEvents.map((failedEvent, idx) => (
                            <Box key={idx} sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1, fontSize: '0.875rem' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {failedEvent.title} (Failure Stage: {failedEvent.stage})
                              </Typography>
                              
                              <Grid container spacing={1} sx={{ mt: 1 }}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                    Source Data:
                                  </Typography>
                                  {failedEvent.source && (
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                      <li>Venue: {failedEvent.source.venue}</li>
                                      <li>Organizer: {failedEvent.source.organizer}</li>
                                      <li>Categories: {failedEvent.source.categories}</li>
                                    </Box>
                                  )}
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                    Failure Reason:
                                  </Typography>
                                  {failedEvent.stage === 'entity_resolution' && (
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                      {!failedEvent.resolution?.venueResolved && (
                                        <li>Venue not resolved</li>
                                      )}
                                      {!failedEvent.resolution?.organizerResolved && (
                                        <li>Organizer not resolved</li>
                                      )}
                                      {!failedEvent.resolution?.categoryResolved && (
                                        <li>Category not resolved</li>
                                      )}
                                      {!failedEvent.resolution?.geographyResolved && (
                                        <li>Venue geography not resolved</li>
                                      )}
                                    </Box>
                                  )}
                                  {failedEvent.stage === 'validation' && (
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                      {!failedEvent.validation?.hasRequiredFields && (
                                        <li>Missing required fields</li>
                                      )}
                                      {!failedEvent.validation?.hasValidDates && (
                                        <li>Date format or range issues</li>
                                      )}
                                      {!failedEvent.validation?.hasValidReferences && (
                                        <li>Invalid reference fields</li>
                                      )}
                                    </Box>
                                  )}
                                  {failedEvent.stage === 'processing' && (
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                      <li>{failedEvent.error}</li>
                                    </Box>
                                  )}
                                </Grid>
                              </Grid>
                              
                              {/* Detailed Errors */}
                              {failedEvent.errors && failedEvent.errors.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" fontWeight="bold" color="error">
                                    Specific Errors:
                                  </Typography>
                                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                    {failedEvent.errors.map((err, errIdx) => (
                                      <li key={errIdx}>{err}</li>
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </LocalizationProvider>
  );
};

export default BtcImportTab;