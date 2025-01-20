import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  readonly databaseUrl: string;
  readonly port: string | 3003;
  readonly clientUrl: string;
  readonly serverUrl: string;
  readonly sessionSecret: string;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
}

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/aifeed',
  port: process.env.PORT || 3003,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3003',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-key',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
};

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