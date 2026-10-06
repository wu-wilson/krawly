import 'dotenv/config';

import express from 'express';

import { PORT } from './constants';
import { createCorsMiddleware } from './middleware/cors';
import { createRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { validateUrl } from './middleware/validateUrl';
import { createProxyHandler } from './proxyHandler';

const app = express();

// Resolves req.ip to the client behind Railway's proxy.
app.set('trust proxy', 1);

app.use(createCorsMiddleware());
app.use(requestLogger);
app.use(createRateLimiter());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'krawly-proxy' });
});

app.get('/fetch', validateUrl, createProxyHandler({ headOnly: false }));
app.get('/head', validateUrl, createProxyHandler({ headOnly: true }));

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Krawly proxy listening on port ${PORT}`);
});
