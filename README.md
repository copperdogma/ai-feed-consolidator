# AI Feed Consolidator

A personal platform for managing and consuming content from various services by integrating with their native flagging systems, providing intelligent summaries, and maintaining a unified interface for content review and prioritization.

## Core Features

- **Platform Integration**
  - YouTube Watch Later
  - X/Twitter Bookmarks
  - RSS Feed Integration
  - Email-based flagging
  - Slack saved items

- **Intelligent Summaries**
  - Two-level summary system
    - Level 1: Core points and direct answers
    - Level 2: Detailed overview with context
  - Time-to-consume estimates
  - Automatic topic detection
  - Priority-based organization

- **Unified Interface**
  - Topic-based content grouping
  - Priority management
  - Cross-platform content alignment
  - Historical tracking
  - Advanced search capabilities

## Features
- YouTube Channel Integration

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- Google Cloud Platform account (for OAuth)
- OpenAI API key (for summaries)
- Firebase project (for authentication)

### Installation
1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-feed-consolidator.git
cd ai-feed-consolidator
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Install dependencies:
```bash
npm install
```

##***REMOVED*** Setup

#### Client-Side Setup
1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Add a web app to your project
3. Enable Google Authentication in the Firebase Console (Authentication > Sign-in method)
4. Copy your Firebase config values to your `.env` file:
   ```
   VITE_FIREBASE_API_KEY="your-firebase-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
   VITE_FIREBASE_APP_ID="your-app-id"
   ```

#### Server-Side Setup (Firebase Admin SDK)
1. Go to your Firebase project settings > Service accounts
2. Click "Generate new private key" to download a service account JSON file
3. Store this file securely (never commit it to version control)
4. Configure the Admin SDK in your `.env` file using one of these methods:

   **Option 1: Using GOOGLE_APPLICATION_CREDENTIALS (Recommended)**
   ```
   GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account-file.json"
   ```

   **Option 2: Using FIREBASE_SERVICE_ACCOUNT_PATH**
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH="/absolute/path/to/service-account-file.json"
   ```

   **Option 3: Using FIREBASE_SERVICE_ACCOUNT (JSON content)**
   ```
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
   ```

### Development
Start the development server:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3003
- Database: PostgreSQL on port 5433

## Project Structure
```
docs/
  ├── spec.md      # Detailed specifications
  ├── design.md    # Technical design
  ├── todo.md      # Task tracking
  └── log.md       # Project history
```

## Performance Goals
- Platform sync: <30 seconds
- Summary generation: <5 seconds
- UI responsiveness with 10,000+ items
- Efficient historical data access
- Quick priority management (≤2 clicks)
- Original content access (1 click)

## Development Status
Check [CHANGELOG.md](./CHANGELOG.md) for the latest updates.

Current Status: Early Development
- ✅ Authentication system
- 🚧 Platform integrations
- 🚧 Summary generation
- 🚧 Topic organization

## Deployment
Two deployment options are supported:
1. Local: Docker on Mac Mini home server
2. Cloud: fly.io deployment

## Contributing
This is primarily a personal-use project, but suggestions and improvements are welcome. Please read our contributing guidelines before submitting pull requests.

## Acknowledgments
This project draws inspiration from:
- [auto-news](https://github.com/finaldie/auto-news) - A personal news aggregator with LLM integration

## License
[License type to be determined]
