import {
  required,
  minLength,
  maxLength,
  isEmail,
  isStrongPassword,
  isPhoneNumber,
  isNumberInRange,
  combineValidators,
  ValidationResult,
} from "./index";

// Example "user registration" object
interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
  phone: string;
}

const form: RegistrationForm = {
  name: "Di",
  email: "user@example.com",
  password: "Password123",
  confirmPassword: "Password123",
  age: 25,
  phone: "+1 555-123-4567",
};

// Helper to log validation results in a friendly way
function logResult(field: string, result: ValidationResult) {
  if (result.valid) {
    console.log(`${field}: ✅ valid`);
  } else {
    console.log(`${field}: ❌ ${result.message ?? "Invalid value"}`);
  }
}

function validateRegistration(data: RegistrationForm) {
  console.log("Validating registration form...\n");

  const nameValidator = combineValidators<string>(
    required,
    minLength(2),
    maxLength(50),
  );

  const passwordValidator = combineValidators<string>(
    required,
    isStrongPassword,
  );

  const ageValidator = isNumberInRange(18, 120);

  logResult("name", nameValidator(data.name));
  logResult("email", combineValidators<string>(required, isEmail)(data.email));
  logResult("password", passwordValidator(data.password));

  // Confirm password: simple check in-place
  const confirmPasswordResult: ValidationResult =
    data.password === data.confirmPassword
      ? { valid: true }
      : { valid: false, message: "Passwords do not match." };
  logResult("confirmPassword", confirmPasswordResult);

  logResult("age", ageValidator(data.age));
  logResult(
    "phone",
    combineValidators<string>(required, isPhoneNumber)(data.phone),
  );
}

validateRegistration(form);
