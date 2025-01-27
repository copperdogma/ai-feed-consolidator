import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
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
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'development-secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3003',
  database: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/ai-feed-consolidator'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
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