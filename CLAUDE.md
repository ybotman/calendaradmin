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

3. **TangoTiempo.com**: Consumer-focused calendar interface for event browsing and discovery

4. **HarmonyJunction.org**: Regional tango event calendar with organizer management features

All applications share the same MongoDB database and Firebase authentication system, with Azure Blob Storage for media files. Changes made in the admin interface affect all connected frontend applications.