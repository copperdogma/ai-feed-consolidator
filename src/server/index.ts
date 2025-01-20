import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { passport } from './middleware/auth';
import { config } from './config';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: config.sessionSecret,
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

// Auth Routes
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.clientUrl}/login`,
    successRedirect: config.clientUrl,
  })
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(config.clientUrl);
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

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 