# Firebase User Management for TangoTiempo

This documentation covers two methods for managing Firebase users in the TangoTiempo system:

1. **Synchronization via Admin UI** - Directly sync all Firebase users to the database via the User Management interface
2. **Script-based Import** - Import Firebase users from a JSON file using a script

## Architecture Overview

- **Frontend (calendaradmin)**: Next.js application that provides the UI
- **Backend (calendar-be)**: Node.js server running on port 3010 that handles API requests
- **Database**: MongoDB running on standard port 27017 (accessed through the backend)
- **Firebase Admin SDK**: Used for direct communication with Firebase Authentication

# Method 1: Firebase User Synchronization via Admin UI

The Admin UI provides a "Sync Firebase Users" button that directly communicates with Firebase Authentication to fetch all users and update the local database.

## Setup Instructions

### 1. Encode the Firebase Service Account JSON

First, encode your Firebase service account credentials to base64:

```bash
cd calendaradmin/scripts
node encode-firebase-json.js ../../tangotiempo-257ff-firebase-adminsdk-gx3rl-fc9b09dbd6.json
```

This will produce a base64-encoded string for your environment.

### 2. Set Environment Variables

Add the following environment variable to your environment:

For development:
- Create or edit `.env.local` in the `calendaradmin` directory
- Add `FIREBASE_JSON=YOUR_BASE64_ENCODED_STRING`

For production:
- Add the environment variable to your production environment
- Example for Vercel: Add it in the Environment Variables section of your project settings

### 3. Verify Setup

To verify that Firebase Admin SDK is properly initialized:

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3011/api/debug/firebase-status`
3. You should see a JSON response with `success: true` if everything is configured correctly

### 4. Using the Synchronization Feature

Once configured, you can synchronize Firebase users with the local database:

1. Go to User Management in the admin panel
2. Click "Sync Firebase Users" button
3. Confirm the operation

The system will:
- Fetch all users from Firebase Authentication
- Create or update corresponding records in your MongoDB database
- Assign default roles and permissions to new users

# Method 2: Script-based Firebase User Import

## Prerequisites

- Node.js installed
- TangoTiempo backend running (typically on port 3010)
- Firebase users exported as a JSON file

## Installation

Ensure you have the needed dependencies:

```bash
npm install axios mongodb
```

The script uses:
- `fs` and `path` (Node.js built-in)
- `axios` (for API requests)
- `mongodb` (only used as fallback if API is unavailable)

## Usage

```bash
# Basic usage - connects to backend API
node scripts/import-firebase-users.js ./path/to/firebase-users.json

# Specify custom backend URL if needed
API_URL="http://localhost:3010" node scripts/import-firebase-users.js ./firebase-users.json

# Alternative command-line options
node scripts/import-firebase-users.js ./firebase-users.json --apiUrl=http://localhost:3010
```

## Command-line Options

You can configure the script using either environment variables or command-line options:

| Environment Variable | Command-line Option | Description | Default |
|---------------------|---------------------|-------------|---------|
| `API_URL` | `--apiUrl=http://...` | Backend API URL | `http://localhost:3010` |
| `APP_ID` | `--appId=1` | Application ID | `1` |

## Fallback Mode

If the backend API is unavailable, the script will automatically fall back to direct MongoDB connection. This should only be used when the backend is down:

```
API approach failed. Connecting directly to MongoDB at mongodb://localhost:27017 as fallback...
NOTE: This should only be used when the backend API is unavailable.
```

## Firebase User Format

The script accepts different formats of Firebase user exports:

1. Array of user objects:
```json
[
  {
    "uid": "g11kldrWYrgm4b6VnTbRex4hLvi2",
    "email": "user@example.com",
    "displayName": "John Smith"
  },
  ...
]
```

2. Object with `users` array:
```json
{
  "users": [
    {
      "uid": "g11kldrWYrgm4b6VnTbRex4hLvi2",
      "email": "user@example.com",
      "displayName": "John Smith"
    },
    ...
  ]
}
```

3. Single user object:
```json
{
  "uid": "g11kldrWYrgm4b6VnTbRex4hLvi2",
  "email": "user@example.com",
  "displayName": "John Smith"
}
```

## Special Fields

The script recognizes these fields in your Firebase user objects:

- `uid` or `localId`: The Firebase user ID (required)
- `email`: User's email address
- `displayName` or `name`: User's display name (will be split into first/last name)
- `isRegionalOrganizer`: Boolean flag to mark user as RegionalOrganizer (optional)

## Import Process

1. The script first attempts to use the backend API to import users
2. If the API is unreachable, it falls back to direct MongoDB connection
3. Users receive the basic `User` role by default
4. Users with `isRegionalOrganizer: true` also get the `RegionalOrganizer` role

## Error Handling

- The script includes robust error handling for API connection issues
- A detailed log file (`firebase-import-log.json`) is created in the scripts directory
- Each user is processed individually, so errors with one user won't stop the entire import

## Troubleshooting

### Backend Connection Problems

If you encounter API connection errors:

```
API import failed: connect ECONNREFUSED 127.0.0.1:3010
Falling back to direct MongoDB connection...
```

Try these fixes:

1. Make sure the backend server is running on port 3010
2. Check if the backend URL is correct (`http://localhost:3010` by default)
3. If you're running in a different environment, set the correct API URL:
   ```bash
   API_URL="http://your-backend-url" node scripts/import-firebase-users.js ./firebase-users.json
   ```

### MongoDB Fallback Problems

If both API and MongoDB fallback approaches fail:

1. Ensure that MongoDB is running (typically on port 27017)
2. Check that you have the necessary MongoDB connection permissions
3. Verify that the database name is correct (default: "TangoTiempo")

### Input File Problems

If you see errors about the input file:

```
Error reading/parsing the input file: Unexpected token ... in JSON at position ...
```

1. Make sure your JSON file is valid (use a JSON validator)
2. Check if the file path is correct (should be relative to where you run the command)

## After Import

After successfully importing users:

1. Check the log file for details (`firebase-import-log.json`)
2. Verify the users in the MongoDB collection via the admin interface
3. Use the TangoTiempo admin interface to manage user roles if needed

For connecting users to organizers, use the User-Organizer connection functionality in the admin interface.

# Troubleshooting Firebase Integration Issues

## Common Issues with Firebase Admin SDK

| Issue | Possible Causes | Solutions |
|-------|----------------|-----------|
| Firebase Admin SDK not initializing | Missing or invalid FIREBASE_JSON environment variable | Regenerate the base64 string with the `encode-firebase-json.js` script and update environment |
| | Service account lacks permissions | Make sure Firebase service account has Authentication Admin permissions |
| | Firebase project ID mismatch | Verify that the service account is for the correct Firebase project |
| Authentication errors | Revoked service account | Generate a new service account key in Firebase console |
| | Project quotas exceeded | Check Firebase usage quotas in Google Cloud Console |
| Network errors | Firewall blocking access | Ensure outbound access to Google APIs is allowed |
| | Proxy issues | Configure appropriate proxy settings if using a corporate network |

## Diagnostic Steps

If you're experiencing issues with Firebase synchronization:

1. **Check Environment Variables**: Verify the `FIREBASE_JSON` variable is set correctly
   ```bash
   # Linux/Mac
   echo ${FIREBASE_JSON:0:20}...
   
   # Windows PowerShell
   echo $env:FIREBASE_JSON.Substring(0, 20) + "..."
   ```

2. **Validate Firebase JSON**: Make sure the service account JSON has all required fields
   ```bash
   node -e "console.log(JSON.parse(Buffer.from(process.env.FIREBASE_JSON, 'base64').toString()))"
   ```

3. **Test Firebase Connection**: Use the diagnostic endpoint
   ```bash
   curl http://localhost:3011/api/debug/firebase-status
   ```

4. **Check Backend Logs**: Look for specific Firebase-related errors
   ```bash
   # When running the admin UI
   npm run dev
   ```

## Tips for Success

- Always use a dedicated service account for production environments
- Apply the principle of least privilege to Firebase service accounts
- Rotate service account credentials periodically for security
- Never commit service account credentials to source control
- For local development, store the FIREBASE_JSON in `.env.local` (which is gitignored)