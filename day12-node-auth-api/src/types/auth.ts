import type { User } from "../models/user";

export interface AuthRequestUserPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, "id" | "name" | "email">;
}

export interface ApiError {
  message: string;
}
