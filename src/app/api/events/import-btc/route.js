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
 * Function to validate a JWT token - basic format check
 * @param {string} token - The JWT token to validate
 * @returns {boolean} - Whether the token is valid
 */
function isTokenFormatValid(token) {
  // Basic token format validation (three parts separated by dots)
  const tokenParts = token.split('.');
  return tokenParts.length === 3 && 
         tokenParts[0].length > 0 && 
         tokenParts[1].length > 0 && 
         tokenParts[2].length > 0;
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
          error: 'Missing or invalid Authorization header'
        },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    // Validate token format
    if (!isTokenFormatValid(token)) {
      return NextResponse.json(
        { 
          message: 'Invalid token format', 
          success: false,
          error: 'Token does not appear to be a valid JWT'
        },
        { status: 401 }
      );
    }
    
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
      
      // Try to capture any partial results
      let partialResults = null;
      try {
        // If there were partial results in a file, try to read them
        const partialResultsPath = path.join(outputDir, `import-results-${startDate}.json`);
        if (fs.existsSync(partialResultsPath)) {
          const partialResultsData = fs.readFileSync(partialResultsPath, 'utf8');
          partialResults = JSON.parse(partialResultsData);
        }
      } catch (partialResultsError) {
        console.warn('Could not read partial results:', partialResultsError.message);
      }
      
      // Log detailed error information
      const errorDetail = {
        timestamp: new Date().toISOString(),
        error: importError.message,
        stack: importError.stack,
        parameters: {
          startDate,
          endDate,
          dryRun,
          appId
        }
      };
      
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const errorPath = path.join(outputDir, `import-error-${timestamp}.json`);
        fs.writeFileSync(errorPath, JSON.stringify(errorDetail, null, 2));
      } catch (errorLogError) {
        console.warn('Could not log detailed error:', errorLogError.message);
      }
      
      return NextResponse.json(
        { 
          message: 'Error during import process', 
          error: importError.message,
          partialResults: partialResults,
          success: false
        },
        { status: 500 }
      );
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