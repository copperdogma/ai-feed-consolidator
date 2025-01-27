export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  feedly_access_token: string | null;
  feedly_refresh_token: string | null;
  feedly_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  feedlyAccessToken?: string | null;
  feedlyRefreshToken?: string | null;
  feedlyUserId?: string | null;
} 