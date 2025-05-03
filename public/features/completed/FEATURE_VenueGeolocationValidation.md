# FEATURE_3002_VenueGeolocationValidation

## Summary
This feature implements a system to validate venue geolocation data imported from BTC and update the `isValidVenueGeolocation` flag on venues with confirmed, accurate coordinates. It adds validation functionality to the venue management interface and provides a batch process to update existing venues.

## Motivation
- Improve accuracy of event geographic data across the system
- Ensure consistent location data for map-based features
- Identify and correct venues with missing or inaccurate coordinates
- Establish confidence levels for venue geolocation to support geographic filtering

## Scope
### In-Scope
- Validating venue geolocation data using the nearest-city API
- Updating the `isValidVenueGeolocation` flag for venues
- Adding a validation interface to the venue management page
- Implementing a batch process to validate existing venues
- Integrating validation into the BTC import process

### Out-of-Scope
- Modifying the underlying venue geolocation data model
- Adding manual coordinate input tools beyond what already exists
- Creating a visualization or mapping interface for venue locations
- Integration with external geocoding services

## Feature Behavior
| Area       | Behavior Description                                  |
|------------|--------------------------------------------------------|
| UI         | New validation indicators and features in venue management |
| API        | New batch validation endpoint for venues               |
| Backend    | Updates to entity-resolution.js to use validation flag  |
| Integration | Rate-limited validation to respect API service limits  |

## Design
The feature will add a validation system to the existing venue management functionality:

1. A new validation badge will show validation status on each venue entry
2. A batch validation process will update venues in configurable page sizes
3. The import process will automatically validate any imported venues

## Tasks
| Status         | Task                                           | Last Updated  |
|----------------|------------------------------------------------|---------------|
| ✅ Complete     | Create validation endpoint for venue geolocation | 2025-04-25    |
| ✅ Complete     | Implement batch validation function              | 2025-04-25    |
| ✅ Complete     | Update entity-resolution.js for validation       | 2025-04-25    |
| ✅ Complete     | Add validation UI components to venue management | 2025-04-25    |
| ✅ Complete     | Add validation during BTC venue import           | 2025-04-25    |
| ✅ Complete     | Add validation status indicators to venue list   | 2025-04-25    |
| ⏳ Pending      | Test validation with a range of venues           | 2025-04-25    |
| ⏳ Pending      | Document usage in application documentation      | 2025-04-25    |

## Rollback Plan
If rollback is required:
- Disable venue validation UI components
- Return `isValidVenueGeolocation` flag to default state (false) for all venues
- Remove validation logic from BTC import process
- Revert code changes in API endpoints and entity resolution

## Dependencies
- Existing venue model with `isValidVenueGeolocation` field
- Nearest-city API functionality
- Venue management interface
- BTC import functionality

## Linked Issues / Docs
- Related to BTC venue import functionality
- Depends on venue geo-hierarchy endpoints
- Supports upcoming map visualization features

## Owner
Claude & Team

## Timeline
| Milestone | Date       |
|-----------|------------|
| Created   | 2025-04-25 |
| First Dev | 2025-04-25 |
| Review    | 2025-04-25 |
| Completed | 2025-04-25 |

## Implementation Details

### API Endpoint
The new validation endpoint will be added at `/api/venues/validate-geo`:
- Accept POST requests with venue IDs to validate
- For each venue, check if coordinates are valid
- Update the `isValidVenueGeolocation` flag based on validation
- Support batch processing with configurable limits

### Validation Logic
A venue's geolocation will be considered valid if:
1. It has both latitude and longitude coordinates
2. The coordinates map to a known city within a reasonable distance
3. The coordinates appear to be within the expected geographic range

### UI Components
The venue management UI will be enhanced with:
- Validation status indicators for each venue
- A batch validation button for processing multiple venues
- Filtering options to view only validated or unvalidated venues

### Import Integration
The BTC venue import process will:
- Attempt to validate venues as they are imported
- Set appropriate validation flags based on results
- Allow users to see validation status during import