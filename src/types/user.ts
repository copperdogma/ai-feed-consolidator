export interface User {
  id: number;
  google_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  theme: 'light' | 'dark';
  email_notifications: boolean;
  content_language: string;
  summary_level: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  user: User;
  preferences: UserPreferences[];
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
} 