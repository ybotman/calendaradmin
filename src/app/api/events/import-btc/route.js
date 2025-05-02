// API route for importing events from Boston Tango Calendar
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { processSingleDayImport, performGoNoGoAssessment } from '../../../../../btc-import.js';

// Simple error logging function
const logError = (message, error) => {
  console.error(message, error);
};

/**
 * Function to validate a JWT token with enhanced validation
 * @param {string} token - The JWT token to validate
 * @returns {object} - Validation result with status and details
 */
function validateToken(token) {
  const result = {
    isValid: false,
    details: {
      format: false,
      expiration: null, // We can't fully validate expiration without decoding
      structureValid: false
    },
    reason: ''
  };
  
  // Check if token is provided
  if (!token) {
    result.reason = 'No token provided';
    return result;
  }
  
  // Check if token has valid format (three parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    result.reason = 'Invalid token format: token must have 3 parts';
    return result;
  }
  
  // Check if each part has content
  if (!tokenParts[0] || !tokenParts[1] || !tokenParts[2]) {
    result.reason = 'Invalid token format: empty token part';
    return result;
  }
  
  result.details.format = true;
  
  // Try to decode the payload (middle part) to check structure
  try {
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    // Check for critical JWT fields
    if (!payload.iat) {
      result.details.structureValid = false;
      result.reason = 'Token missing "iat" (issued at) claim';
      return result;
    }
    
    // Check if token has exp claim (for expiration)
    if (payload.exp) {
      const expirationDate = new Date(payload.exp * 1000); // Convert to milliseconds
      const now = new Date();
      result.details.expiration = {
        expiresAt: expirationDate.toISOString(),
        isExpired: expirationDate < now
      };
      
      // If token is expired, mark as invalid
      if (result.details.expiration.isExpired) {
        result.reason = 'Token expired';
        return result;
      }
    }
    
    // Additional structural checks
    if (!payload.sub && !payload.userId && !payload.user_id) {
      console.warn('Token missing subject/user identifier - this is unusual');
    }
    
    // If we got here, token format is valid
    result.details.structureValid = true;
    result.isValid = true;
    return result;
    
  } catch (error) {
    // Error decoding payload
    result.reason = `Error decoding token payload: ${error.message}`;
    return result;
  }
}

/**
 * Creates an output directory for import results if it doesn't exist
 * @returns {string} - The path to the output directory
 */
function ensureOutputDirectory() {
  const outputDir = path.join(process.cwd(), 'import-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Handles the POST request to import events from BTC
 * @param {Request} request - The HTTP request
 * @returns {NextResponse} - The HTTP response
 */
export async function POST(request) {
  // Ensure the output directory exists
  const outputDir = ensureOutputDirectory();
  
  try {
    // Parse request body
    const body = await request.json();
    const { startDate, endDate, dryRun = true, appId = '1' } = body;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          message: 'Missing required parameters: startDate and endDate are required',
          success: false
        },
        { status: 400 }
      );
    }
    
    // Get authentication token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          message: 'Authentication token is required', 
          success: false,
          error: 'Missing or invalid Authorization header',
          details: {
            headerPresent: !!authHeader,
            bearerFormat: authHeader ? authHeader.startsWith('Bearer ') : false
          }
        },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    // Enhanced token validation
    const tokenValidation = validateToken(token);
    
    if (!tokenValidation.isValid) {
      return NextResponse.json(
        { 
          message: 'Invalid authentication token', 
          success: false,
          error: tokenValidation.reason,
          details: tokenValidation.details
        },
        { status: 401 }
      );
    }
    
    // Log token information for debugging (without sensitive data)
    console.log(`Using token with validated format. Expiration: ${
      tokenValidation.details.expiration 
        ? tokenValidation.details.expiration.expiresAt 
        : 'Not specified'
    }`);
    
    
    // Set environment variables for btc-import.js
    process.env.AUTH_TOKEN = token;
    process.env.DRY_RUN = String(dryRun);
    process.env.APP_ID = appId;
    process.env.OUTPUT_DIR = outputDir;
    
    try {
      // Process each date in the range
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Track overall results
      const overallResults = {
        dateRange: {
          start: startDate,
          end: endDate
        },
        btcEvents: {
          total: 0,
          processed: 0
        },
        entityResolution: {
          success: 0,
          failure: 0
        },
        validation: {
          valid: 0,
          invalid: 0
        },
        ttEvents: {
          deleted: 0,
          created: 0,
          failed: 0
        },
        dryRun: dryRun,
        duration: 0,
        dates: [],
        startTime: new Date().toISOString(),
        endTime: null,
        success: true
      };
      
      // Only process the start date initially for simplicity
      // In a future enhancement, we could process the entire date range
      const currentDate = startDateObj.toISOString().split('T')[0];
      
      // Run the import process for the current date
      console.log(`Processing import for date: ${currentDate}`);
      const dateResults = await processSingleDayImport(currentDate);
      
      // Aggregate results
      overallResults.btcEvents.total += dateResults.btcEvents.total;
      overallResults.btcEvents.processed += dateResults.btcEvents.processed;
      overallResults.entityResolution.success += dateResults.entityResolution.success;
      overallResults.entityResolution.failure += dateResults.entityResolution.failure;
      overallResults.validation.valid += dateResults.validation.valid;
      overallResults.validation.invalid += dateResults.validation.invalid;
      overallResults.ttEvents.deleted += dateResults.ttEvents.deleted;
      overallResults.ttEvents.created += dateResults.ttEvents.created;
      overallResults.ttEvents.failed += dateResults.ttEvents.failed;
      overallResults.duration += dateResults.duration;
      
      // Get the failed events from the output directory
      try {
        const failedEventsPath = path.join(outputDir, `failed-events-${currentDate}.json`);
        if (fs.existsSync(failedEventsPath)) {
          const failedEventsData = fs.readFileSync(failedEventsPath, 'utf8');
          dateResults.failedEvents = JSON.parse(failedEventsData);
        }
      } catch (readError) {
        console.error('Failed to read failed events file:', readError);
        // Continue anyway - this is non-critical
      }
      
      // Add date-specific results
      overallResults.dates.push({
        date: currentDate,
        results: dateResults
      });
      
      // Complete the results
      overallResults.endTime = new Date().toISOString();
      
      // Perform Go/No-Go assessment on overall results
      const assessment = performGoNoGoAssessment(overallResults);
      
      // Save the overall results for later analysis
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsPath = path.join(outputDir, `combined-results-${timestamp}.json`);
        fs.writeFileSync(
          resultsPath, 
          JSON.stringify({...overallResults, assessment}, null, 2)
        );
      } catch (saveError) {
        console.warn('Could not save combined results:', saveError.message);
        // Non-critical, continue
      }
      
      // Return combined results with assessment
      return NextResponse.json({
        ...overallResults,
        assessment,
        // Additional metadata for UI
        progressTracking: {
          totalDates: 1, // Currently only processing the start date
          completedDates: 1,
          currentStatus: 'Complete'
        }
      });
    } catch (importError) {
      console.error('Import process error:', importError);
      
      // Comprehensive error recovery strategy
      // 1. Try to capture any partial results
      let partialResults = null;
      let failedEvents = [];
      let unmatchedEntities = null;
      
      try {
        // Check for partial result files
        const partialResultFiles = {
          results: path.join(outputDir, `import-results-${startDate}.json`),
          failedEvents: path.join(outputDir, `failed-events-${startDate}.json`),
          unmatchedEntities: path.join(outputDir, `unmatched-entities-${startDate}.json`)
        };
        
        // Load partial results if available
        if (fs.existsSync(partialResultFiles.results)) {
          const partialResultsData = fs.readFileSync(partialResultFiles.results, 'utf8');
          partialResults = JSON.parse(partialResultsData);
          console.log(`Found partial results for date ${startDate}`);
        }
        
        // Load failed events if available
        if (fs.existsSync(partialResultFiles.failedEvents)) {
          const failedEventsData = fs.readFileSync(partialResultFiles.failedEvents, 'utf8');
          failedEvents = JSON.parse(failedEventsData);
          console.log(`Found ${failedEvents.length} failed events for date ${startDate}`);
        }
        
        // Load unmatched entities if available
        if (fs.existsSync(partialResultFiles.unmatchedEntities)) {
          const unmatchedEntitiesData = fs.readFileSync(partialResultFiles.unmatchedEntities, 'utf8');
          unmatchedEntities = JSON.parse(unmatchedEntitiesData);
          console.log(`Found unmatched entities report for date ${startDate}`);
        }
      } catch (partialResultsError) {
        console.warn('Could not read partial results files:', partialResultsError.message);
      }
      
      // 2. Determine error type for better client-side handling
      const errorInfo = {
        type: 'unknown',
        phase: 'unknown',
        recoverable: false,
        timestamp: new Date().toISOString()
      };
      
      // Try to determine the error type and phase
      if (importError.message.includes('Authentication') || importError.message.includes('auth') || importError.message.includes('token')) {
        errorInfo.type = 'authentication';
        errorInfo.phase = 'api_access';
        errorInfo.recoverable = true; // Can be recovered with a new token
      } else if (importError.message.includes('network') || importError.message.includes('ECONNREFUSED') || importError.message.includes('timeout')) {
        errorInfo.type = 'network';
        errorInfo.phase = 'api_access';
        errorInfo.recoverable = true; // Can be recovered by retrying
      } else if (importError.message.includes('entity') || importError.message.includes('resolution')) {
        errorInfo.type = 'entity_resolution';
        errorInfo.phase = 'processing';
        errorInfo.recoverable = partialResults !== null; // Can be recovered if we have partial results
      } else if (importError.message.includes('validation')) {
        errorInfo.type = 'validation';
        errorInfo.phase = 'processing';
        errorInfo.recoverable = false; // Validation errors need code changes
      } else {
        errorInfo.type = 'processing';
        errorInfo.phase = importError.stage || 'unknown';
        errorInfo.recoverable = partialResults !== null; // Can be recovered if we have partial results
      }
      
      // 3. Create a comprehensive error report with as much diagnostic info as possible
      const errorDetail = {
        timestamp: errorInfo.timestamp,
        error: {
          message: importError.message,
          stack: importError.stack,
          type: errorInfo.type,
          phase: errorInfo.phase,
          recoverable: errorInfo.recoverable
        },
        parameters: {
          startDate,
          endDate,
          dryRun,
          appId
        },
        partialResults: {
          available: partialResults !== null,
          summary: partialResults ? {
            btcEventsTotal: partialResults.btcEvents?.total || 0,
            btcEventsProcessed: partialResults.btcEvents?.processed || 0,
            ttEventsCreated: partialResults.ttEvents?.created || 0,
            ttEventsFailed: partialResults.ttEvents?.failed || 0
          } : null
        },
        failedEvents: {
          count: failedEvents.length,
          categories: categorizeFailures(failedEvents)
        },
        unmatchedEntities: unmatchedEntities ? {
          venues: unmatchedEntities.venues?.length || 0,
          organizers: unmatchedEntities.organizers?.length || 0,
          categories: unmatchedEntities.categories?.length || 0
        } : null
      };
      
      // Save detailed error report
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const errorPath = path.join(outputDir, `import-error-${timestamp}.json`);
        fs.writeFileSync(errorPath, JSON.stringify(errorDetail, null, 2));
        console.log(`Saved detailed error report to ${errorPath}`);
      } catch (errorLogError) {
        console.warn('Could not log detailed error:', errorLogError.message);
      }
      
      // 4. Return a helpful response with recovery information
      return NextResponse.json(
        { 
          message: `Error during import process: ${errorInfo.type} error in ${errorInfo.phase} phase`, 
          error: importError.message,
          errorType: errorInfo.type,
          recoverable: errorInfo.recoverable,
          partialResults: partialResults ? {
            date: startDate,
            eventsProcessed: partialResults.btcEvents?.processed || 0,
            eventsCreated: partialResults.ttEvents?.created || 0,
            eventsFailed: partialResults.ttEvents?.failed || 0
          } : null,
          failedEventsCount: failedEvents.length,
          failureCategories: errorDetail.failedEvents.categories,
          retryRecommended: errorInfo.recoverable,
          success: false
        },
        { status: 500 }
      );
      
      // Helper function to categorize failures
      function categorizeFailures(failedEvents) {
        if (!failedEvents || !failedEvents.length) return {};
        
        const categories = {
          entity_resolution: 0,
          validation: 0,
          api_error: 0,
          other: 0
        };
        
        for (const event of failedEvents) {
          if (event.stage === 'entity_resolution') {
            categories.entity_resolution++;
          } else if (event.stage === 'validation') {
            categories.validation++;
          } else if (event.error && (event.error.includes('API') || event.error.includes('api'))) {
            categories.api_error++;
          } else {
            categories.other++;
          }
        }
        
        return categories;
      }
    }
  } catch (error) {
    // Log the error
    logError('Error in BTC import API:', error);
    
    // Save detailed error information
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorPath = path.join(outputDir, `api-error-${timestamp}.json`);
      fs.writeFileSync(
        errorPath, 
        JSON.stringify({
          timestamp,
          error: error.message,
          stack: error.stack
        }, null, 2)
      );
    } catch (errorLogError) {
      console.warn('Could not log detailed API error:', errorLogError.message);
    }
    
    // Return error response
    return NextResponse.json(
      { 
        message: 'Error importing events', 
        error: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}