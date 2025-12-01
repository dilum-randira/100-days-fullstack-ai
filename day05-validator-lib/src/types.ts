// Shared types for the validation library.

/** Result of a validation check. */
export type ValidationResult = {
  /** Whether the value passed the validation rule. */
  valid: boolean;
  /** Optional message when validation fails. */
  message?: string;
};

/**
 * A function that validates a value of type `T` and returns a ValidationResult.
 *
 * @typeParam T - The type of value being validated.
 */
export type Validator<T = unknown> = (value: T) => ValidationResult;
