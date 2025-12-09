import bcrypt from 'bcryptjs';
import { User, IUserDocument } from '../models/User';
import { RefreshToken, IRefreshTokenDocument } from '../models/RefreshToken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/tokens';
import { findUserByEmail } from './userService';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const getRefreshExpiryDate = (): Date => {
  const expiresInEnv = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  const now = new Date();
  const match = /^([0-9]+)([smhd])$/.exec(expiresInEnv);
  if (!match) {
    now.setDate(now.getDate() + 7);
    return now;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
    default:
      now.setDate(now.getDate() + value);
      break;
  }

  return now;
};

const createAuthTokens = async (user: IUserDocument): Promise<AuthTokens> => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = getRefreshExpiryDate();

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

export const registerUser = async (data: RegisterData): Promise<{ user: IUserDocument; tokens: AuthTokens }> => {
  const existing = await findUserByEmail(data.email.toLowerCase());
  if (existing) {
    throw new Error('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: data.name.trim(),
    email: data.email.toLowerCase(),
    passwordHash,
  });

  const tokens = await createAuthTokens(user);
  return { user, tokens };
};

export const loginUser = async (data: LoginData): Promise<{ user: IUserDocument; tokens: AuthTokens }> => {
  const user = await findUserByEmail(data.email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const tokens = await createAuthTokens(user);
  return { user, tokens };
};

export const refreshTokens = async (refreshToken: string): Promise<AuthTokens> => {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  const storedToken: IRefreshTokenDocument | null = await RefreshToken.findOne({ token: refreshToken }).exec();
  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    await storedToken.deleteOne();
    throw new Error('Refresh token expired');
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = await User.findById(decoded.id).exec();
  if (!user) {
    throw new Error('User associated with this token no longer exists');
  }

  await storedToken.deleteOne();

  const tokens = await createAuthTokens(user);
  return tokens;
};

export const logout = async (refreshToken: string): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  await RefreshToken.deleteOne({ token: refreshToken }).exec();
};
