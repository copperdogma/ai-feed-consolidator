import session from 'express-session';
import connectMemoryStore from 'memorystore';
import { config } from '../config';

// Extend express session types
declare module 'express-session' {
  export interface SessionData {
    passport: { user: number };
  }
}

const MemoryStore = connectMemoryStore(session);

export function configureSession() {
  return session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'ai-feed-session',
    rolling: true
  });
} 