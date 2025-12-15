import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  id: string;
  email: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn });
};

export const verifyAccessToken = (token: string): JwtPayload & TokenPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as JwtPayload & TokenPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload & TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload & TokenPayload;
};
