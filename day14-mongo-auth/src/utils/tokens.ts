import jwt, { JwtPayload } from 'jsonwebtoken';

export interface TokenPayload {
  id: string;
  email: string;
}

const getAccessSecret = (): string => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }
  return process.env.JWT_ACCESS_SECRET;
};

const getRefreshSecret = (): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  return process.env.JWT_REFRESH_SECRET;
};

export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  return jwt.sign(payload, getAccessSecret(), { expiresIn });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  return jwt.sign(payload, getRefreshSecret(), { expiresIn });
};

export const verifyAccessToken = (token: string): JwtPayload & TokenPayload => {
  return jwt.verify(token, getAccessSecret()) as JwtPayload & TokenPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload & TokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as JwtPayload & TokenPayload;
};
