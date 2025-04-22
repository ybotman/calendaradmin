# API Integration Plan: Backend Integration for CalOps

This document outlines the phased approach to migrating the CalOps application to properly use the central calendar-be backend API instead of direct database connections.

## Overview

CalOps is currently using mixed approaches for data access:
1. Some features use the central backend API (via api-client.js)
2. Other features (particularly Events) attempt direct MongoDB connections
3. This inconsistency is causing 500 errors and maintenance challenges

## Testing Process

After each phase, we'll test the application using:

```bash
# Start the development server on port 3003
npm run dev

# In a separate terminal, verify the backend is running
curl http://localhost:3010/health

# Build the app to verify no compilation errors
npm run build
```

Testing should focus on the Events feature, particularly:
- Viewing events with different filter combinations
- Creating/editing test events
- Verifying proper error handling when the backend is unavailable

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
- [ ] Test events API endpoints directly (curl/Postman)

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

---

## Required Backend Information

To implement this plan properly, we need to understand:

1. **API Endpoints for Events**
   - Available endpoints and their parameters
   - Response formats and error codes
   - Any pagination or filtering requirements

2. **Authentication Requirements**
   - How authentication is handled between CalOps and calendar-be
   - Any API keys or tokens needed

3. **Data Models and Transformations**
   - Which fields are required/optional
   - Any data transformations needed between frontend/backend

4. **Error Handling Standards**
   - Standard error responses from the backend
   - How to handle specific error scenarios