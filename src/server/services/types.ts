export interface LoginAttempt {
  userId: number;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  createdAt?: Date;
} 