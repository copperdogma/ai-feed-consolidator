"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var dotenv_1 = require("dotenv");
// Load environment variables
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3003', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'development-secret-key',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    serverUrl: process.env.SERVER_URL || 'http://localhost:3003',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-dev'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || ''
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3003/api/auth/google/callback'
    }
};
// Validate required environment variables
var requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY'
];
// Validate required environment variables
requiredEnvVars.forEach(function (envVar) {
    if (!process.env[envVar]) {
        throw new Error("Missing required environment variable: ".concat(envVar));
    }
});
