export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export const users: User[] = [];
