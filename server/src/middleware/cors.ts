import cors from 'cors';

import type { CorsOptions } from 'cors';

/**
 * Create CORS middleware that allows the comma-separated origins in `ALLOWED_ORIGINS`, or any origin when it's unset.
 * @returns CORS middleware
 */
export const createCorsMiddleware = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];

  const options: CorsOptions = {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,
  };

  return cors(options);
};
