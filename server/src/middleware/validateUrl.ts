import type { Request, Response, NextFunction } from 'express';

/** Values `validateUrl` hands to the proxy handler */
export interface ProxyLocals {
  /** The validated `url` query parameter */
  targetUrl: string;
}

/**
 * Reject requests whose `url` query parameter is missing or isn't an http(s) URL.
 * @param req - Express request
 * @param res - Express response; receives `locals.targetUrl` on success
 * @param next - Next middleware
 */
export const validateUrl = (req: Request, res: Response<unknown, ProxyLocals>, next: NextFunction): void => {
  const targetUrl = req.query.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: 'Missing required query parameter: url' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL provided' });
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'Only http and https URLs are allowed' });
    return;
  }

  res.locals.targetUrl = targetUrl;
  next();
};
