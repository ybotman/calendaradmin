# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- `npm run dev`: Run dev server on port 3003
- `npm run build`: Build for production
- `npm run lint`: Run ESLint checks
- `npm run format`: Format with Prettier
- `npm run start`: Run production server
- `npm run sync-models`: Sync models with calendar-be

## Code Style Guidelines
- Use ES Modules with standard import order (React → Libraries → Local)
- Prefer aliased imports with `@/` prefix via jsconfig.json
- React components: Functional components with hooks
- Error handling: Use try/catch with specific error messages and appropriate status codes
- API routes: RESTful patterns with resource-based paths
- Structure: Maintain separation between API routes, components, and models
- MongoDB integration: Follow existing model patterns

## API Integration Guidelines

### Backend Integration Patterns
All data access should follow one of these approved patterns to ensure consistency and reliability:

#### 1. Direct Axios for Frontend Component API Calls (PREFERRED)
For frontend components, always use axios directly to interact with Next.js API routes:

```javascript
import axios from 'axios';

// Make API requests to the internal Next.js API routes
const response = await axios.get(`/api/events?appId=${appId}`);
const events = response.data.events || [];

// For mutations
const newEvent = await axios.post('/api/events', { 
  ...eventData,
  appId 
});
```

#### 2. API Client Services (LEGACY PATTERN)
For backward compatibility only, some parts of the codebase may still use the specialized API services from api-client.js:

```javascript
import { usersApi, organizersApi } from '@/lib/api-client';

// Use specific API functions
const users = await usersApi.getUsers(appId);
const organizer = await organizersApi.getOrganizerById(id, appId);
```

#### 3. API Route Implementation
For Next.js API routes, use the proxy pattern to forward requests to the backend:

```javascript
// src/app/api/resource/route.js
export async function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const appId = searchParams.get('appId');
  
  if (!appId) {
    return NextResponse.json({ error: 'appId is required' }, { status: 400 });
  }
  
  // Forward to backend
  const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
  const apiUrl = `${backendUrl}/api/resource?${searchParams.toString()}`;
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  return NextResponse.json(data);
}
```

### Prohibited Patterns
The following practices should NEVER be used:

1. **Direct MongoDB Access**: Never import mongoose models directly
   ```javascript
   // ❌ NEVER DO THIS:
   import Event from '@/models/Event';
   const events = await Event.find({ appId });
   ```

2. **Default Import of API Client**: The api-client module exports named services
   ```javascript
   // ❌ INCORRECT
   import apiClient from '@/lib/api-client'; // Will cause runtime errors!
   
   // ✅ CORRECT - Named imports
   import { usersApi, eventsApi } from '@/lib/api-client';
   
   // ✅ CORRECT - Direct axios
   import axios from 'axios';
   ```

3. **Mixed Backend Access**: Never mix direct database access with API calls
   ```javascript
   // ❌ NEVER MIX PATTERNS:
   import Event from '@/models/Event';
   import { usersApi } from '@/lib/api-client';
   
   // This creates inconsistent data access patterns
   const events = await Event.find({ appId });
   const users = await usersApi.getUsers(appId);
   ```

### Event API Usage
For events, use the following best practices with direct axios:

```javascript
// Getting events with filters
const params = new URLSearchParams({ 
  appId,
  start: startDate.toISOString(),
  end: endDate.toISOString()
});

// Add location filters
if (regionName) params.append('masteredRegionName', regionName);
if (divisionName) params.append('masteredDivisionName', divisionName);
if (cityName) params.append('masteredCityName', cityName);

// Add other filters
if (organizerId) params.append('organizerId', organizerId);
if (category) params.append('category', category);

const response = await axios.get(`/api/events?${params.toString()}`);
const events = response.data.events || [];

// Creating an event
const newEvent = await axios.post('/api/events', {
  appId,
  title: 'New Event',
  startDate: new Date(),
  endDate: new Date(new Date().setHours(new Date().getHours() + 3)),
  ownerOrganizerID: organizerId,
  ownerOrganizerName: organizerName,
  // Other event properties...
});

// Updating an event
const updatedEvent = await axios.put(`/api/events/${eventId}?appId=${appId}`, {
  appId,
  title: 'Updated Event Title',
  // Other fields to update
});

// Deleting an event
await axios.delete(`/api/events/${eventId}?appId=${appId}`);
```

## Naming Conventions
- Components/Models: PascalCase (UserEditForm.js)
- Functions/Variables: camelCase (getUsers, isLoading)
- Event handlers: Prefix with 'handle' (handleSubmit)
- API routes: route.js in parameter-based directories ([id]/route.js)

## System Architecture
- Next.js (v14) with Material UI for frontend
- API Layer: Next.js API Routes
- Database: MongoDB (shared with calendar-be)
- Authentication: Firebase Auth integration
- Model Sharing: Direct import from calendar-be
- Backend Connection: API client in src/lib/api-client.js
- Backend URL: http://localhost:3010 (default)
- Admin App runs on port 3003

## Multi-Application Context System
CalOps is designed to work with multiple applications simultaneously. Each operation must respect the currently selected application context.

### AppContext System
- **Mandatory Context**: The application requires a valid appId at all times
- **No Default Fallbacks**: Operations MUST fail explicitly rather than defaulting to a fallback application
- **AppContext Provider**: Wraps the entire application in `src/lib/AppContext.js`
- **Application Selection**: Users select the current application via dropdown in the AdminLayout header
- **Context Storage**: Selected application persists in localStorage between sessions

### AppId Requirements
- **Required Parameter**: Every API call MUST include a valid `appId` parameter
- **Validation**: All API routes validate appId via the `validateAppId` utility
- **Error Responses**: Routes return 400 status with detailed error messages if appId is invalid
- **API Functions**: All data operations in hooks and API client functions require appId

### Error Handling Guidelines
1. **Validation First**: Always validate appId before processing any request
   ```javascript
   const appId = validateAppId(searchParams); // Will throw if invalid
   ```

2. **Explicit Errors**: Return clear error responses for invalid appId
   ```javascript
   return NextResponse.json({ 
     error: 'Invalid or missing appId parameter', 
     details: error.message 
   }, { status: 400 });
   ```

3. **UI Error Indication**: The UI clearly shows when there's an issue with the current application
   - Error banners display prominently when appId is invalid
   - The application dropdown is highlighted in error state

4. **No Silent Fallbacks**: The system must never silently fall back to a default application
   ```javascript
   // ❌ NEVER DO THIS:
   const appId = searchParams.get('appId') || '1'; // No default fallbacks!
   
   // ✅ DO THIS INSTEAD:
   try {
     const appId = validateAppId(searchParams);
   } catch (error) {
     // Handle the error explicitly
   }
   ```

## CalOps Purpose & Functionality
The CalOps (Calendar Operations) application serves as the central administrative hub for the entire Master Calendar ecosystem. Its core functions include:

- Administrative management of the multi-calendar user base
- User account approval, verification, and issue resolution
- Organization and event moderation across all connected calendars
- System maintenance and configuration adjustments
- Cross-platform user relationship management
- Security monitoring and access control enforcement
- Administrative reporting and analytics

This application is the primary tool for administrators to maintain system integrity, resolve user issues, and ensure proper functioning of all connected calendar platforms.

## Tango Calendar Platform
This admin application is part of an integrated platform with four components:

1. **Calendar Admin** (This App): Administrative dashboard for user, organization, and location management
   
2. **Calendar-BE**: Backend API with centralized data management, user authentication, and business logic

3. **TangoTiempo.com** (appId: "1"): Consumer-focused calendar interface for event browsing and discovery

4. **HarmonyJunction.org** (appId: "2"): Regional tango event calendar with organizer management features

All applications share the same MongoDB database and Firebase authentication system, with Azure Blob Storage for media files. Changes made in the admin interface affect all connected frontend applications.

### Data Isolation Between Applications
The mandatory appId system ensures proper data isolation between different calendar platforms:

- Each document in the database has an associated `appId` field
- API routes filter data by appId to prevent cross-application data leakage
- UI components only show data relevant to the currently selected application
- Form submissions include the current appId to maintain proper data boundaries
- Validation ensures data integrity across the platform ecosystem

This isolation is crucial as each calendar platform serves different markets and regions, while sharing the same underlying infrastructure and administrative tools.