import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
    };
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
};
