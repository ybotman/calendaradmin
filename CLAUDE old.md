# CLAUDE.md - Calendar Backend (calendar-be)

This file provides guidance to Claude Code (claude.ai/code) when working with the backend API server.

# Readme
 - The systems of Readmes are ONLY stored in public/readme.
 - RMD is abbreation for Readme Docuemntation
 - so the command "RMD CAUDE ROLES" tells you to open the readme like Claude roles in the public/readme folder.
 - when you have read a readme, you must breifly summerzie your understanding
 - When you understand the RMD, the list the readmes in public/readme and numbered them, #1 - #x. 
 - A shortcut for RMD requests is  to  use the command RMD [#3]


 - When you understand the RMD, the list the readmes in public/readme and numbered them. 
 - A short cut is the say RMD #3


## Master Calendar System Architecture

This admin app is part of a larger system with four interconnected applications:

1. **calendar-be**  - Backend API server
   - MongoDB data storage with Mongoose ODM
   - Express.js REST API endpoints
   - Firebase authentication integration
   - Runs on port 3010

2. **calops** (THIS APPLICATION)- Admin dashboard (port 3008)
   - Manages users, organizations, locations 
   - Administrative functions for system maintenance
   - Connects to this backend API
   - React/Next.js with Material UI

3. **tangotiempo.com** - Public calendar site (port 3001)
   - Event browsing/creation for end users
   - User authentication with Firebase
   - Regional location filtering
   - React/Next.js with custom UI components

4. **harmonyjunction.org** - Secondary branded site (port 3002)
   - Same functionality as tangotiempo.com with different branding
   - Shares this same backend API
   - Identical data models and endpoints

## Build/Lint Commands

- Start backend server: `npm start`
- Backend development mode: `npm run dev`
- Format with Prettier: `npm run prettier`
- Lint with ESLint: `npm run eslint`
- Prepare code (lint and format): `npm run prep`
- Verify backend environment: `npm run verify:env`
- The user will always try to have the local server runnin on por 3010. USe and test with it.
- You can start the server on antihe port if the needs fit.

## API Endpoints Overview

The backend provides these main API endpoints that serve all frontend applications:

- `/api/events` - Event CRUD operations with unified filtering
  - GET: Retrieves events filtered by location or organizer role
  - POST: Creates new events (requires authentication)
  - PUT: Updates events (requires owner authentication)
  - DELETE: Removes events (requires owner authentication)

- `/api/userlogins` - User management
  - GET: Retrieve user information 
  - POST: Create/update user records
  - Connects with Firebase authentication

- `/api/organizers`, `/api/venues`, `/api/locations` - Entity management
  - Standard CRUD operations for these entities
  - Organizers are linked to userlogins via organizerId

- `/api/roles`, `/api/regions` - Reference data
  - Manages user roles and geographical hierarchies

## Code Style Guidelines

- **Pattern**: CommonJS (require/exports) with semicolons and single quotes
- **Naming**: camelCase for variables/functions, PascalCase for models
- **Imports**: Group third-party libraries first, then local modules
- **Error Handling**: Use logger.js utility for errors, HTTP status codes for API responses
- **Node Version**: v22+ recommended

- Use ES Modules with standard import order (React → Libraries → Local)
- Prefer aliased imports with `@/` prefix via jsconfig.json
- React components: Functional components with hooks
- Error handling: Use try/catch with specific error messages and appropriate status codes
- API routes: RESTful patterns with resource-based paths
- Structure: Maintain separation between API routes, components, and models
- MongoDB integration: Follow existing model patterns
- Failover solutions : do not code short cuts. Move to instruct what is needed to complete.
- Follow world class best practives. Better stable solid practives architecture and best pattern are much better than a working solution.
- Code assuming the code is expected to go from DEV to TEST to PROD.
- Produce Code that is world class and production ready.
- The data is present and dont make it up.


### Prohibited Patterns

## 1 - Dont create Fallback patterns . 
 - Dont defer great code to later. Build in error patterns not failback.

## 2 - dont make mock data (unless told to).
 - mock data desires probably mean you need an api or clafiricagtions of the data

## 3 - dont use logic that is "API is not fully implemented there fore."
 - if the API need complete, then tell me and we will do it.



## Project Structure

- `/routes` - API endpoint handlers (e.g., serverEvents.js)
- `/models` - Mongoose models (e.g., events.js, userLogins.js)
- `/middleware` - Auth and rate limiting middleware
- `/utils` - Utility functions and helpers
- `/lib` - Core libraries (e.g., firebaseAdmin.js)

## Important Implementation Details

- Authentication uses Firebase Admin SDK through middleware/authMiddleware.js
- Event filtering supports both geographic and role-based approaches (see serverEvents.js)
- MongoDB connection managed through db.js
- Error logging through utils/logger.js



## Backend API Structure

###Important your have acces to the Backend Code.  It is in  the link ./be-info.  IF you cannot see this folder tell me and i will recreate.

1. **Main Events Endpoints**:
   - `GET /api/events` - List events with filters (pagination, date range, location)
   - `GET /api/events/id/:id` - Get single event by ID
   - `POST /api/events/post` - Create event (requires authentication)
   - `PUT /api/events/:eventId` - Update event (requires authentication)
   - `DELETE /api/events/:eventId` - Delete event (requires authentication)

2. **Venues Endpoints**:
   - `GET /api/venues` - List venues with pagination and filtering
   - `GET /api/venues/:id` - Get a specific venue by ID
   - `POST /api/venues` - Create a new venue
   - `PUT /api/venues/:id` - Update a venue
   - `DELETE /api/venues/:id` - Delete a venue
   - `GET /api/venues/nearest-city` - Find nearest city to coordinates

3. **Geo Hierarchy Endpoints**:
   - `GET /api/masteredLocations/countries` - List all countries
   - `GET /api/masteredLocations/regions` - List regions (filtered by country)
   - `GET /api/masteredLocations/divisions` - List divisions (filtered by region)
   - `GET /api/masteredLocations/cities` - List cities (filtered by division)

4. **Required Parameters**:
   - `appId` - Required for all endpoints
   - Authentication - Required for POST, PUT, DELETE operations


Always run `npm run eslint` and `npm run prettier` before committing changes.
