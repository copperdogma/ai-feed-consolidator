export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GoogleProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
} 