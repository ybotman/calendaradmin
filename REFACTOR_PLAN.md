# Admin UI Refactoring Plan

This document outlines our approach to refactoring the large User and Organizer management pages into a more maintainable architecture.

## Implementation Assessment

I've assessed the project and can confirm:

- We're working on the `REFACTOR_PLAN` branch for this implementation
- I have full permission to remove UserLogins data as needed (copies are available)
- No Firebase push operations will be performed during implementation
- The codebase can be freely tested during refactoring
- The implementation will follow the phased approach outlined below

## Goals

- Reduce component size and complexity
- Improve code organization and maintainability
- Separate concerns (data fetching, UI, state management)
- Maintain feature parity throughout the refactoring process
- Ensure the application remains functional at each step

## Architecture Overview

```
src/
  features/
    users/              # User management feature
      context/          # User-specific context
      hooks/            # Custom hooks for user operations
      components/       # UI components
    organizers/         # Organizer management feature
      context/          # Organizer-specific context
      hooks/            # Custom hooks for organizer operations
      components/       # UI components
  components/
    common/             # Shared components
```

## Implementation Phases

### Phase 1: Preparation and Shared Components (Week 1)

#### Step 1: Create shared components
- [x] Create `src/components/common/TabPanel.js`
- [x] Create `src/components/common/SearchBar.js`
- [x] Create `src/components/common/DataGridWrapper.js`
- [x] Create `src/components/common/ConfirmDialog.js`
- [x] Run `npm run dev` to verify

#### Step 2: Set up directory structure
- [x] Create directory structure for users feature
- [x] Create directory structure for organizers feature
- [x] Run `npm run dev` to ensure no issues

### Phase 2: Users Feature (Week 2-3)

#### Step 1: Context and Reducer
- [x] Create `src/features/users/context/UserContext.js`
- [x] Create `src/features/users/context/userReducer.js`
- [x] Run `npm run dev` to verify

#### Step 2: Custom Hooks
- [x] Create `src/features/users/hooks/useUserData.js`
- [x] Create `src/features/users/hooks/useUserFilters.js`
- [x] Run `npm run dev` to verify

#### Step 3: Tab Components
- [x] Create `src/features/users/components/tabs/AllUsersTab.js`
- [x] Create `src/features/users/components/tabs/OrganizersTab.js`
- [x] Create `src/features/users/components/tabs/AdminsTab.js`
- [x] Run `npm run dev` to verify

#### Step 4: Dialog Components
- [x] Create `src/features/users/components/dialogs/UserEditDialog.js`
- [x] Create `src/features/users/components/dialogs/UserCreateDialog.js`
- [x] Run `npm run dev` to verify

#### Step 5: Utilities
- [x] Create `src/features/users/utils/columnDefinitions.js`
- [x] Create `src/features/users/utils/userTransformers.js`
- [x] Run `npm run dev` to verify

#### Step 6: Main Page Component
- [x] Create `src/features/users/components/UserPage.js` (simplified version)
- [x] Update import in `src/app/dashboard/users/page.js` to use new component
- [x] Run `npm run dev` to verify
- [ ] Thorough testing of all user management functionality

### Phase 3: Organizers Feature (Week 4-5)

#### Step 1: Context and Reducer
- [ ] Create `src/features/organizers/context/OrganizerContext.js`
- [ ] Create `src/features/organizers/context/organizerReducer.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 2: Custom Hooks
- [ ] Create `src/features/organizers/hooks/useOrganizerData.js`
- [ ] Create `src/features/organizers/hooks/useOrganizerFilters.js`
- [ ] Create `src/features/organizers/hooks/useImport.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 3: Tab Components
- [ ] Create `src/features/organizers/components/tabs/AllOrganizersTab.js`
- [ ] Create `src/features/organizers/components/tabs/ActiveOrganizersTab.js`
- [ ] Create `src/features/organizers/components/tabs/InactiveOrganizersTab.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 4: Dialog Components
- [ ] Create `src/features/organizers/components/dialogs/OrganizerEditDialog.js`
- [ ] Create `src/features/organizers/components/dialogs/OrganizerCreateDialog.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 5: Import Components
- [ ] Create `src/features/organizers/components/import/ImportDialog.js`
- [ ] Create `src/features/organizers/components/import/ImportTable.js`
- [ ] Create `src/features/organizers/components/import/ImportProgress.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 6: Utilities
- [ ] Create `src/features/organizers/utils/columnDefinitions.js`
- [ ] Create `src/features/organizers/utils/organizerTransformers.js`
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 7: Main Page Component
- [ ] Create `src/features/organizers/components/OrganizerPage.js` (simplified version)
- [ ] Update import in `src/app/dashboard/organizers/page.js` to use new component
- [ ] Run `npm run lint` and `npm run dev` to verify
- [ ] Thorough testing of all organizer management functionality

### Phase 4: Cleanup and Optimization (Week 6)

#### Step 1: Error Boundaries
- [ ] Add error boundaries around key components
- [ ] Improve error messages and recovery mechanisms
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 2: Performance Optimization
- [ ] Review and optimize React memo usage
- [ ] Implement virtualization for large lists
- [ ] Run `npm run lint` and `npm run dev` to verify

#### Step 3: Final Testing
- [ ] End-to-end testing of all features
- [ ] Verify no regressions have been introduced
- [ ] Address any bugs or issues discovered

## Component Implementation Details

### User Context Example

```javascript
// src/features/users/context/UserContext.js
import { createContext, useReducer, useContext } from 'react';
import userReducer from './userReducer';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(userReducer, {
    users: [],
    filteredUsers: [],
    loading: false,
    error: null,
    // other state...
  });
  
  // Value to be provided
  const value = {
    ...state,
    dispatch,
  };
  
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
```

### Custom Hook Example

```javascript
// src/features/users/hooks/useUserData.js
import { useState, useEffect, useCallback } from 'react';
import { usersApi, rolesApi } from '@/lib/api-client';
import { useUserContext } from '../context/UserContext';

export default function useUserData(appId) {
  const { dispatch } = useUserContext();
  
  const fetchUsers = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_USERS_START' });
      
      // Fetch roles first
      const rolesData = await rolesApi.getRoles(appId);
      
      // Then fetch users
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_BE_URL}/api/userlogins/all?appId=${appId}`);
      const usersData = await usersResponse.json();
      
      // Process the data
      const processedUsers = processUsersData(usersData, rolesData);
      
      dispatch({ 
        type: 'FETCH_USERS_SUCCESS', 
        payload: { users: processedUsers, roles: rolesData } 
      });
    } catch (error) {
      dispatch({ type: 'FETCH_USERS_ERROR', payload: error.message });
    }
  }, [appId, dispatch]);
  
  // Other functions...
  
  return {
    fetchUsers,
    // other functions...
  };
}
```

## Progress Report

### Phase 1 and 2 Complete
We have successfully implemented Phase 1 (shared components) and most of Phase 2 (Users feature):

1. Created all shared components:
   - TabPanel, SearchBar, DataGridWrapper, and ConfirmDialog

2. Implemented the Users feature:
   - Context and reducer for centralized state management
   - Custom hooks for data fetching and filtering
   - Tab components for different user views
   - Dialog components for editing and creating users
   - Utility functions for data transformation
   - Main UserPage component that uses all these parts

3. Verified functionality:
   - Basic rendering works
   - Dev server starts without errors

### Next Steps
1. Complete thorough testing of the Users feature
2. Begin implementation of the Organizers feature (Phase 3)
3. Add error boundaries and optimize performance (Phase 4)

## Testing Checklist

For each phase, ensure the following is tested:

### User Management
- [ ] List displays correctly with proper pagination
- [ ] Filtering works across tabs
- [ ] User editing functions properly
- [ ] User creation works
- [ ] Firebase sync functionality works
- [ ] User deletion works
- [ ] Role management functions correctly

### Organizer Management
- [ ] List displays correctly with proper pagination
- [ ] Filtering works across tabs
- [ ] Organizer editing functions properly
- [ ] Organizer creation works
- [ ] Import from BTC works
- [ ] User connection/disconnection works
- [ ] Organizer deletion works

## Conclusion

This phased approach allows us to incrementally refactor the application while ensuring it remains functional throughout the process. By breaking down the work into manageable chunks and validating after each step, we can minimize risk and ensure a smooth transition to the new architecture.