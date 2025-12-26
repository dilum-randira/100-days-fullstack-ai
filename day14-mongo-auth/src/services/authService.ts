import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, IUserDocument } from '../models/User';
import { RefreshToken, IRefreshTokenDocument } from '../models/RefreshToken';
import { RefreshSession } from '../models/RefreshSession';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
  type RefreshTokenPayload,
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

  // Refresh-session based rotation
  const sid = randomUUID();
  const pv = user.passwordVersion ?? 0;

  await RefreshSession.create({
    user: user._id,
    sessionId: sid,
    tokenVersion: 0,
    status: 'ACTIVE',
    userPasswordVersion: pv,
  });

  const accessToken = generateAccessToken(payload);

  const refreshPayload: RefreshTokenPayload = {
    ...payload,
    sid,
    ver: 0,
    pv,
  };

  const refreshToken = generateRefreshToken(refreshPayload);

  const expiresAt = getRefreshExpiryDate();

  // Keep storing refresh tokens for backward-compat + logout endpoint, but treat it as the current rotation token.
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
    passwordVersion: 0,
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

  // 1) Decode refresh token (JWT signature + exp checks). If invalid -> suspicious.
  let decoded: RefreshTokenPayload;
  try {
    decoded = verifyRefreshToken(refreshToken) as unknown as RefreshTokenPayload;
  } catch {
    throw new Error('Invalid refresh token');
  }

  // 2) Ensure the token exists in DB (legacy storage). Missing token indicates reuse/theft.
  const storedToken: IRefreshTokenDocument | null = await RefreshToken.findOne({ token: refreshToken }).exec();
  if (!storedToken) {
    // token reuse detected (already rotated or revoked)
    // revoke the entire session to stop further refresh attempts
    await RefreshSession.updateOne(
      { sessionId: decoded.sid },
      { $set: { status: 'REVOKED' } },
    ).exec();
    throw new Error('Invalid refresh token');
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    await storedToken.deleteOne();
    throw new Error('Refresh token expired');
  }

  const user = await User.findById(decoded.id).exec();
  if (!user) {
    await storedToken.deleteOne();
    throw new Error('User associated with this token no longer exists');
  }

  // 3) Enforce password-change invalidation.
  const currentPv = user.passwordVersion ?? 0;
  if (decoded.pv !== currentPv) {
    // Revoke all active sessions for this user (defense-in-depth)
    await RefreshSession.updateMany({ user: user._id, status: 'ACTIVE' }, { $set: { status: 'REVOKED' } }).exec();
    await RefreshToken.deleteMany({ user: user._id }).exec();
    throw new Error('Invalid refresh token');
  }

  // 4) Enforce refresh-session tokenVersion matches. Mismatch means reuse.
  const session = await RefreshSession.findOne({ sessionId: decoded.sid }).exec();
  if (!session || session.status !== 'ACTIVE') {
    await storedToken.deleteOne();
    throw new Error('Invalid refresh token');
  }

  if (decoded.ver !== session.tokenVersion) {
    // reuse detected: revoke session and all outstanding refresh tokens of that user
    session.status = 'REVOKED';
    await session.save();
    await RefreshToken.deleteMany({ user: user._id }).exec();
    throw new Error('Invalid refresh token');
  }

  // 5) Rotate: delete old token, increment session version, issue new tokens.
  await storedToken.deleteOne();

  session.tokenVersion += 1;
  session.lastUsedAt = new Date();
  await session.save();

  const payload: TokenPayload = { id: user._id.toString(), email: user.email };
  const accessToken = generateAccessToken(payload);

  const refreshPayload: RefreshTokenPayload = {
    ...payload,
    sid: session.sessionId,
    ver: session.tokenVersion,
    pv: currentPv,
  };

  const newRefreshToken = generateRefreshToken(refreshPayload);
  await RefreshToken.create({ token: newRefreshToken, user: user._id, expiresAt: getRefreshExpiryDate() });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (refreshToken: string): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  // Best-effort: revoke session if token decodes
  try {
    const decoded = verifyRefreshToken(refreshToken) as unknown as RefreshTokenPayload;
    await RefreshSession.updateOne({ sessionId: decoded.sid }, { $set: { status: 'REVOKED' } }).exec();
  } catch {
    // ignore
  }

  await RefreshToken.deleteOne({ token: refreshToken }).exec();
};

export const invalidateRefreshTokensForUser = async (userId: string): Promise<void> => {
  await User.updateOne(
    { _id: userId },
    {
      $inc: { passwordVersion: 1 },
      $set: { refreshInvalidBefore: new Date() },
    },
  ).exec();

  await RefreshSession.updateMany({ user: userId, status: 'ACTIVE' }, { $set: { status: 'REVOKED' } }).exec();
  await RefreshToken.deleteMany({ user: userId }).exec();
};
