export interface LoginUserInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  mobile: string | null;
  role: string;
  createdAt: Date;
}