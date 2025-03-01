import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  sessionSecret: string;
  clientUrl: string;
  serverUrl: string;
  database: {
    url: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'development-secret-key',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3003',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-dev'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10)
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3003/api/auth/google/callback'
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}); 