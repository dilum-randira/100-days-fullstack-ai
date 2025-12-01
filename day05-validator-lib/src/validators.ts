import { ValidationResult, Validator } from "./types";

/**
 * Validate that a string is not empty after trimming whitespace.
 */
export const required: Validator<string> = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, message: "This field is required." };
  }
  return { valid: true };
};

/**
 * Validate that a string has at least `min` characters.
 *
 * @param min - Minimum allowed length.
 * @returns A validator function for strings.
 */
export function minLength(min: number): Validator<string> {
  return (value) => {
    if (value.length < min) {
      return {
        valid: false,
        message: `Must be at least ${min} characters long.`,
      };
    }
    return { valid: true };
  };
}

/**
 * Validate that a string has at most `max` characters.
 *
 * @param max - Maximum allowed length.
 * @returns A validator function for strings.
 */
export function maxLength(max: number): Validator<string> {
  return (value) => {
    if (value.length > max) {
      return {
        valid: false,
        message: `Must be at most ${max} characters long.`,
      };
    }
    return { valid: true };
  };
}

/**
 * Simple email validation using a lightweight regular expression.
 * This is not perfect, but good enough for basic checks.
 */
export const isEmail: Validator<string> = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  return { valid: true };
};

/**
 * Validate that a password is reasonably strong.
 *
 * Rules:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one digit
 */
export const isStrongPassword: Validator<string> = (value) => {
  if (value.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /\d/.test(value);

  if (!hasLetter || !hasDigit) {
    return {
      valid: false,
      message: "Password must include at least one letter and one number.",
    };
  }

  return { valid: true };
};

/**
 * Very simple phone number validation.
 *
 * Allows digits, spaces, "+", "-", and parentheses.
 * This is intentionally loose and not region-specific.
 */
export const isPhoneNumber: Validator<string> = (value) => {
  const phoneRegex = /^[+\d\s\-()]+$/;
  if (!phoneRegex.test(value)) {
    return {
      valid: false,
      message: "Please enter a valid phone number.",
    };
  }
  return { valid: true };
};

/**
 * Validate that a number is within the inclusive range [min, max].
 *
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 */
export function isNumberInRange(min: number, max: number): Validator<number> {
  return (value) => {
    if (value < min || value > max) {
      return {
        valid: false,
        message: `Must be between ${min} and ${max}.`,
      };
    }
    return { valid: true };
  };
}

/**
 * Combine multiple validators into one.
 *
 * Validators run in order. The first failing result is returned.
 * If all validators pass, `{ valid: true }` is returned.
 *
 * @typeParam T - The type of value being validated.
 * @param validators - One or more validators to combine.
 * @returns A new validator that runs all provided validators.
 */
export function combineValidators<T>(
  ...validators: Validator<T>[]
): Validator<T> {
  return (value: T): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}
