import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { logSuspicious } from '../utils/securityLog';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSuspicious(req as any, 'security.access.missing_or_malformed');
    res.status(401).json({ success: false, error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      // role is best-effort; some tokens may not include it.
      role: (payload as any).role,
    } as any;
    next();
  } catch (error) {
    logSuspicious(req as any, 'security.access.invalid_token');
    res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
};
