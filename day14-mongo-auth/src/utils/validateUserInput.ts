const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string): boolean => emailRegex.test(value.toLowerCase());

export const isStrongPassword = (password: string): boolean => {
  // At least 8 chars, 1 upper, 1 lower, 1 number
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongPasswordRegex.test(password);
};

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateRegisterInput = (input: RegisterInput): ValidationResult => {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!input.email || !isEmail(input.email)) {
    errors.push('A valid email is required');
  }

  if (!input.password || !isStrongPassword(input.password)) {
    errors.push('Password must be at least 8 characters and include upper, lower, and number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
