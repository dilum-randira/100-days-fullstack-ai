// Simple validation helpers for the Day 10 form demo.

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export type Validator<T = unknown> = (value: T) => ValidationResult;

/** Validate that a string is not empty after trimming. */
export const required: Validator<string> = (value) => {
  if (!value.trim()) {
    return { valid: false, message: "This field is required." };
  }
  return { valid: true };
};

/**
 * Validate that a string has at least `min` characters.
 */
export const minLength = (min: number): Validator<string> => (value) => {
  if (value.length < min) {
    return {
      valid: false,
      message: `Must be at least ${min} characters long.`,
    };
  }
  return { valid: true };
};

/** Simple email validator using a lightweight regex. */
export const isEmail: Validator<string> = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  return { valid: true };
};

/**
 * Combine multiple validators. Returns the first failing result or `{ valid: true }`.
 */
export const combineValidators = <T,>(
  ...validators: Validator<T>[]
): Validator<T> => {
  return (value: T): ValidationResult => {
    for (const validate of validators) {
      const result = validate(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
};
