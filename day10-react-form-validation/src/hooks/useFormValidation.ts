import React from "react";
import type { ValidationResult, Validator } from "../validators";

export type FieldErrors<TValues> = Partial<Record<keyof TValues, string>>;

interface UseFormValidationArgs<TValues> {
  initialValues: TValues;
  validators: Partial<Record<keyof TValues, Validator<any>[]>>;
  onSubmit: (values: TValues) => void;
}

/**
 * Small custom hook for managing form values and field-level validation.
 */
export function useFormValidation<TValues extends Record<string, unknown>>({
  initialValues,
  validators,
  onSubmit,
}: UseFormValidationArgs<TValues>) {
  const [values, setValues] = React.useState<TValues>(initialValues);
  const [errors, setErrors] = React.useState<FieldErrors<TValues>>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof TValues, boolean>>
  >({});

  const validateField = React.useCallback(
    (name: keyof TValues, value: unknown): ValidationResult => {
      const fieldValidators = validators[name] ?? [];

      for (const validator of fieldValidators) {
        const result = validator(value as never);
        if (!result.valid) {
          return result;
        }
      }

      return { valid: true };
    },
    [validators],
  );

  const handleChange = <K extends keyof TValues>(
    name: K,
    value: TValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [name]: value }));

    const result = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: result.message }));
  };

  const handleBlur = (name: keyof TValues) => {
    setTouched((prev) => ({ ...prev, [name]: true }));

    const value = values[name];
    const result = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: result.message }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    let hasError = false;
    const newErrors: FieldErrors<TValues> = {};
    const newTouched: Partial<Record<keyof TValues, boolean>> = {};

    (Object.keys(values) as Array<keyof TValues>).forEach((name) => {
      newTouched[name] = true;
      const result = validateField(name, values[name]);
      if (!result.valid) {
        hasError = true;
        newErrors[name] = result.message ?? "Invalid value";
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (!hasError) {
      onSubmit(values);
    }
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
