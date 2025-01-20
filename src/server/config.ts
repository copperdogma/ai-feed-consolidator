import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration object with all environment variables
export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/aifeed',
  port: process.env.PORT || 3003,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'development-secret-key',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3003/auth/google/callback',
  },
  // Add more configuration as needed
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
} 