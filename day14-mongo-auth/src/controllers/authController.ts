import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, refreshTokens, logout } from '../services/authService';
import { validateRegisterInput } from '../utils/validateUserInput';
import { LoginAttempt } from '../models/LoginAttempt';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookies';
import { logSuspicious, getClientIp } from '../utils/securityLog';
import { normalizeEmail } from '../perf/optimize';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const { valid, errors } = validateRegisterInput({ name, email, password });
    if (!valid) {
      res.status(400).json({ success: false, errors });
      return;
    }

    const { user, tokens } = await registerUser({ name, email, password });

    // Also set cookie (non-breaking: response still includes refreshToken as before)
    setRefreshCookie(res, tokens.refreshToken, process.env.NODE_ENV);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = normalizeEmail((req.body as any)?.email);
  const ip = getClientIp(req);

  try {
    const { password } = req.body;

    const { user, tokens } = await loginUser({ email, password });

    // clear login attempts on success
    if (email) {
      const key = `login:${email}:${ip}`;
      await LoginAttempt.deleteOne({ key }).exec();
    }

    setRefreshCookie(res, tokens.refreshToken, process.env.NODE_ENV);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        tokens,
      },
    });
  } catch (error: any) {
    // suspicious login failure (bruteforce)
    if (email) {
      logSuspicious(req as any, 'security.login.failed', { email, ip, reason: error?.message || 'unknown' });
    }
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Backward compatible: accept refreshToken from body; fallback to cookie
    const bodyToken = (req.body as any)?.refreshToken as string | undefined;
    const cookieToken = (req as any).cookies?.refreshToken as string | undefined;
    const refreshToken = bodyToken || cookieToken;

    const tokens = await refreshTokens(String(refreshToken || ''));

    setRefreshCookie(res, tokens.refreshToken, process.env.NODE_ENV);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens,
    });
  } catch (error: any) {
    logSuspicious(req as any, 'security.refresh.failed', { reason: error?.message || 'unknown' });
    next(error);
  }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bodyToken = (req.body as any)?.refreshToken as string | undefined;
    const cookieToken = (req as any).cookies?.refreshToken as string | undefined;
    const refreshToken = bodyToken || cookieToken;

    await logout(String(refreshToken || ''));

    clearRefreshCookie(res, process.env.NODE_ENV);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
