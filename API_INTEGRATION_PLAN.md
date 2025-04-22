# API Integration Plan: Backend Integration for CalOps

This document outlines the phased approach to migrating the CalOps application to properly use the central calendar-be backend API instead of direct database connections.

## Overview

CalOps is currently using mixed approaches for data access:
1. Some features use the central backend API (via api-client.js)
2. Other features (particularly Events) attempt direct MongoDB connections
3. This inconsistency is causing 500 errors and maintenance challenges

## Backend API Structure

After examining the backend code, we've identified the following events API endpoints:

1. **Main Events Endpoints**:
   - `GET /api/events` - List events with filters (pagination, date range, location)
   - `GET /api/events/id/:id` - Get single event by ID
   - `POST /api/events/post` - Create event (requires authentication)
   - `PUT /api/events/:eventId` - Update event (requires authentication)
   - `DELETE /api/events/:eventId` - Delete event (requires authentication)

2. **Additional Endpoints**:
   - `GET /api/events/owner/:ownerId` - Get events by owner
   - `GET /api/events/byMasteredLocations` - Get events by location
   - `GET /api/events/byRegionAndCategory` - Get events filtered by region and category

3. **Required Parameters**:
   - `appId` - Required for all endpoints
   - Authentication - Required for POST, PUT, DELETE operations

4. **Response Format**:
   The main endpoint returns:
   ```json
   {
     "events": [...],
     "pagination": {
       "total": 20,
       "page": 1,
       "limit": 400,
       "pages": 1
     },
     "filterType": "region",
     "query": {
       "region": "Northeast",
       "division": "New England",
       "city": "Boston"
     }
   }
   ```

## Testing Process

After each phase, we'll test the application using:

```bash
# Start the development server on port 3003
npm run dev

# In a separate terminal, verify the backend is running
curl http://localhost:3010/health

# Test the events API directly
curl "http://localhost:3010/api/events?appId=1&masteredRegionName=Northeast"

# Build the app to verify no compilation errors
npm run build
```

## Phase 1: API Client Enhancement

**Status: 🟡 In Progress**

Goals:
- Add proper Events API methods to api-client.js
- Standardize parameter naming and response handling
- Add thorough error logging

Tasks:
- [x] Add eventsApi object to api-client.js
- [x] Implement getEvents method with filter support
- [x] Implement CRUD operations (getEventById, createEvent, updateEvent, deleteEvent)
- [x] Add comprehensive error handling
- [ ] Test events API endpoints directly with backend URL

Implementation Details:
```javascript
// Events API implementation
export const eventsApi = {
  getEvents: async (filters = {}, appId = '1') => {
    try {
      // Build query parameters
      const params = new URLSearchParams({ appId });
      
      // Add date filters
      if (filters.startDate) params.append('start', filters.startDate.toISOString());
      if (filters.endDate) params.append('end', filters.endDate.toISOString());
      
      // Add geo filters
      if (filters.regionName) params.append('masteredRegionName', filters.regionName);
      if (filters.divisionName) params.append('masteredDivisionName', filters.divisionName);
      if (filters.cityName) params.append('masteredCityName', filters.cityName);
      
      // Add other filters
      if (filters.organizerId) params.append('organizerId', filters.organizerId);
      if (filters.category) params.append('category', filters.category);
      
      console.log(`Fetching events from backend: ${BE_URL}/api/events?${params.toString()}`);
      
      // Get events from backend
      const response = await apiClient.get(`/api/events?${params.toString()}`);
      
      // Handle proper response format
      if (response.data && Array.isArray(response.data.events)) {
        return response.data.events;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('Unexpected response format from events API:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching events from backend:', error);
      throw error;
    }
  }
  // Other methods...
}
```

## Phase 2: Frontend Hook Updates

**Status: ⚪ Not Started**

Goals:
- Update useEventData.js to use the enhanced API client
- Maintain development fallbacks for offline development
- Ensure proper error handling in the UI

Tasks:
- [ ] Refactor useEventData to use eventsApi
- [ ] Update error handling to show user-friendly messages
- [ ] Maintain mock data generation for development
- [ ] Test all event filter combinations

Implementation Details:
```javascript
// useEventData hook refactoring
const fetchEvents = useCallback(async (filters = {}) => {
  try {
    dispatch({ type: 'FETCH_EVENTS_START' });

    try {
      // Use eventsApi from api-client
      const events = await eventsApi.getEvents(filters, appId);
      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
      return events;
    } catch (apiError) {
      // Handle API errors with fallback for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock event data for testing');
        const mockEvents = generateMockEvents(filters);
        dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: mockEvents });
        return mockEvents;
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    dispatch({ 
      type: 'FETCH_EVENTS_FAILURE', 
      payload: error.response?.data?.message || error.message 
    });
    throw error;
  }
}, [appId, dispatch]);
```

## Phase 3: Clean Up Direct MongoDB Routes

**Status: ⚪ Not Started**

Goals:
- Review all routes in /api/events/
- Convert to proxy endpoints or remove if redundant
- Document the purpose of each remaining route

Tasks:
- [ ] Analyze /app/api/events/route.js
- [ ] Analyze /app/api/events/[id]/route.js
- [ ] Convert to proxy pattern or remove
- [ ] Test proxy endpoints directly

Implementation Details:

For proxy endpoints, we'll implement:
```javascript
// src/app/api/events/route.js
export async function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const appId = searchParams.get('appId');
  
  if (!appId) {
    return NextResponse.json({ error: 'appId is required' }, { status: 400 });
  }
  
  try {
    // Forward to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010'}/api/events?${searchParams.toString()}`;
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Error connecting to backend', details: error.message },
      { status: 500 }
    );
  }
}
```

## Phase 4: Model Refinement

**Status: ⚪ Not Started**

Goals:
- Determine which models are needed locally
- Convert unneeded Mongoose models to interfaces/types
- Ensure all model access is consistent

Tasks:
- [ ] Analyze Event.js model usage
- [ ] Create interface-only versions if needed
- [ ] Update imports across the application
- [ ] Verify no direct mongoose references remain

Implementation Details:

We'll create a TypeScript interface or JavaScript type definition:
```javascript
// src/interfaces/Event.js
/**
 * Event interface - matches backend Events schema
 */
export default {
  /**
   * @typedef {Object} Event
   * @property {string} _id - MongoDB ID
   * @property {string} appId - Application identifier
   * @property {string} title - Event title
   * @property {string} [shortTitle] - Optional short title
   * @property {string} [description] - Event description
   * @property {Date} startDate - Event start date/time
   * @property {Date} endDate - Event end date/time
   * @property {string} [categoryFirst] - Primary category
   * @property {string} [masteredRegionName] - Region name
   * @property {string} [masteredDivisionName] - Division name
   * @property {string} [masteredCityName] - City name
   * @property {string} ownerOrganizerID - ID of owner organizer
   * @property {string} ownerOrganizerName - Name of owner organizer
   * @property {boolean} isActive - Whether event is active
   * @property {boolean} isFeatured - Whether event is featured
   * @property {string} [eventImage] - URL to event image
   * @property {Date} expiresAt - Expiration date
   */
}
```

## Phase 5: Documentation Update

**Status: ⚪ Not Started**

Goals:
- Update CLAUDE.md with API access patterns
- Document the standard approach for all data operations
- Create API reference to prevent future issues

Tasks:
- [ ] Update API Client Standards section in CLAUDE.md
- [ ] Add Events API section to documentation
- [ ] Document best practices for backend/frontend separation
- [ ] Create quick reference for common operations

Implementation Details:

Updates to CLAUDE.md will include:
```markdown
## API Integration Guidelines

### Backend API Pattern
All data access should go through the backend API (calendar-be) using the api-client.js utility:

1. **For Standard CRUD Operations**:
   - Import specific API clients: `import { eventsApi } from '@/lib/api-client'`
   - Use the appropriate method: `eventsApi.getEvents(filters, appId)`

2. **For Direct API Calls**:
   - Use axios directly: `import axios from 'axios'`
   - Call Next.js API routes: `await axios.get('/api/events?appId=${appId}')`
   
3. **Never**:
   - Import Mongoose models directly
   - Connect directly to MongoDB
   - Create default instances of model objects
```

## Final Validation

**Status: ⚪ Not Started**

Goals:
- Comprehensive testing of all event operations
- Verify backend integration is complete
- Ensure error handling works properly

Tasks:
- [ ] Test all event filter combinations
- [ ] Verify events can be created/edited/deleted
- [ ] Test fallbacks with backend unavailable
- [ ] Check browser console for any remaining errors
- [ ] Final build and deployment verification