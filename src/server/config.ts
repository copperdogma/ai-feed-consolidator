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
  readonly openai?: {
    readonly apiKey: string;
  };
  readonly feedly?: {
    readonly auth: {
      readonly userId: string;
      readonly accessToken: string;
      readonly refreshToken: string;
    };
    readonly clientId: string;
    readonly clientSecret: string;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || (isDevelopment ? 'postgresql://postgres:postgres@localhost:5433/aifeed' : ''),
  port: process.env.PORT || 3003,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3003',
  sessionSecret: process.env.SESSION_SECRET || (isDevelopment || isTest ? 'local-dev-secret' : ''),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  openai: process.env.OPENAI_API_KEY ? {
    apiKey: process.env.OPENAI_API_KEY
  } : undefined,
  feedly: (process.env.FEEDLY_USER_ID && process.env.FEEDLY_ACCESS_TOKEN && process.env.FEEDLY_REFRESH_TOKEN) ? {
    auth: {
      userId: process.env.FEEDLY_USER_ID,
      accessToken: process.env.FEEDLY_ACCESS_TOKEN,
      refreshToken: process.env.FEEDLY_REFRESH_TOKEN
    },
    clientId: process.env.FEEDLY_CLIENT_ID || '',
    clientSecret: process.env.FEEDLY_CLIENT_SECRET || ''
  } : undefined
};

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

// Add session secret to required vars in production
if (!isDevelopment && !isTest) {
  requiredEnvVars.push('SESSION_SECRET');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
} 