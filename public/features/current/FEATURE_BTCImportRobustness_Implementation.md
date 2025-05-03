# FEATURE_3001_BTCImportRobustness_Implementation

## Technical Analysis

After investigating the BTC import functionality, I've identified several issues that cause imports to stop prematurely:

1. **Authentication Failures**: The logs show 401 errors with "No token provided" messages, indicating authentication issues when creating events.

2. **Entity Resolution Failures**: Venues, organizers, and categories often fail to resolve, preventing event creation.

3. **API Validation Errors**: Errors like "Cast to ObjectId failed" indicate data format issues between the mapped event and API expectations.

4. **Error Handling Design**: The current implementation stops processing after encountering errors instead of continuing with remaining events.

## Implementation Approach

### 1. Enhance Error Handling in `btc-import.js`

The main issue is in `processSingleDayImport()` where event processing should continue even when individual events fail. Current implementation stops at various error points. We need to:

- Wrap individual event processing in try/catch blocks
- Track success/failure for each event independently
- Continue with remaining events even when some fail

### 2. Improve API Route Feedback

The `/api/events/import-btc` route currently returns a mock response. We need to:

- Implement actual BTC import functionality via the module
- Return detailed progress information including:
  - Number of events attempted/successful/failed
  - Specific errors encountered
  - Partially processed data

### 3. Enhance UI Feedback in `BtcImportTab.js`

The UI needs to provide:

- Real-time progress updates
- Clear indication of partial success
- Detailed error reporting per event
- Retry options for failed events

## Implementation Details

### Updated btc-import.js (Key Changes)

```javascript
// Modified processSingleDayImport function to handle partial failures
async function processSingleDayImport(date) {
  // ...existing setup...
  
  try {
    // Step 1: Fetch events from BTC
    const btcEvents = await fetchBtcEvents(date);
    results.btcEvents.total = btcEvents.length;
    
    if (btcEvents.length === 0) {
      // Handle empty case as before
    }
    
    // Step 2: Delete existing events for the date
    try {
      results.ttEvents.deleted = await deleteEventsForDate(date);
    } catch (deleteError) {
      ErrorLogger.logSystemError(
        `Failed to delete existing events for date: ${date}, continuing with import`,
        ImportStage.LOADING,
        { date },
        deleteError
      );
      // Continue with import even if delete fails
    }
    
    // Step 3: Process each BTC event independently
    const processedEvents = [];
    const failedEvents = [];
    
    for (const btcEvent of btcEvents) {
      try {
        // Process individual event with its own try/catch
        const eventResult = await processIndividualEvent(btcEvent, config.dryRun);
        
        // Update counters based on result
        results.btcEvents.processed++;
        if (eventResult.success) {
          processedEvents.push(eventResult.data);
          results.ttEvents.created++;
          results.entityResolution.success++;
          results.validation.valid++;
        } else {
          failedEvents.push(eventResult.data);
          results.ttEvents.failed++;
          if (eventResult.failureStage === 'entity_resolution') {
            results.entityResolution.failure++;
          } else if (eventResult.failureStage === 'validation') {
            results.entityResolution.success++;
            results.validation.invalid++;
          }
        }
      } catch (eventError) {
        // Log but continue with next event
        failedEvents.push({
          btcId: btcEvent.id,
          title: btcEvent.title,
          stage: 'processing',
          error: eventError.message
        });
        
        results.ttEvents.failed++;
        results.btcEvents.processed++;
      }
    }
    
    // Save processed and failed events as before
    
    return results;
  } catch (error) {
    // Handle catastrophic errors
  }
}

// New helper function to process individual events
async function processIndividualEvent(btcEvent, dryRun) {
  try {
    // Resolve entities
    const resolvedEntities = await resolveEventEntities(btcEvent);
    
    if (!resolvedEntities.resolved) {
      return {
        success: false,
        failureStage: 'entity_resolution',
        data: {
          btcId: btcEvent.id,
          title: btcEvent.title,
          stage: 'entity_resolution',
          errors: resolvedEntities.errors
        }
      };
    }
    
    // Map to TT format
    const ttEvent = mapBtcEventToTt(btcEvent, resolvedEntities);
    
    // Validate
    const validationResult = validateTtEvent(ttEvent);
    
    if (!validationResult.valid) {
      return {
        success: false,
        failureStage: 'validation',
        data: {
          btcId: btcEvent.id,
          title: btcEvent.title,
          stage: 'validation',
          errors: validationResult.errors
        }
      };
    }
    
    // Create event
    const createdEvent = await createEvent(ttEvent);
    
    // Check if API error occurred (for non-dry-runs)
    if (!dryRun && createdEvent.apiError) {
      return {
        success: false,
        failureStage: 'api',
        data: {
          btcId: btcEvent.id,
          title: btcEvent.title,
          stage: 'api',
          error: createdEvent.apiError
        }
      };
    }
    
    return {
      success: true,
      data: {
        btcId: btcEvent.id,
        ttId: createdEvent._id,
        title: btcEvent.title,
        dryRun
      }
    };
  } catch (error) {
    return {
      success: false,
      failureStage: 'processing',
      data: {
        btcId: btcEvent.id,
        title: btcEvent.title,
        stage: 'processing',
        error: error.message
      }
    };
  }
}
```

### Updated API Route (Key Changes)

```javascript
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { startDate, endDate, dryRun = true } = body;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'Missing required parameters: startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    // Get authentication token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    // Set environment variables for btc-import.js
    process.env.AUTH_TOKEN = token;
    process.env.DRY_RUN = String(dryRun);
    process.env.TEST_DATE = startDate; // For single day import
    
    // Run the import process using the actual module
    try {
      const importModule = await import('../../../../../../../btc-import.js');
      const result = await importModule.processSingleDayImport(startDate);
      
      // Add go/no-go assessment
      const assessment = importModule.performGoNoGoAssessment(result);
      
      // Return enhanced results with assessment
      return NextResponse.json({
        ...result,
        assessment,
        // Additional metadata for UI
        progressTracking: {
          totalSteps: 4, // Extract, Entity Resolution, Validation, Create
          completedSteps: 4,
          currentStatus: 'Complete'
        }
      });
    } catch (importError) {
      console.error('Import process error:', importError);
      
      return NextResponse.json(
        { 
          message: 'Error during import process', 
          error: importError.message,
          partialResults: importError.partialResults || null
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Log the error
    console.error('Error in BTC import API:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        message: 'Error importing events', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
```

### Enhanced BtcImportTab.js UI (Key Changes)

```jsx
// Additional state variables
const [progress, setProgress] = useState(null);
const [failedEvents, setFailedEvents] = useState([]);
const [retryMode, setRetryMode] = useState(false);
const [retryList, setRetryList] = useState([]);

// Enhanced import function with progress tracking
const handleImport = async () => {
  // ... existing validation ...
  
  setLoading(true);
  setError(null);
  setSuccess(null);
  setImportResults(null);
  setProgress({ current: 0, total: 100, phase: 'Initializing' });
  setFailedEvents([]);
  
  try {
    // Make the API request
    const response = await fetch('/api/events/import-btc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        startDate: startDateStr,
        endDate: endDateStr,
        dryRun,
        appId: '1'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Check for partial results even on error
      if (errorData.partialResults) {
        setImportResults(errorData.partialResults);
        if (errorData.partialResults.ttEvents?.failed > 0) {
          setFailedEvents(errorData.partialResults.failedEvents || []);
        }
      }
      
      throw new Error(errorData.message || 'Failed to import events');
    }
    
    const result = await response.json();
    
    // Set success message with more details
    setSuccess(
      result.ttEvents.created > 0 
        ? `Import ${dryRun ? '(Dry Run) ' : ''}completed with ${result.ttEvents.created} events created${result.ttEvents.failed > 0 ? ` and ${result.ttEvents.failed} failures` : '.'}`
        : `Import completed but no events were ${dryRun ? 'eligible for creation' : 'created'}.`
    );
    
    setImportResults(result);
    
    // Set failed events for potential retry
    if (result.ttEvents.failed > 0 && result.failedEvents) {
      setFailedEvents(result.failedEvents);
    }
  } catch (err) {
    setError(err.message || 'An error occurred during import');
  } finally {
    setLoading(false);
    setProgress(null);
  }
};

// New retry function
const handleRetry = async () => {
  // Implementation for retrying failed events
};

// Enhanced results display component
const EnhancedResultsDisplay = ({ results, failedEvents }) => {
  // Detailed UI for showing results with retry options
};
```

## Testing Plan

1. Test with a date range containing a mix of valid and invalid events
2. Test with authentication failures
3. Test with entity resolution failures
4. Test with API validation failures
5. Test the retry mechanism for failed events

## Success Criteria

- Import process continues even when some events fail
- UI clearly shows which events succeeded and which failed
- Users can retry failed events without restarting the entire import
- Detailed error information is available for troubleshooting