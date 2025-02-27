import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../logger';
import { LoginHistoryService } from '../services/login-history';
import { ServiceContainer } from '../services/service-container';

// Extend Express Request type
declare module 'express' {
  interface Request {
    requestInfo?: {
      ip: string;
      userAgent: string;
      path: string;
      method: string;
    };
  }
}

export const requireAuth = (container: ServiceContainer): RequestHandler => {
  const loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      // Only record failed login attempts for paths that look like login attempts
      if (req.path.toLowerCase().includes('login') || req.path.toLowerCase().includes('auth')) {
        const userAgent = (req.get('user-agent') || 'unknown') as string;
        const ipAddress = (req.ip || '0.0.0.0') as string;
        loginHistoryService.recordFailedAttempt(
          ipAddress,
          userAgent,
          'Unauthenticated request to protected route',
          req.path,
          req.session?.user?.id
        ).catch(error => {
          logger.error('Failed to record login attempt:', error);
        });
      }

      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }
    next();
  };
};

export function addRequestInfo(req: Request, res: Response, next: NextFunction): void {
  // Add request info to the request object
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip || '0.0.0.0';
  req.requestInfo = {
    ip: ipAddress,
    userAgent: typeof userAgent === 'string' ? userAgent : 'unknown',
    path: req.path,
    method: req.method
  };
  next();
} 