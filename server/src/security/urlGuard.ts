import { lookup } from 'dns';
import { isIP } from 'net';

import ipaddr from 'ipaddr.js';

import type { LookupFunction } from 'net';

/** Error raised when a URL or resolved address fails the SSRF guard. */
export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

/**
 * Check whether an IP is anything other than a regular public unicast address.
 * @param ip - IPv4 or IPv6 address
 * @returns True when the address must not be contacted (unparseable addresses included)
 */
const isBlockedIp = (ip: string): boolean => {
  try {
    return ipaddr.process(ip).range() !== 'unicast';
  } catch {
    return true;
  }
};

/**
 * Validate a URL before any network I/O: http(s) only, no credentials, and IP literals must be public. Hostnames are checked
 * later, at connect time, by `guardedLookup`. Throws `BlockedUrlError` when the URL is invalid or targets a
 * blocked address.
 * @param rawUrl - URL to validate
 * @returns The parsed URL
 */
export const assertSafeUrl = (rawUrl: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https are allowed');
  }

  // Fetch refuses credentials in a URL, and its error would echo them back.
  if (parsed.username || parsed.password) throw new BlockedUrlError('Credentials in URLs are not allowed');

  // `URL.hostname` keeps the brackets around IPv6 literals.
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) && isBlockedIp(hostname)) {
    throw new BlockedUrlError('Target address is in a blocked range');
  }

  return parsed;
};

/**
 * Resolve a hostname for an outbound socket, rejecting non-public addresses. Running at connect time means the
 * address checked is the address dialed, so a hostname can't pass validation and then re-resolve somewhere private.
 * Every resolved address must pass, since the socket may try any of them.
 * @param hostname - Host to resolve
 * @param options - Lookup options from the socket
 * @param callback - Receives the address(es), or the reason the host was refused
 */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, '');
      return;
    }
    if (addresses.length === 0) {
      callback(new BlockedUrlError('Hostname could not be resolved'), '');
      return;
    }
    if (addresses.some(({ address }) => isBlockedIp(address))) {
      callback(new BlockedUrlError('Target address is in a blocked range'), '');
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
};
