import type { Request, Response, NextFunction } from 'express';

/**
 * Log each request's method, path, target URL, status (or "aborted" when the client gave up), and duration once its
 * connection closes.
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const targetUrl = typeof req.query.url === 'string' ? req.query.url : 'N/A';

  // 'close' also fires when the client gives up, which 'finish' never does.
  res.on('close', () => {
    const outcome = res.writableFinished ? res.statusCode : 'aborted';
    // The target is quoted, so a decoded newline in it can't start a fake log line.
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${JSON.stringify(targetUrl)} | ${outcome} | ${Date.now() - start}ms`);
  });

  next();
};
