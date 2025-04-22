# CalOps Architecture

This document provides an overview of the CalOps application architecture after refactoring.

## Application Overview

CalOps is an administrative dashboard for the Master Calendar system. It provides functionality for managing users, organizers, locations, and other aspects of the calendar platform.

## Architecture Pattern

The application follows a feature-based architecture pattern with shared components and utilities. Each major feature (like user management or organizer management) is structured as a self-contained module with its own components, hooks, contexts, and utilities.

## Directory Structure

```
src/
  ├── app/                     # Next.js app directory (pages)
  │   ├── dashboard/           # Dashboard pages
  │   │   ├── users/           # User management page
  │   │   ├── organizers/      # Organizer management page
  │   │   └── ...              # Other dashboard pages
  │
  ├── components/              # Shared components
  │   ├── common/              # Reusable UI components
  │   │   ├── ConfirmDialog.js # Confirmation dialog
  │   │   ├── DataGridWrapper.js # Data grid with loading state
  │   │   ├── ErrorBoundary.js # Error handling component
  │   │   ├── SearchBar.js     # Search input with icon
  │   │   └── TabPanel.js      # Tab content wrapper
  │   │
  │   ├── users/               # User-specific form components
  │   ├── organizers/          # Organizer-specific form components
  │   └── ...                  # Other component categories
  │
  ├── features/                # Feature modules
  │   ├── users/               # User management feature
  │   │   ├── components/      # User feature components
  │   │   │   ├── UserPage.js  # Main user page component
  │   │   │   ├── tabs/        # Tab-specific components
  │   │   │   └── dialogs/     # Dialog components
  │   │   │
  │   │   ├── context/         # User state management
  │   │   │   ├── UserContext.js # Context provider
  │   │   │   └── userReducer.js # State reducer
  │   │   │
  │   │   ├── hooks/           # User-specific hooks
  │   │   │   ├── useUserData.js # Data fetching/manipulation
  │   │   │   └── useUserFilters.js # Search/filtering
  │   │   │
  │   │   └── utils/           # User utilities
  │   │       ├── columnDefinitions.js # DataGrid columns
  │   │       └── userTransformers.js  # Data transformation
  │   │
  │   └── organizers/          # Organizer management feature
  │       ├── components/      # Organizer feature components
  │       │   ├── OrganizerPage.js # Main organizer page
  │       │   ├── tabs/        # Tab-specific components
  │       │   ├── dialogs/     # Dialog components
  │       │   └── import/      # Import-specific components
  │       │
  │       ├── context/         # Organizer state management
  │       ├── hooks/           # Organizer-specific hooks
  │       └── utils/           # Organizer utilities
  │
  ├── lib/                     # Shared libraries and API clients
  └── utils/                   # Global utility functions
```

## Key Architectural Components

### Shared Components

The `components/common/` directory contains reusable UI components that are shared across features:

- **ConfirmDialog**: A reusable confirmation dialog with customizable messages
- **DataGridWrapper**: Wraps MUI DataGrid with loading state and consistent styling
- **ErrorBoundary**: Catches and displays errors gracefully
- **SearchBar**: A search input with an icon and consistent styling
- **TabPanel**: A component for displaying tab content

### Context Providers

Each feature has its own context provider for state management:

- **UserContext**: Manages user data, filtering, and UI state
- **OrganizerContext**: Manages organizer data, filtering, import state, and UI state

### Custom Hooks

Custom hooks encapsulate the business logic and data fetching:

- **useUserData**: Handles fetching, updating, creating, and deleting users
- **useUserFilters**: Manages user filtering and search
- **useOrganizerData**: Handles organizer data operations
- **useOrganizerFilters**: Manages organizer filtering and search
- **useImport**: Manages the BTC organizer import process

### Feature Components

Each feature is composed of smaller, focused components:

- **Tab Components**: Render specific views (All, Organizers, Admins, etc.)
- **Dialog Components**: Handle edit, create, and other modal interactions
- **Main Page Component**: Orchestrates the feature's components and hooks

## State Management Pattern

1. **Context + Reducer Pattern**: Each feature uses React Context with useReducer for state management
2. **Action Types**: Clear action types for all state changes
3. **Dispatch**: Components dispatch actions to update state
4. **Selectors**: Components access state directly from context

## Data Flow

1. **API Requests**: Custom hooks make API requests using api-client or axios
2. **Data Processing**: Raw data is processed and transformed
3. **State Updates**: Processed data is stored in context via reducer
4. **UI Updates**: Components react to state changes

## Error Handling

1. **Error Boundaries**: Catch and display errors at the page level
2. **Try/Catch**: All async operations are wrapped in try/catch
3. **Error State**: Errors are stored in context and displayed to the user

## Benefits of the New Architecture

1. **Modularity**: Features are self-contained and can be developed independently
2. **Reusability**: Common components and hooks promote code reuse
3. **Maintainability**: Clear separation of concerns makes code easier to maintain
4. **Scalability**: New features can follow the same pattern
5. **Performance**: Optimized rendering with context and callbacks

## Implementation Example

Here's a simplified example of how the architecture works in practice:

```jsx
// In the page file (app/dashboard/users/page.js)
export default function UsersPage() {
  return (
    <ErrorBoundary componentName="User Management">
      <UserPage />
    </ErrorBoundary>
  );
}

// In the feature component (features/users/components/UserPage.js)
function UserPageContent() {
  const { tabValue, searchTerm } = useUserContext();
  const { fetchUsers } = useUserData();
  const { setTabValue, setSearchTerm } = useUserFilters();
  
  // Component logic and JSX...
}

export default function UserPage() {
  return (
    <UserProvider>
      <UserPageContent />
    </UserProvider>
  );
}
```

## Conclusion

This architecture provides a scalable, maintainable foundation for the CalOps application. By separating concerns and following a consistent pattern, it makes the codebase easier to understand, modify, and extend.