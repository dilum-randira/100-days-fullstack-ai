import jwt, { JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  id: string;
  email: string;
  role?: string;
}

export type RefreshTokenPayload = TokenPayload & {
  sid: string;
  ver: number;
  pv: number; // passwordVersion snapshot
};

const asSecret = (s: string): Secret => s as unknown as Secret;

export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
  return jwt.sign(payload, asSecret(config.jwt.accessSecret), { expiresIn } as SignOptions);
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign(payload, asSecret(config.jwt.refreshSecret), { expiresIn } as SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload & TokenPayload => {
  return jwt.verify(token, asSecret(config.jwt.accessSecret)) as JwtPayload & TokenPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload & RefreshTokenPayload => {
  return jwt.verify(token, asSecret(config.jwt.refreshSecret)) as JwtPayload & RefreshTokenPayload;
};
