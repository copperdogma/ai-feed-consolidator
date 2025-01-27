# Google OAuth 2.0 Implementation Guide

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

## Prerequisites
1. Node.js and npm installed
2. A Google Cloud Console account
3. A React + TypeScript project (we used Vite)

## Google OAuth Configuration

### Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Name: AI Feed Consolidator
   - Authorized JavaScript origins: 
     - `http://localhost:5173` (frontend)
     - `http://localhost:3003` (backend)
   - Authorized Redirect URIs: `http://localhost:3003/api/auth/google/callback` (backend)

### Server Configuration
The server uses Passport.js with the Google OAuth2.0 strategy:

```typescript
passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: 'http://localhost:3003/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  // ... auth logic ...
}));

// Auth routes
app.get('/api/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);
```

### Frontend Integration
The frontend redirects to the Google OAuth endpoint:

```typescript
<Button
  variant="contained"
  color="primary"
  onClick={() => window.location.href = 'http://localhost:3003/api/auth/google'}
  startIcon={<GoogleIcon />}
>
  Log in with Google
</Button>
```

## Environment Setup
1. Create a `.env` file in your project root:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_session_secret
```

2. Create `.env.example` as a template (without real values):
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SESSION_SECRET=
```

## Backend Setup
1. Install required packages:
```bash
npm install express express-session passport passport-google-oauth20 cors dotenv
npm install -D @types/express @types/express-session @types/passport @types/passport-google-oauth20 @types/cors
```

2. Create `src/server/index.ts`:
```typescript
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3003/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Here we'll add user to database if they don't exist
        // For now, just pass the profile
        return done(null, profile);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

// Auth Routes
app.get(
  '/api/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/login',
    successRedirect: 'http://localhost:5173/',
  })
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Protected route example
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Setup
1. Configure Vite proxy in `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

2. Create/update `src/App.tsx`:
```typescript
import { useEffect, useState } from 'react';
import './App.css';

interface User {
  id?: string;
  displayName?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3003/api/user', {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(userData => setUser(userData))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Welcome to AI Feed Consolidator</h1>
        <p>Please log in to continue</p>
        <a href="/auth/google" className="login-button">
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Welcome, {user.displayName}!</h1>
      {user.photos?.[0]?.value && (
        <img src={user.photos[0].value} alt="Profile" className="profile-image" />
      )}
      <p>Email: {user.emails?.[0]?.value}</p>
      <a href="/auth/logout" className="logout-button">
        Logout
      </a>
    </div>
  );
}

export default App;
```

3. Add styles in `src/App.css`:
```css
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 1rem 0;
}

.login-button, .logout-button {
  display: inline-block;
  padding: 0.8rem 1.6rem;
  margin: 1rem 0;
  background-color: #4285f4;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.login-button:hover, .logout-button:hover {
  background-color: #3367d6;
}

.logout-button {
  background-color: #dc3545;
}

.logout-button:hover {
  background-color: #c82333;
}
```

## Running the Application
1. Add scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "vite",
    "dev:server": "tsx watch src/server/index.ts"
  }
}
```

2. Install development dependencies:
```bash
npm install -D tsx concurrently
```

3. Start the application:
```bash
npm run dev
```

## Testing the Authentication Flow
1. Visit `http://localhost:5173`
2. Click "Sign in with Google"
3. Select your Google account and grant permissions
4. You should be redirected back to the app and see your profile information
5. Test the logout button to ensure it clears the session

## Common Issues and Solutions
1. **Error: redirect_uri_mismatch**
   - Double-check the callback URL in Google Cloud Console matches exactly with your server configuration
   - Ensure both protocol (http/https) and port number match

2. **CORS Issues**
   - Verify the CORS configuration in the backend matches your frontend URL
   - Ensure `credentials: 'include'` is set in frontend fetch calls
   - Check that the session cookie is being set properly

3. **Session Not Persisting**
   - Verify session configuration in Express
   - Check that cookies are being set and sent properly
   - Ensure all necessary middleware is in the correct order

4. **Database Connection Issues with Docker**
   - When running the database in Docker but the application outside Docker:
     - Use `localhost` instead of the service name in `DATABASE_URL`
     - Example: `postgresql://postgres:postgres@localhost:5433/aifeed` instead of `postgresql://postgres:postgres@db:5433/aifeed`
   - Ensure the database port is properly exposed in `docker-compose.yml`

5. **Multiple Auth Implementation Conflicts**
   - Keep only one authentication implementation to avoid conflicts
   - When using a custom auth middleware, ensure it's properly integrated with Passport
   - Remove any duplicate Passport strategy configurations

## Security Considerations
1. Always use HTTPS in production
2. Keep your `.env` file secure and never commit it to version control
3. Set appropriate cookie security options in production
4. Implement rate limiting for auth endpoints
5. Consider adding CSRF protection
6. Regularly rotate your session secret 