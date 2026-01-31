export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  mobile?: string;
}

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  mobile: string | null;
  role: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
}
