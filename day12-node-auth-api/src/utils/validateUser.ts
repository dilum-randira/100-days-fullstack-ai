interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateRegisterPayload(body: any): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Body must be a JSON object." };
  }

  const { name, email, password } = body;

  if (typeof name !== "string" || !name.trim()) {
    return { valid: false, message: "'name' is required and must be a non-empty string." };
  }

  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, message: "'email' is required and must be a non-empty string." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: "'email' must be a valid email address." };
  }

  if (typeof password !== "string" || password.length < 6) {
    return { valid: false, message: "'password' must be at least 6 characters long." };
  }

  return { valid: true };
}

export function validateLoginPayload(body: any): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Body must be a JSON object." };
  }

  const { email, password } = body;

  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, message: "'email' is required and must be a non-empty string." };
  }

  if (typeof password !== "string" || !password) {
    return { valid: false, message: "'password' is required." };
  }

  return { valid: true };
}
