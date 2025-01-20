import pino from 'pino';

// Initialize shared logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      },
      {
        target: 'pino/file',
        level: 'info',
        options: { 
          destination: './logs/app.log',
          mkdir: true
        }
      }
    ]
  }
}); 