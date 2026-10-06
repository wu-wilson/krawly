import rateLimit from 'express-rate-limit';

import { RATE_LIMIT_PER_MINUTE } from '../constants';

/**
 * Create rate limiting middleware allowing `RATE_LIMIT_PER_MINUTE` requests per IP per minute.
 * @returns Configured rate limiter
 */
export const createRateLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: RATE_LIMIT_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Try again in a minute.' },
  });
