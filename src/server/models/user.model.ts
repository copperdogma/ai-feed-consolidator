export interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  google_id?: string;
  google_profile?: {
    email: string;
    name: string;
    picture?: string;
  };
}

export interface UserPreferences {
  id: number;
  user_id: number;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
} 