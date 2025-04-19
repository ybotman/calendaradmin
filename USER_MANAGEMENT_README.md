# User Management in Calendar Admin

This document describes the User Management functionality in the Calendar Admin application.

## Architecture Overview

### Data Structure

The User Management UI combines data from two collections:

1. **userLogins Collection**
   - Contains user authentication information
   - Stores `firebaseUserId` from Firebase Authentication
   - Includes user roles, permissions, and preferences
   - Contains `regionalOrganizerInfo.organizerId` pointing to associated organizer records

2. **organizers Collection**
   - Contains organizer information (venues, teachers, event creators, etc.)
   - Stores `firebaseUserId` linking to a user in userLogins (if applicable)
   - Some organizers may not have an associated user account

### User-Organizer Relationship

- **Bidirectional References**:
  - User → Organizer: `user.regionalOrganizerInfo.organizerId`
  - Organizer → User: `organizer.firebaseUserId`
  - Only `firebaseUserId` is used to link users and organizers (previous versions used both `firebaseUserId` and `linkedUserLogin`)

- **User Types**:
  - Standard Users: Have a record in userLogins only
  - Organizer Users: Have records in both userLogins and organizers
  - Standalone Organizers: Have a record in organizers only (legacy data)

## User Interface

The User Management page provides three tabs:

1. **All Users Tab**
   - Shows all users and organizers combined
   - Displays both userLogins and organizers collection records
   - Provides a comprehensive view of all entities in the system

2. **Organizers Tab**
   - Focuses on users with organizer capabilities
   - Shows users with a link to an organizer record
   - Shows standalone organizer records
   - Displays organizer-specific fields

3. **Admins Tab**
   - Shows users with administrative roles
   - Filters for users with SystemAdmin or RegionalAdmin roles
   - Displays admin-specific fields

## Implementation Details

### Data Fetching

The UI fetches data from both collections:

```javascript
// 1. First get the user login records
const usersResponse = await fetch(`http://localhost:3010/api/userlogins/all?appId=${appId}`);
usersData = await usersResponse.json();

// 2. Then get the organizer records
const organizersResponse = await fetch(`http://localhost:3010/api/organizers?appId=${appId}&isActive=true`);
organizersData = await organizersResponse.json();
```

### Data Merging

The data is processed and merged:

```javascript
// Process organizers to match user format
const processedOrganizers = organizersData.map(organizer => {
  // Extract key information to match the user record structure
  return {
    _id: organizer._id,
    firebaseUserId: organizer.firebaseUserId || organizer.loginId || organizer._id.toString(),
    fullName: organizer.fullName || organizer.name,
    // ...other fields
    _isOrganizer: true // Marker for source
  };
});

// Avoid duplicates where an organizer is already linked to a user
const userFirebaseIds = new Set(usersData.map(u => u.firebaseUserId).filter(Boolean));

// Only include organizers that aren't already linked to a user
const uniqueOrganizers = processedOrganizers.filter(org => 
  !org.firebaseUserId || !userFirebaseIds.has(org.firebaseUserId)
);

// Combine all records
usersData = [...usersData, ...uniqueOrganizers];
```

### Field Normalization

The UI normalizes fields from both sources to provide a consistent view:

```javascript
// For organizer records, create a synthetic regionalOrganizerInfo
if (isOrganizerRecord) {
  regionalOrganizerInfo = {
    organizerId: user._id, // The organizer record itself is the organizerId
    isApproved: user.isEnabled !== false,
    isEnabled: user.isEnabled !== false,
    isActive: user.isActive !== false
  };
}
```

## Key Operations

### Viewing Users

- Combined view of both userLogins and organizers
- Filtering based on tab selection (All, Organizers, Admins)
- Search functionality across multiple fields

### Editing Users

- Role assignment
- Status management (active, approved, enabled)
- User-organizer connection management

### User-Organizer Connection

- Users can be connected to organizers and vice versa
- Edit screen supports selecting organizers to connect
- Handles bidirectional references automatically

### Firebase Synchronization

- Firebase users can be imported into the system
- User data is updated based on Firebase information
- New users from Firebase auth get default permissions

## Troubleshooting

### Missing Users

If users are not appearing in the UI:
- Check the backend API responses (`/api/userlogins/all` and `/api/organizers`)
- Verify that the appId parameter matches in both collections
- Check browser console for any errors in data processing

### Incorrect Tab Filtering

If users are appearing in the wrong tabs:
- Check the filtering criteria in the tab change handler
- Verify that isOrganizer and other flags are being set correctly
- Test with different user types to validate filtering logic

### Firebase Sync Issues

If Firebase synchronization is not working:
- Verify Firebase admin credentials in the backend
- Check the Firebase Admin SDK initialization in the server
- Monitor server logs for any Firebase authentication errors