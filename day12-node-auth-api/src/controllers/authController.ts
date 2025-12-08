import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, type User } from "../models/user";
import { validateLoginPayload, validateRegisterPayload } from "../utils/validateUser";
import type { ApiError, AuthResponse } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "1h";

let nextId = 1;

export async function register(
  req: Request,
  res: Response<AuthResponse | ApiError>,
): Promise<void> {
  const validation = validateRegisterPayload(req.body);

  if (!validation.valid) {
    res.status(400).json({ message: validation.message ?? "Invalid payload" });
    return;
  }

  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(409).json({ message: "User with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user: User = {
    id: String(nextId++),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
  };

  users.push(user);

  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}

export async function login(
  req: Request,
  res: Response<AuthResponse | ApiError>,
): Promise<void> {
  const validation = validateLoginPayload(req.body);

  if (!validation.valid) {
    res.status(400).json({ message: validation.message ?? "Invalid payload" });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}
