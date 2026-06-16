export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string> | null;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T | null;
  error: ApiError | null;
  path: string;
  timestamp: string;
}

export interface AuthTokenResponse {
  otpRequired: false;
  message: string;
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface OtpPendingResponse {
  otpRequired: true;
  message: string;
  loginToken: string;
  username?: string;
}

export type AuthResponse = AuthTokenResponse | OtpPendingResponse;
