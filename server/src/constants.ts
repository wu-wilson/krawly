/**
 * Read a positive integer from the environment.
 * @param name - Variable name
 * @param fallback - Value used when the variable is unset or malformed
 * @returns The parsed value or the fallback
 */
const intFromEnv = (name: string, fallback: number): number => {
  // `Number` rejects trailing junk that `parseInt` would quietly drop, such as "3001abc".
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/** Port the proxy listens on */
export const PORT = intFromEnv('PORT', 3001);

/** Timeout for one proxied request, across every redirect hop, in ms */
export const REQUEST_TIMEOUT_MS = intFromEnv('REQUEST_TIMEOUT_MS', 10000);

/** Largest response body read from a target site, in bytes; longer bodies are truncated */
export const MAX_BODY_SIZE_BYTES = intFromEnv('MAX_BODY_SIZE_BYTES', 2097152);

/** Requests allowed per IP per minute */
export const RATE_LIMIT_PER_MINUTE = intFromEnv('RATE_LIMIT_PER_MINUTE', 1000);

/** User-Agent header sent with all outbound requests */
export const USER_AGENT = 'Krawly/1.0 (site health scanner)';

/** Maximum number of redirects followed per proxy request */
export const MAX_REDIRECTS = 5;
