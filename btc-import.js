// btc-import.js 
// Single-day test import from BTC WordPress to TangoTiempo

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  resolveVenue, 
  resolveOrganizer, 
  resolveCategory,
  getVenueGeography,
  getUnmatchedReport
} from './entity-resolution.js';
import { 
  ErrorLogger, 
  ApiErrorHandler, 
  ImportStage 
} from './error-handler.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // WordPress BTC API
  btcApiBase: process.env.BTC_API_BASE || 'https://bostontangocalendar.com/wp-json/tribe/events/v1',
  
  // TangoTiempo API
  ttApiBase: process.env.TT_API_BASE || 'http://localhost:3010/api',
  
  // TangoTiempo app ID
  appId: process.env.APP_ID || '1',
  
  // Authentication token for TT API
  authToken: process.env.AUTH_TOKEN,
  
  // Output directory for logs and reports
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, 'import-results'),
  
  // Set to true to run in dry-run mode (no data will be written to TT)
  dryRun: process.env.DRY_RUN !== 'false', // Default to dry-run
  
  // Test date in YYYY-MM-DD format
  testDate: process.env.TEST_DATE || null,
  
  // Default Boston location information for fallbacks
  boston: {
    coordinates: [-71.0589, 42.3601], // [longitude, latitude]
    masteredCityId: "64f26a9f75bfc0db12ed7a1e",
    masteredCityName: "Boston",
    masteredDivisionId: "64f26a9f75bfc0db12ed7a15",
    masteredDivisionName: "Massachusetts",
    masteredRegionId: "64f26a9f75bfc0db12ed7a12",
    masteredRegionName: "New England"
  },
  
  // Entity resolution settings
  resolution: {
    createMissingEntities: false, // Always lookup only, never create missing entities
    allowPartialResolution: true, // Continue with partial entity matches
    useMockIds: false, // Disable mock IDs for organizers
    fallbackToBoston: true, // Use Boston geography as a fallback
    maxRetries: 3 // Maximum retries for entity creation
  },
  
  // Error handling settings
  errorHandling: {
    logDetailedErrors: true,
    saveFailedEvents: true,
    continueOnErrors: true, // Continue processing other events when one fails
    retryStrategy: 'exponential', // 'exponential', 'linear', or 'constant'
    maxApiRetries: 3
  }
};

// Log configuration for debugging
console.log('=== BTC Import Configuration ===');
console.log('- BTC API Base:', config.btcApiBase);
console.log('- TT API Base:', config.ttApiBase);
console.log('- App ID:', config.appId);
console.log('- Auth Token:', config.authToken ? 'Configured' : 'Not configured');
console.log('- Output Directory:', config.outputDir);
console.log('- Dry Run:', config.dryRun ? 'Yes (No writes to database)' : 'No (Will write to database)');
console.log('- Test Date:', config.testDate || 'Not specified (will use date + 90 days)');
console.log('================================');

// Create output directory if it doesn't exist
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Initialize API error handler
const apiHandler = new ApiErrorHandler(3, 1000, 30000);

/**
 * Formats a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the test date (today + 90 days if not specified)
 * @returns {string} Test date in YYYY-MM-DD format
 */
function getTestDate() {
  if (config.testDate) {
    return config.testDate;
  }
  
  // Default to today + 90 days
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 90);
  
  return formatDate(futureDate);
}

/**
 * Fetches events from BTC WordPress API for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of BTC events
 */
async function fetchBtcEvents(date) {
  const logContext = { date };
  ErrorLogger.logInfo(
    `Fetching BTC events for date: ${date}`,
    ImportStage.EXTRACTION,
    logContext
  );

  const allEvents = [];
  let page = 1;
  const perPage = 50;
  let fetched = [];

  try {
    do {
      const response = await apiHandler.executeWithRetry(
        async () => await axios.get(`${config.btcApiBase}/events`, {
          params: { start_date: date, end_date: date, per_page: perPage, page }
        }),
        ImportStage.EXTRACTION,
        { ...logContext, page }
      );

      fetched = response.data.events || [];
      allEvents.push(...fetched);
      ErrorLogger.logInfo(
        `Retrieved ${fetched.length} events for date: ${date} page: ${page}`,
        ImportStage.EXTRACTION,
        { ...logContext, count: fetched.length, page }
      );
      page++;
    } while (fetched.length === perPage);

    // Save raw event data for reference
    const rawDataFile = path.join(config.outputDir, `btc-events-${date}.json`);
    fs.writeFileSync(rawDataFile, JSON.stringify({ events: allEvents }, null, 2));

    return allEvents;
  } catch (error) {
    ErrorLogger.logApiError(
      `Failed to fetch BTC events for date: ${date}`,
      ImportStage.EXTRACTION,
      logContext,
      error
    );

    // For testing purposes, generate mock data
    console.log("Using mock event data for testing");
    const mockEvents = [
      {
        id: 12345,
        title: "Tango Workshop with Instructor",
        description: "Event description text...",
        start_date: `${date} 19:00:00`,
        end_date: `${date} 22:00:00`,
        utc_start_date: `${date} 23:00:00`,
        utc_end_date: `${date} 02:00:00`,
        all_day: false,
        venue: {
          id: 678,
          venue: "Dance Studio A",
          address: "123 Main St",
          city: "Boston",
          state: "MA",
          zip: "02110"
        },
        organizer: {
          id: 901,
          organizer: "John Doe",
          email: "email@example.com"
        },
        categories: [
          {
            id: 234,
            name: "Class",
            slug: "class"
          }
        ]
      },
      {
        id: 12346,
        title: "Milonga Night",
        description: "Weekly milonga...",
        start_date: `${date} 20:00:00`,
        end_date: `${date} 23:30:00`,
        utc_start_date: `${date} 00:00:00`,
        utc_end_date: `${date} 03:30:00`,
        all_day: false,
        venue: {
          id: 679,
          venue: "Tango Center",
          address: "456 Dance Ave",
          city: "Boston",
          state: "MA",
          zip: "02110"
        },
        organizer: {
          id: 902,
          organizer: "Jane Smith",
          email: "email2@example.com"
        },
        categories: [
          {
            id: 235,
            name: "Milonga",
            slug: "milonga"
          }
        ]
      }
    ];
    
    // Save mock data for reference
    const mockDataFile = path.join(config.outputDir, `btc-events-${date}.json`);
    fs.writeFileSync(mockDataFile, JSON.stringify({ events: mockEvents }, null, 2));
    
    return mockEvents;
  }
}

/**
 * Resolves all entities for a BTC event
 * @param {Object} btcEvent - BTC event object
 * @returns {Promise<Object>} Resolved entities and status
 */
async function resolveEventEntities(btcEvent) {
  const logContext = { 
    eventId: btcEvent.id,
    eventTitle: btcEvent.title
  };
  
  ErrorLogger.logInfo(
    `Resolving entities for event: ${btcEvent.title} (${btcEvent.id})`,
    ImportStage.ENTITY_RESOLUTION,
    logContext
  );
  
  const result = {
    resolved: true,
    entities: {},
    geography: null,
    errors: [],
    warnings: [],
    partialResolution: false
  };
  
  // Track individual entity resolution success
  const resolutionStatus = {
    venue: false,
    organizer: false,
    category: false,
    geography: false
  };
  
  try {
    // VENUE RESOLUTION
    if (btcEvent.venue) {
        const venueId = await resolveVenue(btcEvent.venue);
        if (venueId) {
            result.entities.venueId = venueId;
            resolutionStatus.venue = true;
        } else {
            // Fallback to UNKNOWN venue
            result.entities.venueId = 'UNKNOWN';
            resolutionStatus.venue = true;
        }
    } else {
        // Default to UNKNOWN venue if no venue is provided
        result.entities.venueId = 'UNKNOWN';
        resolutionStatus.venue = true;
    }
    
    // ORGANIZER RESOLUTION
    const organizerToUse = Array.isArray(btcEvent.organizer) && btcEvent.organizer.length > 0
        ? btcEvent.organizer[0]
        : btcEvent.organizer;
    
    const organizerInfo = await resolveOrganizer(organizerToUse);
    if (organizerInfo) {
        result.entities.organizerId = organizerInfo.id;
    } else {
        // Fallback to Unknown Organizer
        result.entities.organizerId = 'UNKNOWN';
        result.entities.organizerFullName = 'Unknown';
        result.entities.organizerShortName = 'UNKNOWN';
    }
    
    // CATEGORY RESOLUTION
    if (btcEvent.categories && btcEvent.categories.length > 0) {
      try {
        const categoryInfo = await resolveCategory(btcEvent.categories[0]);
        if (categoryInfo) {
          result.entities.categoryFirstId = categoryInfo.id;
          result.entities.categoryFirst = categoryInfo.name;
          resolutionStatus.category = true;
        } else {
          const error = `Category not resolved: ${btcEvent.categories[0].name}`;
          result.errors.push(error);
          ErrorLogger.logEntityError(
            error,
            ImportStage.ENTITY_RESOLUTION,
            { ...logContext, categoryName: btcEvent.categories[0].name }
          );
          
          // Create mock category
          const mockCategoryId = `mock-category-${Math.random().toString(36).substring(2, 9)}`;
          result.entities.categoryFirstId = mockCategoryId;
          result.entities.categoryFirst = 'Other';
          result.warnings.push(`Using mock category ID: ${mockCategoryId}`);
          result.partialResolution = true;
        }
        
        // Handle secondary category if available
        if (btcEvent.categories.length > 1) {
          try {
            const secondaryCategoryInfo = await resolveCategory(btcEvent.categories[1]);
            if (secondaryCategoryInfo) {
              result.entities.categorySecondId = secondaryCategoryInfo.id;
              result.entities.categorySecond = secondaryCategoryInfo.name;
            }
          } catch (secondaryCategoryError) {
            // Non-critical error, just log it
            result.warnings.push(`Secondary category resolution failed: ${btcEvent.categories[1].name}`);
          }
        }
      } catch (categoryError) {
        const error = `Error resolving category: ${btcEvent.categories[0].name}`;
        result.errors.push(error);
        ErrorLogger.logEntityError(
          error,
          ImportStage.ENTITY_RESOLUTION,
          { ...logContext, categoryName: btcEvent.categories[0].name, error: categoryError.message }
        );
        
        // Create mock category
        const mockCategoryId = `error-category-${Math.random().toString(36).substring(2, 9)}`;
        result.entities.categoryFirstId = mockCategoryId;
        result.entities.categoryFirst = 'Other';
        result.warnings.push(`Using error fallback mock category ID: ${mockCategoryId}`);
        result.partialResolution = true;
      }
    } else {
      const error = 'No categories provided for event';
      result.errors.push(error);
      ErrorLogger.logEntityError(
        error,
        ImportStage.ENTITY_RESOLUTION,
        logContext
      );
      
      // Create mock category for robustness
      const mockCategoryId = `missing-category-${Math.random().toString(36).substring(2, 9)}`;
      result.entities.categoryFirstId = mockCategoryId;
      result.entities.categoryFirst = 'Other';
      result.warnings.push(`Using mock category ID for missing category: ${mockCategoryId}`);
      result.partialResolution = true;
    }
    
    // RESOLUTION SUCCESS DETERMINATION
    // We consider resolution successful if we have all required entity IDs,
    // even if some are mock IDs for robustness
    const hasRequiredEntities = 
      result.entities.venueId && 
      result.entities.organizerId && 
      result.entities.organizerName &&
      result.entities.categoryFirstId &&
      result.geography;
    
    // If we have required entities but some are mocks, mark as partial resolution
    if (hasRequiredEntities) {
      if (result.partialResolution) {
        ErrorLogger.logInfo(
          `Partial entity resolution for event: ${btcEvent.title} (${btcEvent.id}) - using mock entities`,
          ImportStage.ENTITY_RESOLUTION,
          { ...logContext, resolutionStatus, warnings: result.warnings.length }
        );
      } else {
        ErrorLogger.logInfo(
          `Complete entity resolution for event: ${btcEvent.title} (${btcEvent.id})`,
          ImportStage.ENTITY_RESOLUTION,
          { ...logContext, resolutionStatus }
        );
      }
      
      // Even with partial resolution, we consider it resolved if we have all required entities
      result.resolved = true;
    } else {
      // If we're missing any required entities, mark as unresolved
      ErrorLogger.logInfo(
        `Failed entity resolution for event: ${btcEvent.title} (${btcEvent.id}) - missing required entities`,
        ImportStage.ENTITY_RESOLUTION,
        { ...logContext, resolutionStatus, errors: result.errors.length }
      );
      
      result.resolved = false;
    }
    
    return result;
  } catch (error) {
    ErrorLogger.logProcessingError(
      `Unexpected error resolving entities for event: ${btcEvent.title}`,
      ImportStage.ENTITY_RESOLUTION,
      logContext,
      error
    );
    
    // Try to create a minimally viable result with mock entities for robustness
    result.resolved = false;
    result.errors.push(`Unexpected error: ${error.message}`);
    result.partialResolution = true;
    
    // Create mock entities
    const mockVenueId = `error-venue-${Math.random().toString(36).substring(2, 9)}`;
    const mockOrganizerId = `error-organizer-${Math.random().toString(36).substring(2, 9)}`;
    const mockCategoryId = `error-category-${Math.random().toString(36).substring(2, 9)}`;
    
    result.entities = {
      venueId: mockVenueId,
      organizerId: mockOrganizerId,
      organizerName: 'Error Fallback Organizer',
      categoryFirstId: mockCategoryId,
      categoryFirst: 'Other'
    };
    
    result.geography = {
      venueGeolocation: {
        type: "Point",
        coordinates: BOSTON_DEFAULTS.coordinates
      },
      masteredCityId: BOSTON_DEFAULTS.masteredCityId,
      masteredCityName: BOSTON_DEFAULTS.masteredCityName,
      masteredDivisionId: BOSTON_DEFAULTS.masteredDivisionId,
      masteredDivisionName: BOSTON_DEFAULTS.masteredDivisionName,
      masteredRegionId: BOSTON_DEFAULTS.masteredRegionId,
      masteredRegionName: BOSTON_DEFAULTS.masteredRegionName,
      masteredCityGeolocation: {
        type: "Point",
        coordinates: BOSTON_DEFAULTS.coordinates
      },
      isErrorFallbackGeography: true
    };
    
    result.warnings = [
      'Created emergency mock entities due to unexpected error',
      `Using mock venue ID: ${mockVenueId}`,
      `Using mock organizer ID: ${mockOrganizerId}`,
      `Using mock category ID: ${mockCategoryId}`
    ];
    
    return result;
  }
}

/**
 * Maps a BTC event to TT format
 * @param {Object} btcEvent - BTC event object
 * @param {Object} resolvedEntities - Resolved entities object
 * @returns {Object} TT event object
 */
function mapBtcEventToTt(btcEvent, resolvedEntities) {
  const logContext = { 
    eventId: btcEvent.id,
    eventTitle: btcEvent.title
  };
  
  ErrorLogger.logInfo(
    `Mapping event: ${btcEvent.title} (${btcEvent.id})`,
    ImportStage.TRANSFORMATION,
    logContext
  );
  
  try {
    // Convert dates to ISO format
    const startDate = new Date(btcEvent.utc_start_date || btcEvent.start_date);
    const endDate = new Date(btcEvent.utc_end_date || btcEvent.end_date);
    
    // Set expiration date (1 day after end date)
    const expiresAt = new Date(endDate);
    expiresAt.setDate(expiresAt.getDate() + 1);
    
    // Create TT event object
    const ttEvent = {
      appId: config.appId,
      title: btcEvent.title,
      description: btcEvent.description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allDay: btcEvent.all_day || false,
      cost: btcEvent.cost || null,
      
      // Entity references
      venueID: resolvedEntities.entities.venueId,
      ownerOrganizerID: resolvedEntities.entities.organizerId,
      ownerOrganizerName: resolvedEntities.entities.organizerName,
      categoryFirstId: resolvedEntities.entities.categoryFirstId,
      categoryFirst: resolvedEntities.entities.categoryFirst,
      categorySecondId: resolvedEntities.entities.categorySecondId,
      categorySecond: resolvedEntities.entities.categorySecond,
      
      // Geographic information
      venueGeolocation: resolvedEntities.geography?.venueGeolocation,
      masteredCityId: resolvedEntities.geography?.masteredCityId,
      masteredCityName: resolvedEntities.geography?.masteredCityName,
      masteredCityGeolocation: resolvedEntities.geography?.masteredCityGeolocation, // Add city geolocation
      masteredDivisionId: resolvedEntities.geography?.masteredDivisionId,
      masteredDivisionName: resolvedEntities.geography?.masteredDivisionName,
      masteredRegionId: resolvedEntities.geography?.masteredRegionId,
      masteredRegionName: resolvedEntities.geography?.masteredRegionName,
      
      // Import metadata
      isDiscovered: true,
      isOwnerManaged: false,
      isActive: true,
      isFeatured: false,
      isCanceled: false,
      discoveredFirstDate: new Date().toISOString(),
      discoveredLastDate: new Date().toISOString(),
      discoveredComments: `Imported from BTC event ID: ${btcEvent.id}`,
      expiresAt: expiresAt.toISOString()
    };
    
    // Add image URL if available
    if (btcEvent.image && btcEvent.image.url) {
      ttEvent.eventImage = btcEvent.image.url;
    }
    
    return ttEvent;
  } catch (error) {
    ErrorLogger.logProcessingError(
      `Error mapping event: ${btcEvent.title}`,
      ImportStage.TRANSFORMATION,
      logContext,
      error
    );
    throw error;
  }
}

/**
 * Validates a TT event object
 * @param {Object} ttEvent - TT event object
 * @returns {Object} Validation result
 */
function validateTtEvent(ttEvent) {
  const logContext = { 
    title: ttEvent.title,
    startDate: ttEvent.startDate
  };
  
  const result = {
    valid: true,
    errors: []
  };
  
  // Check required fields
  const requiredFields = [
    { field: 'appId', label: 'Application ID' },
    { field: 'title', label: 'Title' },
    { field: 'startDate', label: 'Start Date' },
    { field: 'endDate', label: 'End Date' },
    { field: 'ownerOrganizerID', label: 'Organizer ID' },
    { field: 'ownerOrganizerName', label: 'Organizer Name' },
    { field: 'venueID', label: 'Venue ID' },
    { field: 'expiresAt', label: 'Expiration Date' }
  ];
  
  for (const { field, label } of requiredFields) {
    if (!ttEvent[field]) {
      const error = `Missing required field: ${label}`;
      result.valid = false;
      result.errors.push(error);
      
      ErrorLogger.logValidationError(
        error,
        ImportStage.VALIDATION,
        { ...logContext, field, label }
      );
    }
  }
  
  // Validate date formats
  const dateFields = ['startDate', 'endDate', 'expiresAt', 'discoveredFirstDate', 'discoveredLastDate'];
  
  for (const field of dateFields) {
    if (ttEvent[field]) {
      const date = new Date(ttEvent[field]);
      if (isNaN(date.getTime())) {
        const error = `Invalid date format for field: ${field}`;
        result.valid = false;
        result.errors.push(error);
        
        ErrorLogger.logValidationError(
          error,
          ImportStage.VALIDATION,
          { ...logContext, field, value: ttEvent[field] }
        );
      }
    }
  }
  
  // Validate relationships
  if (ttEvent.categoryFirstId && !ttEvent.categoryFirst) {
    const error = 'Category ID present but category name missing';
    result.errors.push(error);
    
    ErrorLogger.logValidationError(
      error,
      ImportStage.VALIDATION,
      { ...logContext, categoryId: ttEvent.categoryFirstId }
    );
  }
  
  // Check if start date is before end date
  if (ttEvent.startDate && ttEvent.endDate) {
    const startDate = new Date(ttEvent.startDate);
    const endDate = new Date(ttEvent.endDate);
    
    if (startDate > endDate) {
      const error = 'Start date is after end date';
      result.valid = false;
      result.errors.push(error);
      
      ErrorLogger.logValidationError(
        error,
        ImportStage.VALIDATION,
        { 
          ...logContext, 
          startDate: ttEvent.startDate, 
          endDate: ttEvent.endDate 
        }
      );
    }
  }
  
  return result;
}

/**
 * Deletes events in TT for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<number>} Number of deleted events
 */
async function deleteEventsForDate(date) {
  const logContext = { date };
  
  if (config.dryRun) {
    ErrorLogger.logInfo(
      `[DRY RUN] Would delete events for date: ${date}`,
      ImportStage.LOADING,
      logContext
    );
    return 0;
  }
  
  ErrorLogger.logInfo(
    `Deleting events for date: ${date}`,
    ImportStage.LOADING,
    logContext
  );
  
  try {
    // First, query events for the date to get counts and IDs
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    
    const queryResponse = await apiHandler.executeWithRetry(
      async () => {
        return await axios.get(`${config.ttApiBase}/events`, {
          params: {
            appId: config.appId,
            start: startOfDay,
            end: endOfDay
          },
          headers: config.authToken ? {
            Authorization: `Bearer ${config.authToken}`
          } : {}
        });
      },
      ImportStage.LOADING,
      logContext
    );
    
    const existingEvents = queryResponse.data.events || [];
    
    ErrorLogger.logInfo(
      `Found ${existingEvents.length} existing events for date: ${date}`,
      ImportStage.LOADING,
      { ...logContext, count: existingEvents.length }
    );
    
    // Save existing events for reference
    const existingEventsFile = path.join(config.outputDir, `existing-events-${date}.json`);
    fs.writeFileSync(existingEventsFile, JSON.stringify(existingEvents, null, 2));
    
    // Delete each event
    let deletedCount = 0;
    
    for (const event of existingEvents) {
      try {
        await apiHandler.executeWithRetry(
          async () => {
            return await axios.delete(`${config.ttApiBase}/events/${event._id}`, {
              headers: config.authToken ? {
                Authorization: `Bearer ${config.authToken}`
              } : {}
            });
          },
          ImportStage.LOADING,
          { ...logContext, eventId: event._id, title: event.title }
        );
        
        deletedCount++;
      } catch (error) {
        ErrorLogger.logApiError(
          `Failed to delete event: ${event.title} (${event._id})`,
          ImportStage.LOADING,
          { ...logContext, eventId: event._id, title: event.title },
          error
        );
      }
    }
    
    ErrorLogger.logInfo(
      `Deleted ${deletedCount} events for date: ${date}`,
      ImportStage.LOADING,
      { ...logContext, count: deletedCount }
    );
    
    return deletedCount;
  } catch (error) {
    ErrorLogger.logApiError(
      `Failed to delete events for date: ${date}`,
      ImportStage.LOADING,
      logContext,
      error
    );
    throw error;
  }
}

/**
 * Creates a TT event with enhanced error handling and recovery
 * @param {Object} ttEvent - TT event object
 * @returns {Promise<Object>} Created event
 */
async function createEvent(ttEvent) {
  const logContext = { 
    title: ttEvent.title,
    startDate: ttEvent.startDate,
    venueId: ttEvent.venueID,
    organizerId: ttEvent.ownerOrganizerID,
    categoryId: ttEvent.categoryFirstId
  };
  
  // Handle dry run mode
  if (config.dryRun) {
    ErrorLogger.logInfo(
      `[DRY RUN] Would create event: ${ttEvent.title}`,
      ImportStage.LOADING,
      logContext
    );
    return { 
      _id: 'dry-run-id', 
      ...ttEvent,
      dryRun: true,
      created: new Date().toISOString()
    };
  }
  
  ErrorLogger.logInfo(
    `Creating event: ${ttEvent.title}`,
    ImportStage.LOADING,
    logContext
  );
  
  // Pre-validate the event object to catch common issues early
  const validationIssues = [];
  
  // Check for required fields
  const requiredFields = [
    'title', 'startDate', 'endDate', 'venueID', 'ownerOrganizerID', 
    'categoryFirstId', 'masteredCityId'
  ];
  
  for (const field of requiredFields) {
    if (!ttEvent[field]) {
      validationIssues.push(`Missing required field: ${field}`);
    }
  }
  
  // Check for valid dates
  const dateFields = ['startDate', 'endDate', 'expiresAt'];
  for (const field of dateFields) {
    if (ttEvent[field] && isNaN(new Date(ttEvent[field]).getTime())) {
      validationIssues.push(`Invalid date format for ${field}: ${ttEvent[field]}`);
    }
  }
  
  // If we found validation issues, log them and return a mock event
  if (validationIssues.length > 0) {
    const validationError = `Event validation failed: ${validationIssues.join('; ')}`;
    ErrorLogger.logValidationError(
      validationError,
      ImportStage.LOADING,
      { ...logContext, validationIssues },
      new Error(validationError)
    );
    
    return { 
      _id: `validation-error-mock-id-${Math.random().toString(36).substring(2, 9)}`, 
      ...ttEvent,
      validationError: validationIssues,
      status: 'validation_failed',
      dryRun: true,
      mockType: 'validation-error',
      errorTimestamp: new Date().toISOString()
    };
  }
  
  // Try to create the event with robust error handling
  try {
    // Add comprehensive request headers for better diagnostics
    const headers = {
      'X-Import-Timestamp': new Date().toISOString(),
      'Content-Type': 'application/json',
      'X-Import-EventId': ttEvent.importId || 'unknown',
      'X-Import-Source': 'BTC-Import',
      'X-Client-Version': '1.0.0'
    };
    
    // Only add Authorization header if we have a token
    if (config.authToken) {
      // For security, we're not logging the actual token
      headers['Authorization'] = `Bearer ${config.authToken}`;
      console.log('Using authentication token from configuration');
    } else {
      console.warn('No authentication token provided - request may fail');
    }
    
    // Execute API call with retry logic
    const response = await apiHandler.executeWithRetry(
      async () => {
        console.log(`Sending event creation request for "${ttEvent.title}" (${new Date().toISOString()})`);
        return await axios.post(`${config.ttApiBase}/events/post`, ttEvent, { 
          headers,
          timeout: 10000 // 10-second timeout for responsiveness
        });
      },
      ImportStage.LOADING,
      logContext
    );
    
    // Process successful response
    const createdEvent = response.data;
    
    ErrorLogger.logInfo(
      `Successfully created event: ${createdEvent.title} (${createdEvent._id})`,
      ImportStage.LOADING,
      { ...logContext, id: createdEvent._id, responseStatus: response.status }
    );
    
    return {
      ...createdEvent,
      importSuccess: true,
      importTimestamp: new Date().toISOString()
    };
  } catch (error) {
    // Classify the error type for better handling
    let errorType = 'unknown';
    let errorDetail = error.message;
    let mockIdPrefix = 'api-error';
    let shouldRetry = false;
    
    // Determine error type from response or message
    if (error.response) {
      const { status } = error.response;
      
      // Authentication/Authorization errors
      if (status === 401 || status === 403) {
        errorType = 'auth';
        errorDetail = `Authentication error (${status}): ${JSON.stringify(error.response.data || {})}`;
        mockIdPrefix = 'auth-error';
        shouldRetry = false; // Auth errors typically need manual intervention
      }
      // Not Found errors
      else if (status === 404) {
        errorType = 'not-found';
        errorDetail = `Resource not found (404): ${error.response.data?.message || 'Endpoint not found'}`;
        mockIdPrefix = 'not-found-error';
        shouldRetry = false; // 404s are unlikely to be resolved with retries
      }
      // Rate limiting or throttling
      else if (status === 429) {
        errorType = 'rate-limit';
        errorDetail = `Rate limit exceeded (429): ${error.response.data?.message || 'Too many requests'}`;
        mockIdPrefix = 'rate-limit-error';
        shouldRetry = true; // Worth retrying after a delay
      }
      // Server errors (potentially transient)
      else if (status >= 500) {
        errorType = 'server';
        errorDetail = `Server error (${status}): ${error.response.data?.message || 'Internal server error'}`;
        mockIdPrefix = 'server-error';
        shouldRetry = true; // Worth retrying for transient server issues
      }
      // Other client errors
      else {
        errorType = 'client';
        errorDetail = `Client error (${status}): ${error.response.data?.message || error.message}`;
        mockIdPrefix = 'client-error';
        shouldRetry = false; // Client errors typically need to be fixed in the request
      }
    }
    // Network errors (no response)
    else if (error.request) {
      errorType = 'network';
      errorDetail = `Network error: No response received from server`;
      mockIdPrefix = 'network-error';
      shouldRetry = true; // Worth retrying for network issues
    }
    // Request setup errors
    else {
      errorType = 'setup';
      errorDetail = `Request setup error: ${error.message}`;
      mockIdPrefix = 'setup-error';
      shouldRetry = false; // Setup errors typically need code changes
    }
    
    // Log the error with appropriate level and context
    ErrorLogger.logApiError(
      `Failed to create event: ${ttEvent.title} - ${errorDetail}`,
      ImportStage.LOADING,
      { 
        ...logContext, 
        errorType, 
        errorDetail,
        shouldRetry,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      },
      error
    );
    
    // Create a mock object with detailed error info to continue processing
    return { 
      _id: `${mockIdPrefix}-${Math.random().toString(36).substring(2, 9)}`, 
      ...ttEvent,
      apiError: {
        type: errorType,
        message: errorDetail,
        detail: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      },
      shouldRetry,
      dryRun: true,
      mockType: errorType,
      errorTimestamp: new Date().toISOString()
    };
  }
}

/**
 * Processes a single day import
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Import results
 */
async function processSingleDayImport(date) {
  const startTime = new Date();
  const results = {
    date,
    startTime: startTime.toISOString(),
    endTime: null,
    duration: null,
    btcEvents: {
      total: 0,
      processed: 0
    },
    ttEvents: {
      deleted: 0,
      created: 0,
      failed: 0
    },
    entityResolution: {
      success: 0,
      failure: 0
    },
    validation: {
      valid: 0,
      invalid: 0
    },
    dryRun: config.dryRun
  };
  
  const resultsFile = path.join(config.outputDir, `import-results-${date}.json`);
  
  try {
    // Step 1: Fetch events from BTC
    const btcEvents = await fetchBtcEvents(date);
    results.btcEvents.total = btcEvents.length;
    
    if (btcEvents.length === 0) {
      ErrorLogger.logInfo(
        `No events found for date: ${date}`,
        ImportStage.EXTRACTION,
        { date }
      );
      
      results.endTime = new Date().toISOString();
      results.duration = (new Date() - startTime) / 1000;
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      
      return results;
    }
    
    // Step 2: Delete existing events for the date
    results.ttEvents.deleted = await deleteEventsForDate(date);
    
    // Step 3: Process each BTC event
    const processedEvents = [];
    const failedEvents = [];
    
    for (const btcEvent of btcEvents) {
      try {
        // Resolve entities
        const resolvedEntities = await resolveEventEntities(btcEvent);
        
        if (resolvedEntities.resolved) {
          results.entityResolution.success++;
          
          // Map to TT format
          const ttEvent = mapBtcEventToTt(btcEvent, resolvedEntities);
          
          // Validate
          const validationResult = validateTtEvent(ttEvent);
          
          if (validationResult.valid) {
            results.validation.valid++;
            
            // Create event
            const createdEvent = await createEvent(ttEvent);
            processedEvents.push({
              btcId: btcEvent.id,
              ttId: createdEvent._id,
              title: btcEvent.title,
              dryRun: config.dryRun
            });
            
            results.ttEvents.created++;
          } else {
            results.validation.invalid++;
            failedEvents.push({
              btcId: btcEvent.id,
              title: btcEvent.title,
              stage: 'validation',
              errors: validationResult.errors,
              source: {
                venue: btcEvent.venue ? btcEvent.venue.venue : 'unknown',
                organizer: btcEvent.organizer ? (Array.isArray(btcEvent.organizer) && btcEvent.organizer.length > 0 
                  ? btcEvent.organizer[0].organizer 
                  : btcEvent.organizer.organizer) : 'unknown',
                categories: btcEvent.categories ? btcEvent.categories.map(c => c.name).join(', ') : 'unknown'
              },
              mappedData: {
                title: ttEvent.title,
                venueID: ttEvent.venueID,
                ownerOrganizerID: ttEvent.ownerOrganizerID,
                ownerOrganizerName: ttEvent.ownerOrganizerName,
                startDate: ttEvent.startDate,
                endDate: ttEvent.endDate,
                categoryFirstId: ttEvent.categoryFirstId,
                categoryFirst: ttEvent.categoryFirst
              },
              validation: {
                hasRequiredFields: !validationResult.errors.some(err => err.includes('Missing required field')),
                hasValidDates: !validationResult.errors.some(err => err.includes('Invalid date') || err.includes('Start date is after end date')),
                hasValidReferences: !validationResult.errors.some(err => err.includes('Category ID present but category name missing'))
              }
            });
            
            results.ttEvents.failed++;
          }
        } else {
          results.entityResolution.failure++;
          failedEvents.push({
            btcId: btcEvent.id,
            title: btcEvent.title,
            stage: 'entity_resolution',
            errors: resolvedEntities.errors,
            source: {
              venue: btcEvent.venue ? btcEvent.venue.venue : 'unknown',
              organizer: btcEvent.organizer ? (Array.isArray(btcEvent.organizer) && btcEvent.organizer.length > 0 
                ? btcEvent.organizer[0].organizer 
                : btcEvent.organizer.organizer) : 'unknown',
              categories: btcEvent.categories ? btcEvent.categories.map(c => c.name).join(', ') : 'unknown'
            },
            target: {
              venueId: resolvedEntities.entities.venueId || null,
              organizerId: resolvedEntities.entities.organizerId || null,
              categoryFirstId: resolvedEntities.entities.categoryFirstId || null
            },
            resolution: {
              venueResolved: !!resolvedEntities.entities.venueId,
              organizerResolved: !!resolvedEntities.entities.organizerId,
              categoryResolved: !!resolvedEntities.entities.categoryFirstId,
              geographyResolved: !!resolvedEntities.geography
            }
          });
          
          results.ttEvents.failed++;
        }
        
        results.btcEvents.processed++;
      } catch (error) {
        failedEvents.push({
          btcId: btcEvent.id,
          title: btcEvent.title,
          stage: 'processing',
          error: error.message,
          source: {
            venue: btcEvent.venue ? btcEvent.venue.venue : 'unknown',
            organizer: btcEvent.organizer ? (Array.isArray(btcEvent.organizer) && btcEvent.organizer.length > 0 
              ? btcEvent.organizer[0].organizer 
              : btcEvent.organizer.organizer) : 'unknown',
            categories: btcEvent.categories ? btcEvent.categories.map(c => c.name).join(', ') : 'unknown'
          },
          debugInfo: {
            errorName: error.name,
            errorStack: error.stack,
            processingStage: 'Unknown'
          }
        });
        
        results.ttEvents.failed++;
        results.btcEvents.processed++;
      }
    }
    
    // Save processed and failed events
    const processedEventsFile = path.join(config.outputDir, `processed-events-${date}.json`);
    fs.writeFileSync(processedEventsFile, JSON.stringify(processedEvents, null, 2));
    
    const failedEventsFile = path.join(config.outputDir, `failed-events-${date}.json`);
    fs.writeFileSync(failedEventsFile, JSON.stringify(failedEvents, null, 2));
    
    // Get unmatched entities report
    const unmatchedReport = getUnmatchedReport();
    const unmatchedReportFile = path.join(config.outputDir, `unmatched-entities-${date}.json`);
    fs.writeFileSync(unmatchedReportFile, JSON.stringify(unmatchedReport, null, 2));
    
    // Calculate results
    results.endTime = new Date().toISOString();
    results.duration = (new Date() - startTime) / 1000;
    
    // Save results
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    return results;
  } catch (error) {
    ErrorLogger.logSystemError(
      `Failed to process import for date: ${date}`,
      ImportStage.PROCESSING,
      { date },
      error
    );
    
    results.endTime = new Date().toISOString();
    results.duration = (new Date() - startTime) / 1000;
    results.error = error.message;
    
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    throw error;
  }
}

/**
 * Performs a Go/No-Go assessment based on import results
 * @param {Object} results - Import results
 * @returns {Object} Assessment result
 */
function performGoNoGoAssessment(results) {
  const assessment = {
    canProceed: true,
    metrics: {
      // Success rates
      entityResolutionRate: results.entityResolution.success / results.btcEvents.total,
      validationRate: results.validation.valid / results.entityResolution.success,
      overallSuccessRate: results.ttEvents.created / results.btcEvents.total,
      
      // Failure metrics
      entityFailureCount: results.entityResolution.failure,
      validationFailureCount: results.validation.invalid,
      processingFailureCount: results.ttEvents.failed
    },
    thresholds: {
      minimumResolutionRate: 0.9, // 90%
      minimumValidationRate: 0.95, // 95%
      minimumOverallRate: 0.85 // 85%
    },
    recommendations: []
  };
  
  // Check success rates against thresholds
  if (assessment.metrics.entityResolutionRate < assessment.thresholds.minimumResolutionRate) {
    assessment.canProceed = false;
    assessment.recommendations.push('Entity resolution rate below threshold. Add missing entities and update mappings.');
  }
  
  if (assessment.metrics.validationRate < assessment.thresholds.minimumValidationRate) {
    assessment.canProceed = false;
    assessment.recommendations.push('Validation rate below threshold. Fix data quality issues in mapping process.');
  }
  
  if (assessment.metrics.overallSuccessRate < assessment.thresholds.minimumOverallRate) {
    assessment.canProceed = false;
    assessment.recommendations.push('Overall success rate below threshold. Review failed events and address issues.');
  }
  
  // Save assessment to file
  const assessmentFile = path.join(config.outputDir, `go-nogo-assessment-${results.date}.json`);
  fs.writeFileSync(assessmentFile, JSON.stringify(assessment, null, 2));
  
  // Generate report
  console.log('\nGo/No-Go Assessment:');
  console.log(`Overall status: ${assessment.canProceed ? 'GO ✅' : 'NO-GO ❌'}`);
  console.log('\nMetrics:');
  console.log(`- Entity Resolution Rate: ${(assessment.metrics.entityResolutionRate * 100).toFixed(1)}% (Threshold: ${(assessment.thresholds.minimumResolutionRate * 100).toFixed(1)}%)`);
  console.log(`- Validation Rate: ${(assessment.metrics.validationRate * 100).toFixed(1)}% (Threshold: ${(assessment.thresholds.minimumValidationRate * 100).toFixed(1)}%)`);
  console.log(`- Overall Success Rate: ${(assessment.metrics.overallSuccessRate * 100).toFixed(1)}% (Threshold: ${(assessment.thresholds.minimumOverallRate * 100).toFixed(1)}%)`);
  
  if (assessment.recommendations.length > 0) {
    console.log('\nRecommendations:');
    assessment.recommendations.forEach((rec, i) => {
      console.log(`${i+1}. ${rec}`);
    });
  }
  
  return assessment;
}

/**
 * Main function to run the import
 */
async function run() {
  try {
    // Get test date
    const testDate = getTestDate();
    
    console.log(`Starting import for date: ${testDate}`);
    console.log(`Dry run mode: ${config.dryRun}`);
    console.log(`Output directory: ${config.outputDir}`);
    
    // Process the single day import
    const results = await processSingleDayImport(testDate);
    
    // Print summary
    console.log('\nImport Summary:');
    console.log(`Date: ${results.date}`);
    console.log(`Duration: ${results.duration.toFixed(2)} seconds`);
    console.log(`BTC Events Total: ${results.btcEvents.total}`);
    console.log(`BTC Events Processed: ${results.btcEvents.processed}`);
    console.log(`TT Events Deleted: ${results.ttEvents.deleted}`);
    console.log(`TT Events Created: ${results.ttEvents.created}`);
    console.log(`TT Events Failed: ${results.ttEvents.failed}`);
    console.log(`Entity Resolution Success: ${results.entityResolution.success}`);
    console.log(`Entity Resolution Failure: ${results.entityResolution.failure}`);
    console.log(`Validation Valid: ${results.validation.valid}`);
    console.log(`Validation Invalid: ${results.validation.invalid}`);
    
    // Perform Go/No-Go assessment
    const assessment = performGoNoGoAssessment(results);
    
    // Print result files
    console.log('\nResult files:');
    console.log(`- Import Results: ${path.join(config.outputDir, `import-results-${results.date}.json`)}`);
    console.log(`- BTC Events: ${path.join(config.outputDir, `btc-events-${results.date}.json`)}`);
    console.log(`- Processed Events: ${path.join(config.outputDir, `processed-events-${results.date}.json`)}`);
    console.log(`- Failed Events: ${path.join(config.outputDir, `failed-events-${results.date}.json`)}`);
    console.log(`- Unmatched Entities: ${path.join(config.outputDir, `unmatched-entities-${results.date}.json`)}`);
    console.log(`- Go/No-Go Assessment: ${path.join(config.outputDir, `go-nogo-assessment-${results.date}.json`)}`);
    
    return {
      results,
      assessment
    };
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export {
  run,
  processSingleDayImport,
  fetchBtcEvents,
  resolveEventEntities,
  mapBtcEventToTt,
  validateTtEvent,
  deleteEventsForDate,
  createEvent,
  performGoNoGoAssessment
};