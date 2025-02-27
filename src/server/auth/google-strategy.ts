import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import { config } from '../config';
import { logger } from '../logger';
import { GoogleAuthService } from '../services/google-auth-service';
import { LoginHistoryService } from '../services/login-history';
import { getServiceContainer } from '../services/service-container';

export function configureGoogleStrategy(): void {
  const googleAuthService = getServiceContainer().getService<GoogleAuthService>('googleAuthService');

  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl
  }, async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: any) => {
    try {
      const user = await googleAuthService.findOrCreateGoogleUser(profile);
      await LoginHistoryService.recordLogin(
        user.id,
        '/auth/google/callback',
        'unknown', // IP address will be added by middleware
        'google-oauth', // User agent will be added by middleware
      );
      done(null, user);
    } catch (error) {
      logger.error({ error }, 'Failed to authenticate with Google');
      done(error);
    }
  }));
} 