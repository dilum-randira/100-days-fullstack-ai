import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequestUserPayload, ApiError } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthenticatedRequest extends Request {
  user?: AuthRequestUserPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response<ApiError>,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequestUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
