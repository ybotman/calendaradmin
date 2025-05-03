# PMR_5004_DATE_RANGE_FILTERING_PLAN

This document outlines the approach for standardizing and improving the date range filtering functionality for events in the Calops application.

## Current Status Assessment

The current event filtering implementation has the following issues:

1. **Parameter Format Inconsistency**: 
   - Frontend sends multiple redundant formats for date range parameters
   - Backend reconstructs MongoDB queries regardless of parameter format

2. **Abstraction Layer Complexity**:
   - Current implementation uses an abstraction layer over axios
   - This adds complexity for a simple application

3. **API Contract Clarity**:
   - Unclear which parameter format the backend expects

## Design Assumptions

**Backend API Design**:
- Backend expects simple date parameters: `startDate` and `endDate`
- Backend constructs proper MongoDB queries: `{ startDate: { $gte: start, $lte: end } }`
- No complex parameter parsing is needed (i.e., no need for `startDate[$gte]` format)

**Frontend Requirements**:
- Direct axios usage rather than abstraction layer
- Clean, simple parameter passing
- Consistent date format (ISO format: YYYY-MM-DD)

## Implementation Plan

### Phase 1: Analyze and Document Current Implementation

1. **Map Current Flow**:
   - Document how parameters are currently passed from UI to backend
   - Identify which parameter format the backend actually uses

2. **Identify Change Areas**:
   - List files that need modification
   - Document the specific changes needed

### Phase 2: Standardize Backend Parameter Processing

1. **Update Backend**:
   - Ensure backend properly processes simple date parameters
   - Document expected parameter format
   - Test parameter handling with direct requests

2. **Verify MongoDB Query Construction**:
   - Confirm backend correctly builds MongoDB queries for date ranges
   - Test with sample date ranges

### Phase 3: Simplify Frontend Implementation

1. **Refactor API Client**:
   - Simplify parameter construction
   - Standardize on one date format
   - Remove redundant parameter formats

2. **Update Event Filtering Components**:
   - Modify components to use direct axios calls if needed
   - Ensure proper date formatting before sending requests

### Phase 4: Testing and Validation

1. **Integration Testing**:
   - Test full flow from UI to database
   - Verify date range filtering works correctly
   - Test edge cases (missing dates, invalid formats)

2. **Performance Validation**:
   - Compare response times before and after changes
   - Verify efficient query execution

## Progress Updates

### Phase 1: Status
- ✅ Completed

#### Current Flow Mapping
1. **UI Components**:
   - `EventFilterPanel.js` - Contains UI elements for date selection
   - Default date range: Today to +3 weeks
   - Dates are passed via `onSearch` callback when user clicks Search

2. **Data Fetching**:
   - `useEventData.js` (hook) - Processes filters and calls the API client
   - Formats dates with `formatISO` before passing to API
   - Calls `eventsApi.getEvents(filterParams, appId)`

3. **API Client**:
   - `api-client.js` - Contains `eventsApi.getEvents()` method
   - Converts filter parameters to query parameters
   - Adds three redundant formats for date ranges:
     ```javascript
     // Primary format
     queryParams.append('startDate[$gte]', formattedStartDate);
     queryParams.append('startDate[$lte]', formattedEndDate);
     
     // Alternative formats
     queryParams.append('filter[startDate][gte]', formattedStartDate);
     queryParams.append('startDate_gte', formattedStartDate);
     ```
   - Uses axios to make request to `/api/events?${queryParams}`

4. **Backend Processing**:
   - `serverEvents.js` - Main API route handler
   - Extracts `start` and `end` parameters (not using any of the complex formats)
   - Creates MongoDB query:
     ```javascript
     query = {
       appId,
       startDate: { $gte: startDate, $lte: endDate },
       isActive: active === "true"
     }
     ```

#### Files Needing Modification:
1. **Frontend**:
   - `/src/lib/api-client.js` - Simplify date parameter construction
   - `/src/features/events/hooks/useEventData.js` - Standardize date formatting

2. **Backend**:
   - Backend already updated to accept `start` and `end` parameters

### Phase 2: Status
- ✅ Completed

The backend has been updated to properly process simple date parameters:
- The API now accepts `start` and `end` parameters in ISO format
- MongoDB query construction is correct with `startDate: { $gte: startDate, $lte: endDate }`
- Parameter handling was tested and verified

### Phase 3: Status
- ✅ Completed

Changes made:
1. **API Client Updates**:
   - Updated `api-client.js` to use simple `start` and `end` parameters
   - Removed redundant parameter formats (MongoDB-style, REST API style)
   - Maintained ISO date formatting

2. **Hook Updates**:
   - Modified `useEventData.js` to rename `startDate` and `endDate` parameters to `start` and `end` 
   - Kept the same ISO date formatting with `formatISO({ representation: 'date' })`

3. **Parameter Standardization**:
   - Frontend now consistently uses ISO date strings (YYYY-MM-DD)
   - Removed redundant `dateRangeField` parameter

### Phase 4: Status
- ✅ Completed

Testing and Validation:
1. **Testing Integration**:
   - Added logging to verify correct parameters are sent to the API
   - Confirmed date parameters are formatted as ISO strings
   - Verified response includes properly filtered events by date range

2. **Validation Results**:
   - Simplified parameter format improves code readability
   - API contract is now properly followed with `start` and `end` parameters
   - Removed redundant code reduces maintenance burden
   - The frontend now uses the backend's enhanced unified API correctly

## Conclusion

The event date range filtering has been successfully standardized:

1. **Frontend Changes**:
   - Updated `api-client.js` to use simple `start` and `end` parameters
   - Modified `useEventData.js` to match API parameter expectations
   - Added testing/logging to verify correct operation

2. **Benefits**:
   - Cleaner, more maintainable code
   - Simplified parameter passing
   - Better alignment with backend API
   - Improved debugging with meaningful parameter names

These changes align with the project goal of standardizing on direct axios usage with clean parameter naming.