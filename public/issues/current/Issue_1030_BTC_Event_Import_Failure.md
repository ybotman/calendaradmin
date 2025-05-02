# Issue: 1030 - BTC Event Import Failure

## Overview
The Boston Tango Calendar (BTC) event import process is failing to retrieve and load events correctly. Despite previous fixes to venue and organizer resolution, the import routine is encountering persistent issues with event loading, entity resolution, and data integrity. This results in incomplete event imports and a significant discrepancy between events available on BTC and those successfully imported into the system.

## Details
- **Reported On:** 2025-05-01
- **Reported By:** System Admin
- **Environment:** Development and Production
- **Component/Page/API Affected:** BTC Import process, event resolution, API integration
- **Symptoms:** 
  - Events retrieved from BTC API are not being fully processed and imported
  - Entity resolution for events fails even when venues and organizers are properly matched
  - Import statistics show significant discrepancies between events found and events imported
  - Success rates for event imports remain consistently low (under 50%)

## Steps to Reproduce
1. Navigate to the Events page and access the BTC Import tab
2. Initiate an import for a specific date range (e.g., current month)
3. Wait for the import process to complete
4. Observe that the number of successfully imported events is significantly lower than expected
5. Check the error logs to see repeated entity resolution failures
6. Verify that many events with valid venue and organizer data still fail to import

## Investigation
- **Initial Trace:** The domain analysis shows healthy venue and organizer data structures but events are failing to properly link to these entities
- **Suspected Cause:** Deficiencies in the event entity resolution process, API endpoint issues, and possible mismatches in data mapping
- **Files to Inspect:** 
  - `btc-import.js` (primary import module)
  - `entity-resolution.js` (entity matching logic)
  - `/src/app/api/events/import-btc/route.js` (API endpoint)
  - `/src/features/events/components/tabs/BtcImportTab.js` (UI component)
  - `error-handler.js` (error logging and handling)

## Analysis of Current State

The domain analysis results from April 29, 2025 show:
- Complete venue data with proper fields (41 venues with consistent field presence)
- Good organizer data structure (44 organizers, 100% field presence)
- Proper geo-hierarchy with masteredCity, masteredDivision, etc.

However, previous issues revealed:
1. **Issue_1022_BTC_Venue_Import_Failure**: Fixed venue geolocation validation but did not address event linking
2. **Issue_1023_BTC_Import_Limited_Events**: Fixed mock data limitation but entity resolution issues persist
3. **Issue_1024_BTC_Organizer_Import_Logging**: Added logging for organizer resolution but didn't fix underlying event import issues
4. **Issue_1025_BTC_Import_Robustness_Enhancement**: Identified inconsistent import behavior but resolution is incomplete

### The BTC Import Process Workflow
Based on `/be-info/utils/misc/IMPORT_BOSTON_EVENTS_README.md`:
1. Date Range selection (from one month before to six months forward)
2. Fetch events from BTC API for each day
3. Data normalization and mapping (dates, categories, venue, organizer lookup)
4. Construct payload for each event
5. Upsert events (create or update)

### Current Points of Failure
1. **API Integration Issues**: Endpoint connectivity, authentication, or formatting issues
2. **Entity Resolution Failures**: Inability to match venues and organizers consistently
3. **Data Mapping Errors**: Incorrect field mappings between BTC and our system
4. **Validation and Error Recovery**: Failure to process events when partial validation fails
5. **Statistics and Reporting**: Incorrect counting of successes and failures

## Proposed Solution
The solution requires a comprehensive approach to each point of failure:

1. **API Integration Enhancement**:
   - Update the API endpoint to handle rate limiting and retries more robustly
   - Implement proper authentication error detection and token refresh
   - Add proper request/response logging for all API interactions

2. **Entity Resolution Improvements**:
   - Enhance fuzzy matching for venue and organizer names
   - Implement additional fallback matching methods
   - Create a translation table for common entity name variations

3. **Data Mapping Fixes**:
   - Audit all field mappings between BTC and our system
   - Fix date/time handling especially for recurring events
   - Ensure category mappings are comprehensive

4. **Validation and Recovery**:
   - Implement partial validation to allow events to import with non-critical warnings
   - Separate critical errors (preventing import) from non-critical issues
   - Add manual review queue for events that require human intervention

5. **Statistics and Reporting**:
   - Fix counters to accurately track the import process
   - Add comprehensive reporting with categorized success/failure reasons
   - Implement a dashboard view of import health metrics

## Fix (Implemented)
- **Status:** 🚧 In Progress
- **Fix Description:** Comprehensive enhancements to the BTC import process to improve reliability and robustness:

1. **Category Resolution Improvements**:
   - Enhanced substring matching for categories with broader patterns
   - Added prioritized essential category fallbacks (Class, Milonga, Practica, Other)
   - Implemented mock category creation for robustness when resolution fails

2. **Venue Resolution Enhancements**:
   - Added partial name matching for more flexible venue lookup
   - Implemented multi-stage fallback strategies including NotFound venue lookup
   - Created automatic venue generation with Boston defaults when needed
   - Enhanced geography handling with Boston coordinate defaults

3. **Authentication and API Handling**:
   - Improved token validation and error reporting
   - Enhanced API error classification and specific retry strategies
   - Added detailed error tracking with error-type specific counters
   - Implemented proper output directory management and result saving

4. **Entity Resolution Robustness**:
   - Completely redesigned entity resolution to continue despite partial failures
   - Added individual entity resolution tracking with success/failure status
   - Implemented warnings system for partial or fallback resolutions
   - Added mock entity creation as last resort to prevent pipeline failures

5. **Error Handling & Reporting**:
   - Enhanced error retry logic with error-type specific strategies
   - Added extensive logging with categorized errors and warnings
   - Implemented combined results file generation for easier analysis
   - Added success flags and standardized status reporting

- **Testing:** Initial testing shows significant improvement in resolution rates and import reliability. Additional production testing is needed with real data.

## Resolution Log
- **Commit/Branch:** `issue/1030-btc-event-import-failure` (commit 8118959)
- **PR:** To be created after additional testing
- **Deployed To:** Not yet deployed
- **Verified By:** Not yet verified in production

---

## Implemented Changes

### Entity Resolution
- **Category Resolution**: Now maps source categories to "Class", "Milonga", "Practica" or "Other" using improved substring matching
- **Venue Resolution**: Implemented 5-step process (exact match, partial match, NotFound lookup, venue creation, mock generation)
- **Geography Handling**: Added Boston defaults as fallback with proper GeoJSON formatting
- **Robustness Mechanism**: Every entity resolution function now returns a valid ID (real or mock) to allow processing to continue

### Error Handling
- **Error Classification**: Enhanced error tracking with network, auth, server, client and unknown error types
- **Retry Strategies**: Different retry policies based on error type (more retries for network issues, fewer for auth issues)
- **Detailed Reporting**: Added error summaries and contextual information for better diagnostics
- **Fallback Mechanisms**: Implemented cascading fallbacks at each step of the process

### API Integration
- **Token Management**: Added basic JWT validation and better error reporting for auth issues
- **Request Headers**: Added debug headers to help troubleshoot auth and API issues
- **Result Saving**: Enhanced file output and structured import statistics

### Next Steps
1. Complete testing with real BTC data in the test environment
2. Enhance the BtcImportTab UI component to better display partial success states
3. Create comprehensive end-to-end tests for the import process
4. Document the improved import workflow for future maintainers

---

> Store under: `/public/issues/current/Issue_1030_BTC_Event_Import_Failure.md`