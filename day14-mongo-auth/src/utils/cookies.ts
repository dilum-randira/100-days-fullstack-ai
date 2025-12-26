import type { CookieOptions, Response } from 'express';

export const refreshCookieName = 'refreshToken';

export const getRefreshCookieOptions = (nodeEnv: string | undefined): CookieOptions => {
  const isProd = nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Secure only in prod (requires HTTPS)
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api',
    // No explicit maxAge: keep as session cookie to avoid persistent token theft via disk.
  };
};

export const setRefreshCookie = (res: Response, token: string, nodeEnv: string | undefined): void => {
  res.cookie(refreshCookieName, token, getRefreshCookieOptions(nodeEnv));
};

export const clearRefreshCookie = (res: Response, nodeEnv: string | undefined): void => {
  res.clearCookie(refreshCookieName, getRefreshCookieOptions(nodeEnv));
};
