# Authentication Credentials & Setup

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

## Google OAuth
- **Project Name**: AI Feed Consolidator
- **Project ID**: ai-feed-consolidator
- **Application Type**: Web Application
- **Environment**: Development
- Client ID: [Get from Google Cloud Console]
- Client Secret: [Get from Google Cloud Console]
- OAuth Callback: `http://localhost:3003/api/auth/google/callback`
- Authorized Origins:
  - Frontend: `http://localhost:5173`
  - Backend: `http://localhost:3003`

### Development URLs
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3003`

### Required Environment Variables
These should be set in `.env`:
```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
SESSION_SECRET=<random string for session encryption>
```

### Google Cloud Console Setup
1. Project Dashboard: https://console.cloud.google.com/apis/dashboard
2. OAuth Consent Screen Settings:
   - Application Type: External
   - Authorized Domains: localhost
   - Scopes: email, profile
   - Test Users: Your development email(s)

### API & Services
Required APIs enabled:
- Google OAuth2 API
- Google+ API

### Security Notes
1. Current setup is for development only
2. Production deployment will need:
   - Updated OAuth consent screen settings
   - New production credentials
   - HTTPS endpoints
   - Secure cookie settings
   - Rate limiting
   - CSRF protection

### Access
- Google Cloud Console access should be limited to development team
- Credentials are managed through Google Cloud Console
- Local `.env` file should never be committed to version control 