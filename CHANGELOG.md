# Changelog

## [0.2.0] - 2024-02-28

### Changed
- Migrated from Google OAuth to Firebase Authentication
  - Added Firebase Web SDK integration
  - Implemented Firebase Admin SDK for server-side verification
  - Enhanced token verification with detailed logging
  - Added popup authentication with redirect fallback
  - Improved user feedback during authentication process

### Added
- Comprehensive Firebase Authentication documentation
  - Created `docs/firebase-auth.md` implementation guide
  - Updated `docs/auth-credentials.md` with Firebase details
  - Added deprecation notice to `oauth-google.md`

### Fixed
- Authentication flow and CORS issues
  - Updated CORS configuration to use specific client URL
  - Enhanced server-side verification with dedicated verify function
  - Improved state management for redirects

### Security
- Enhanced token validation with Firebase Admin SDK
- Updated environment variable requirements for Firebase
- Improved error handling throughout authentication flow

## [0.1.0] - 2024-01-20

### Added
- Google OAuth Authentication
  - Express backend with Passport.js integration
  - Session management with express-session
  - CORS configuration for secure frontend-backend communication
  - Protected API routes
  - Frontend authentication components
  - User profile display

### Documentation
- Added `docs/oauth-google.md` implementation guide
- Added `docs/auth-credentials.md` for credential management
- Updated `docs/design.md` with authentication architecture
- Updated `docs/todo.md` with completed items and next steps
- Added `docs/log.md` milestone entries

### Security
- Added secure session configuration
- Added environment variable management
- Updated `.gitignore` for credential security
- Added development environment security measures

### Development
- Added Vite proxy configuration
- Updated npm scripts
- Added TypeScript types for authentication 