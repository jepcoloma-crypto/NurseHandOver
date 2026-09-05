import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as StringValue,
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  return decoded;
}
