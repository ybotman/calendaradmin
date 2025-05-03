# FEATURE_3002_VenueGeolocationValidation_Implementation (COMPLETED)

## API Endpoint Implementation

### 1. Create Validation Endpoint
Create a new API route at `/api/venues/validate-geo` that will:

```javascript
// /src/app/api/venues/validate-geo/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';

// Base URL for the API
const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

export async function POST(request) {
  try {
    const body = await request.json();
    const { venueIds, appId = '1', batchSize = 10 } = body;
    
    // Validate request
    if (!venueIds || !Array.isArray(venueIds) || venueIds.length === 0) {
      return NextResponse.json(
        { error: 'venueIds array is required' },
        { status: 400 }
      );
    }
    
    // Process venues in batches to respect API limits
    const results = {
      validated: 0,
      invalid: 0,
      failed: 0,
      details: []
    };
    
    // Process venues in batches
    const batches = [];
    for (let i = 0; i < venueIds.length; i += batchSize) {
      batches.push(venueIds.slice(i, i + batchSize));
    }
    
    // Process each batch with a delay to respect rate limits
    for (let i = 0; i < batches.length; i++) {
      const batchResults = await processBatch(batches[i], appId);
      
      // Merge results
      results.validated += batchResults.validated;
      results.invalid += batchResults.invalid;
      results.failed += batchResults.failed;
      results.details = [...results.details, ...batchResults.details];
      
      // Add delay between batches if not the last batch
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing venue validation:', error);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Unknown server error';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// Process a batch of venues
async function processBatch(venueIds, appId) {
  const batchResults = {
    validated: 0,
    invalid: 0,
    failed: 0,
    details: []
  };
  
  for (const venueId of venueIds) {
    try {
      // 1. Fetch venue details
      const venueResponse = await axios.get(`${BE_URL}/api/venues/${venueId}?appId=${appId}`);
      const venue = venueResponse.data;
      
      if (!venue) {
        batchResults.failed++;
        batchResults.details.push({
          venueId,
          status: 'failed',
          reason: 'Venue not found'
        });
        continue;
      }
      
      // 2. Check if venue has coordinates
      if (!venue.latitude || !venue.longitude) {
        // Update venue with invalid flag
        await axios.put(`${BE_URL}/api/venues/${venueId}?appId=${appId}`, {
          ...venue,
          isValidVenueGeolocation: false,
          appId
        });
        
        batchResults.invalid++;
        batchResults.details.push({
          venueId,
          venueName: venue.name,
          status: 'invalid',
          reason: 'Missing coordinates'
        });
        continue;
      }
      
      // 3. Validate coordinates by finding nearest city
      const cityResponse = await axios.get(`${BE_URL}/api/venues/nearest-city`, {
        params: {
          appId,
          longitude: venue.longitude,
          latitude: venue.latitude,
          limit: 1
        }
      });
      
      // 4. Check if nearest city was found within a reasonable distance (5km)
      const MAX_DISTANCE_KM = 5;
      const isValid = cityResponse.data && 
                      cityResponse.data.length > 0 && 
                      cityResponse.data[0].distanceInKm <= MAX_DISTANCE_KM;
      
      // 5. Update venue with validation result
      await axios.put(`${BE_URL}/api/venues/${venueId}?appId=${appId}`, {
        ...venue,
        isValidVenueGeolocation: isValid,
        appId
      });
      
      if (isValid) {
        batchResults.validated++;
        batchResults.details.push({
          venueId,
          venueName: venue.name,
          status: 'valid',
          cityId: cityResponse.data[0]._id,
          cityName: cityResponse.data[0].cityName,
          distanceKm: cityResponse.data[0].distanceInKm
        });
      } else {
        batchResults.invalid++;
        batchResults.details.push({
          venueId,
          venueName: venue.name,
          status: 'invalid',
          reason: cityResponse.data && cityResponse.data.length > 0 
            ? `Too far from nearest city (${cityResponse.data[0].distanceInKm.toFixed(2)}km)` 
            : 'No nearby city found'
        });
      }
    } catch (error) {
      console.error(`Error validating venue ${venueId}:`, error);
      
      batchResults.failed++;
      batchResults.details.push({
        venueId,
        status: 'failed',
        reason: error.message
      });
    }
  }
  
  return batchResults;
}
```

## Venue Management UI Updates

### 1. Add Validation Status to Venue List

Add validation status column to the venue DataGrid in `src/app/dashboard/venues/page.js`:

```javascript
// Add to columns array in DataGrid
{ 
  field: 'isValidVenueGeolocation', 
  headerName: 'Geo Valid', 
  width: 120,
  renderCell: (params) => {
    if (!params.row) return <Chip label="Unknown" size="small" />;
    
    const isValid = Boolean(params.row?.isValidVenueGeolocation);
    return (
      <Chip 
        label={isValid ? 'Valid' : 'Invalid'} 
        color={isValid ? 'success' : 'error'}
        size="small"
      />
    );
  }
},
```

### 2. Add Batch Validation Button to Venue Management UI

```javascript
// Add to the actions area in the Venue Management UI
<Box sx={{ display: 'flex', gap: 2 }}>
  <Button 
    variant="outlined" 
    color="secondary" 
    onClick={handleBatchValidate}
    startIcon={<LocationSearchingIcon />}
  >
    Validate Geolocations
  </Button>
  <Button 
    variant="outlined" 
    color="secondary" 
    onClick={() => handleImportVenues()}
  >
    Import from BTC
  </Button>
  <Button 
    variant="contained" 
    color="primary" 
    startIcon={<AddIcon />}
    onClick={handleAddVenue}
  >
    Add Venue
  </Button>
</Box>
```

### 3. Implement Batch Validation Function

```javascript
// Add to the VenuesPage component
const [validating, setValidating] = useState(false);
const [validationProgress, setValidationProgress] = useState(0);
const [validationResults, setValidationResults] = useState(null);
const [validationDialogOpen, setValidationDialogOpen] = useState(false);

// Function to handle batch validation
const handleBatchValidate = async () => {
  try {
    setValidating(true);
    setValidationDialogOpen(true);
    setValidationProgress(0);
    setValidationResults(null);
    
    // Get all venue IDs for the current filter
    let allVenueIds = [];
    
    // If there's a search term, use the currently displayed venues
    if (searchTerm) {
      allVenueIds = venues.map(venue => venue._id || venue.id);
    } else {
      // Otherwise, fetch all venue IDs (optional limit)
      const response = await axios.get('/api/venues', {
        params: {
          appId: currentApp.id,
          limit: 1000, // Adjust based on expected venue count
          fields: '_id,name' // Only get required fields
        }
      });
      
      if (response.data && response.data.data) {
        allVenueIds = response.data.data.map(venue => venue._id || venue.id);
      }
    }
    
    // Confirm with user about the number of venues to validate
    if (allVenueIds.length === 0) {
      alert('No venues found to validate.');
      setValidating(false);
      setValidationDialogOpen(false);
      return;
    }
    
    // Process venues in batches of 10
    const BATCH_SIZE = 10;
    let processedCount = 0;
    let results = {
      validated: 0,
      invalid: 0,
      failed: 0,
      details: []
    };
    
    // Process in smaller chunks to show progress
    for (let i = 0; i < allVenueIds.length; i += BATCH_SIZE) {
      const batchIds = allVenueIds.slice(i, i + BATCH_SIZE);
      
      const batchResponse = await axios.post('/api/venues/validate-geo', {
        venueIds: batchIds,
        appId: currentApp.id,
        batchSize: BATCH_SIZE
      });
      
      // Update progress
      processedCount += batchIds.length;
      setValidationProgress(Math.round((processedCount / allVenueIds.length) * 100));
      
      // Merge results
      if (batchResponse.data) {
        results.validated += batchResponse.data.validated;
        results.invalid += batchResponse.data.invalid;
        results.failed += batchResponse.data.failed;
        results.details = [...results.details, ...batchResponse.data.details];
      }
    }
    
    // Set final results
    setValidationResults(results);
    
    // Refresh venue list to show updated validation status
    fetchVenues();
  } catch (error) {
    console.error('Error during batch validation:', error);
    alert(`Validation process error: ${error.message}`);
  } finally {
    setValidating(false);
  }
};
```

### 4. Add Validation Dialog Component

```javascript
{/* Validation Dialog */}
<Dialog
  open={validationDialogOpen}
  onClose={() => {
    if (!validating) {
      setValidationDialogOpen(false);
    }
  }}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>Validate Venue Geolocations</DialogTitle>
  <DialogContent>
    {validating ? (
      <Box sx={{ my: 2 }}>
        <Typography variant="body1" gutterBottom>
          Validating venue geolocations...
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={validationProgress} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${validationProgress}%`}</Typography>
          </Box>
        </Box>
      </Box>
    ) : validationResults ? (
      <Box sx={{ my: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Validation completed!
        </Alert>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ bgcolor: 'success.light', px: 2, py: 1, borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Valid: {validationResults.validated}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'error.light', px: 2, py: 1, borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Invalid: {validationResults.invalid}
            </Typography>
          </Box>
          {validationResults.failed > 0 && (
            <Box sx={{ bgcolor: 'warning.light', px: 2, py: 1, borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                Failed: {validationResults.failed}
              </Typography>
            </Box>
          )}
        </Box>
        
        {validationResults.details && validationResults.details.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Results Details
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Venue</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults.details.map((detail, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{detail.venueName || detail.venueId}</TableCell>
                      <TableCell>
                        {detail.status === 'valid' ? (
                          <Chip label="Valid" size="small" color="success" />
                        ) : detail.status === 'invalid' ? (
                          <Chip label="Invalid" size="small" color="error" />
                        ) : (
                          <Chip label="Failed" size="small" color="warning" />
                        )}
                      </TableCell>
                      <TableCell>
                        {detail.status === 'valid' 
                          ? `Near ${detail.cityName} (${detail.distanceKm.toFixed(2)}km)`
                          : detail.reason
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    ) : (
      <Box sx={{ my: 2 }}>
        <Typography variant="body1" gutterBottom>
          This process will validate the geolocation data for all venues matching your current search criteria.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The system will:
          <ul>
            <li>Check if venues have valid latitude and longitude coordinates</li>
            <li>Verify if coordinates match to a known city within 5km</li>
            <li>Update each venue's validation status</li>
          </ul>
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          This process may take time depending on the number of venues. You can close this dialog after validation starts, and the process will continue in the background.
        </Alert>
      </Box>
    )}
  </DialogContent>
  <DialogActions>
    {validating ? (
      <Button disabled>
        Validating...
      </Button>
    ) : (
      <>
        <Button onClick={() => setValidationDialogOpen(false)}>
          Close
        </Button>
        {!validationResults && (
          <Button 
            onClick={handleBatchValidate} 
            variant="contained" 
            color="primary"
          >
            Start Validation
          </Button>
        )}
      </>
    )}
  </DialogActions>
</Dialog>
```

## Entity Resolution Updates

### 1. Update getVenueGeography function in entity-resolution.js

```javascript
// Update the getVenueGeography function in entity-resolution.js to set the validation flag
export async function getVenueGeography(venueId) {
  // Existing code...
  
  try {
    const response = await axios.get(`${API_BASE_URL}/venues/${venueId}?appId=${APP_ID}`);
    
    if (response.data) {
      const venue = response.data;
      
      // Ensure proper GeoJSON format for venue geolocation
      let venueGeolocation;
      if (venue.geolocation) {
        // Process geolocation as in existing code...
      } else {
        // Default coordinates as in existing code...
      }
      
      // Create full GeoJSON Point object for city geolocation
      let cityGeolocation;
      // Existing city geolocation code...
      
      // Determine if the venue's geolocation is valid
      let isValidVenueGeolocation = false;
      
      // Check if we have a nearby city (within 5km)
      if (venue.latitude && venue.longitude) {
        try {
          // Try to find the nearest city for validation
          const cityResponse = await axios.get(`${API_BASE_URL}/venues/nearest-city`, {
            params: {
              appId: APP_ID,
              longitude: venue.longitude,
              latitude: venue.latitude,
              limit: 1
            }
          });
          
          if (cityResponse.data && 
              cityResponse.data.length > 0 && 
              cityResponse.data[0].distanceInKm <= 5) {
            isValidVenueGeolocation = true;
            
            // If we're here, we've confirmed valid geolocation - update the venue
            try {
              await axios.put(`${API_BASE_URL}/venues/${venueId}?appId=${APP_ID}`, {
                ...venue,
                isValidVenueGeolocation: true,
                appId: APP_ID
              });
              console.log(`Updated venue ${venueId} with valid geolocation flag`);
            } catch (updateError) {
              console.error(`Failed to update venue ${venueId} validation status:`, updateError.message);
            }
          }
        } catch (cityError) {
          console.error(`Error validating venue ${venueId} location:`, cityError.message);
        }
      }
      
      return {
        venueGeolocation: venueGeolocation,
        masteredCityId: venue.masteredCityId?._id || venue.masteredCityId,
        masteredCityName: venue.masteredCityId?.cityName || venue.city,
        masteredDivisionId: venue.masteredDivisionId?._id || venue.masteredDivisionId,
        masteredDivisionName: venue.masteredDivisionId?.divisionName || venue.state,
        masteredRegionId: venue.masteredRegionId?._id || venue.masteredRegionId,
        masteredRegionName: venue.masteredRegionId?.regionName || "Unknown Region",
        masteredCityGeolocation: cityGeolocation,
        isValidVenueGeolocation: isValidVenueGeolocation
      };
    }
    return null;
  } catch (error) {
    console.error(`Error getting venue geography for ${venueId}:`, error.message);
    return null;
  }
}
```

## BTC Import Integration

### 1. Update processImport function in venues/page.js

```javascript
// Add validation during import in venues/page.js processImport function
// Within the venue creation loop, after getting nearest city:

// Update venue object with validation status
if (venue.latitude && venue.longitude && nearestCity) {
  venue.isValidVenueGeolocation = nearestCity.distanceInKm <= 5;
  console.log(`Setting venue ${venue.name} validation: ${venue.isValidVenueGeolocation} (${nearestCity.distanceInKm}km)`);
} else {
  venue.isValidVenueGeolocation = false;
}
```

## Testing Plan

1. **API Endpoint Testing**
   - Test with valid venue IDs with good coordinates
   - Test with venue IDs that have missing coordinates
   - Test with venues that are far from any city
   - Test with batch sizes to ensure rate limiting works

2. **UI Testing**
   - Verify validation status displays correctly
   - Confirm batch validation works with progress updates
   - Check that results are displayed accurately
   - Ensure the list refreshes after validation

3. **Import Testing**
   - Verify imported venues get validation status
   - Test with venues with and without coordinates
   - Confirm rate limiting during large imports