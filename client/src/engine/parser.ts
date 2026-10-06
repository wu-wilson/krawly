import { normalizeUrl } from './urlUtils';

import type { ResourceType } from './types';

/** A link found on a page */
interface ParsedLink {
  /** Absolute URL as linked, without its fragment; used for requests */
  href: string;
  /** Normalized URL, used for deduplication */
  id: string;
  /** HTML element that contained the link */
  element: string;
  /** Classified resource type */
  resourceType: ResourceType;
}

const PRELOAD_TYPES: Record<string, ResourceType> = {
  script: 'script',
  style: 'stylesheet',
  image: 'image',
  font: 'font',
};

/**
 * Classify a `<link>` by its rel. Only rels that name a resource the page loads are kept; resource hints
 * (preconnect, dns-prefetch), feeds, and endpoints like pingback point at origins or APIs that aren't meant
 * to be fetched on their own, so checking them would report false errors.
 * @param rel - The link's rel attribute
 * @param as - The link's as attribute, for preloads
 * @returns Resource type, or null to skip the link
 */
const classifyLinkRel = (rel: string, as: string): ResourceType | null => {
  const rels = rel.toLowerCase().split(/\s+/);
  if (rels.includes('stylesheet')) return 'stylesheet';
  if (rels.some((r) => r === 'icon' || r === 'apple-touch-icon' || r === 'mask-icon')) return 'image';
  if (rels.includes('modulepreload')) return 'script';
  if (rels.includes('preload')) return PRELOAD_TYPES[as.toLowerCase()] ?? 'other';
  if (rels.includes('manifest')) return 'other';
  return null;
};

/**
 * Read the image URLs from a srcset. As in browsers, a URL runs to the next space (so it can contain commas),
 * and its size descriptor runs to the next comma.
 * @param srcset - The srcset attribute
 * @returns Candidate URLs in order
 */
const srcsetUrls = (srcset: string): string[] =>
  Array.from(srcset.matchAll(/[\s,]*([^\s,]\S*?)(?:,+(?=\s|$)|\s[^,]*|$)/g), (match) => match[1]);

/**
 * Extract every http(s) URL an HTML document links to or loads, once each.
 * @param html - Raw HTML string
 * @param baseUrl - URL the document was served from, for resolving relative links
 * @returns Links grouped by element type (anchors first), in document order within each group, deduplicated by normalized URL
 */
export const parseLinks = (html: string, baseUrl: string): ParsedLink[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Relative links resolve against the page's <base href> when it declares one.
  const declaredBase = doc.querySelector('base[href]')?.getAttribute('href');
  let base = baseUrl;
  try {
    if (declaredBase) base = new URL(declaredBase, baseUrl).href;
  } catch {
    // An unusable <base> is ignored, as browsers do.
  }
  const seen = new Set<string>();
  const links: ParsedLink[] = [];

  const add = (rawUrl: string | null | undefined, element: string, resourceType: ResourceType) => {
    const trimmed = rawUrl?.trim();
    // Without a <base>, a fragment-only link points back at the same page.
    if (!trimmed || (trimmed.startsWith('#') && base === baseUrl)) return;

    let resolved: URL;
    try {
      resolved = new URL(trimmed, base);
    } catch {
      // An href that isn't a valid URL is skipped, as browsers do.
      return;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
    // A link carrying a username or password can't be fetched, so it's left out.
    if (resolved.username || resolved.password) return;

    resolved.hash = '';
    const href = resolved.toString();
    const id = normalizeUrl(href);
    if (seen.has(id)) return;
    seen.add(id);
    links.push({ href, id, element, resourceType });
  };

  doc.querySelectorAll('a[href]').forEach((el) => add(el.getAttribute('href'), 'a', 'page'));
  doc.querySelectorAll('script[src]').forEach((el) => add(el.getAttribute('src'), 'script', 'script'));

  doc.querySelectorAll('link[href]').forEach((el) => {
    const type = classifyLinkRel(el.getAttribute('rel') ?? '', el.getAttribute('as') ?? '');
    if (type) add(el.getAttribute('href'), 'link', type);
  });

  doc.querySelectorAll('img').forEach((el) => {
    add(el.getAttribute('src'), 'img', 'image');
    srcsetUrls(el.getAttribute('srcset') ?? '').forEach((url) => add(url, 'img', 'image'));
  });

  // Only GET forms can be checked with a plain request; posting to an endpoint with a GET reports a false error.
  doc.querySelectorAll('form[action]').forEach((el) => {
    if ((el.getAttribute('method') ?? 'get').toLowerCase() === 'get') add(el.getAttribute('action'), 'form', 'page');
  });
  doc.querySelectorAll('iframe[src]').forEach((el) => add(el.getAttribute('src'), 'iframe', 'page'));

  doc.querySelectorAll('video').forEach((el) => {
    add(el.getAttribute('src'), 'video', 'media');
    add(el.getAttribute('poster'), 'video', 'image');
  });
  doc.querySelectorAll('audio[src]').forEach((el) => add(el.getAttribute('src'), 'audio', 'media'));
  doc.querySelectorAll('source[src]').forEach((el) => add(el.getAttribute('src'), 'source', 'media'));
  // Responsive images list their candidates on <source> inside <picture>.
  doc.querySelectorAll('source[srcset]').forEach((el) => {
    srcsetUrls(el.getAttribute('srcset') ?? '').forEach((url) => add(url, 'source', 'image'));
  });

  // A refresh reads as a delay, then the target, optionally prefixed with "url=". A quoted target ends at its
  // closing quote, as browsers read it.
  doc.querySelectorAll('meta[http-equiv="refresh" i]').forEach((el) => {
    const match = (el.getAttribute('content') ?? '').match(/^\s*[\d.]+\s*[;,\s]\s*(?:url\s*=\s*)?(['"]?)(.*)/is);
    if (match) add(match[1] ? match[2].split(match[1])[0] : match[2], 'meta', 'page');
  });

  return links;
};
