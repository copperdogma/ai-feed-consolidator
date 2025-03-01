# Authentication Credentials & Setup

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet
20240228: Updated by Cam Marsollier with Claude 3.7 Sonnet to replace Google OAuth with Firebase Authentication

## Firebase Authentication
- **Project Name**: AI Feed Consolidator
- **Project ID**: ai-feed-consolidator
- **Authentication Method**: Firebase Authentication with Google provider
- **Environment**: Development
- **Web App**: AI Feed Consolidator (Web)

### Firebase Console Access
- [Firebase Console](https://console.firebase.google.com)
- Project: ai-feed-consolidator

### Required Environment Variables (Client-side)
These should be set in `.env`:
```env
VITE_FIREBASE_API_KEY=<from Firebase Console>
VITE_FIREBASE_AUTH_DOMAIN=<from Firebase Console>
VITE_FIREBASE_PROJECT_ID=<from Firebase Console>
VITE_FIREBASE_STORAGE_BUCKET=<from Firebase Console>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase Console>
VITE_FIREBASE_APP_ID=<from Firebase Console>
```

### Required Environment Variables (Server-side)
These should be set in `.env`:
```env
# Option 1: Service account JSON string
FIREBASE_SERVICE_ACCOUNT=<JSON string from Firebase Service Account>

# Option 2: Path to service account file
# GOOGLE_APPLICATION_CREDENTIALS=<path to service account JSON file>

# Option 3: Project ID (relies on Application Default Credentials)
# FIREBASE_PROJECT_ID=<from Firebase Console>

# Other required variables
SESSION_SECRET=<random string for session encryption>
```

### Development URLs
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3003`

### Firebase Console Setup
1. Authentication Dashboard: https://console.firebase.google.com/project/ai-feed-consolidator/authentication
2. Authentication Settings:
   - Sign-in providers: Google (enabled)
   - Authorized domains: localhost (development)

### Security Notes
1. Current setup is for development only
2. Production deployment will need:
   - Updated authorized domains
   - Proper service account configuration
   - HTTPS endpoints
   - Secure cookie settings
   - Rate limiting
   - CSRF protection

### Access
- Firebase Console access should be limited to development team
- Service account credentials should be properly secured
- Local `.env` file should never be committed to version control
- Service account keys should be rotated regularly 