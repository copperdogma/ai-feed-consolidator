export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginHistory {
  id: number;
  user_id: number;
  login_time: Date;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  created_at: Date;
  updated_at: Date;
} 