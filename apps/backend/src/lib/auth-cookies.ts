import { env } from '../config/env.js';

export const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict' as const,
  path: '/',
};

export const ACCESS_MAX_AGE = 15 * 60; // 15 minutes in seconds
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
