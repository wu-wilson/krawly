import { SLOW_RESPONSE_MS } from '../../engine/limits';
import { describeFailure, describeStatus, plural } from '../../engine/statusText';
import { TYPE_NOUNS } from './options';

import type { CrawlNode } from '../../engine/types';
import type { FilterState } from '../../store/filters';

/** Heading and body for an empty state */
interface EmptyCopy {
  title: string;
  body: string;
}

const STATUS_WORD: Record<Exclude<FilterState['statusFilter'], 'all'>, string> = {
  broken: 'broken',
  redirects: 'redirecting',
  slow: 'slow',
};

// What having none of each status means, when no other filter narrows it down.
const GOOD_NEWS: Record<Exclude<FilterState['statusFilter'], 'all'>, EmptyCopy> = {
  broken: { title: 'No broken pages', body: 'Every page Krawly checked loaded without an error.' },
  redirects: { title: 'No redirects', body: 'No page Krawly checked redirected before it loaded.' },
  slow: { title: 'No slow pages', body: `Every page that responded did so in under ${plural(SLOW_RESPONSE_MS / 1000, 'second')}.` },
};

/**
 * Write the empty state for filters that match nothing. A search reads as "no matches"; a status filter on its
 * own is good news and says so.
 * @param filter - Active filters
 * @returns Heading and body
 */
export const noMatchCopy = (filter: FilterState): EmptyCopy => {
  const query = filter.search.trim();
  const status = filter.statusFilter === 'all' ? null : filter.statusFilter;
  const type = filter.typeFilter === 'all' ? null : TYPE_NOUNS[filter.typeFilter];

  if (query) {
    const shown = status ? `${STATUS_WORD[status]} ${type ?? 'pages'}` : (type ?? 'pages');
    return {
      title: `No ${shown} match “${query}”`,
      body:
        status || type
          ? `None of the ${shown} Krawly found have that in their address. Clear the search, or switch back to all pages.`
          : 'Nothing Krawly found has that in its address. Clear the search to see every page.',
    };
  }
  if (status && !type) return GOOD_NEWS[status];
  if (status && type) {
    return { title: `No ${STATUS_WORD[status]} ${type}`, body: `None of the ${type} Krawly checked are ${STATUS_WORD[status]}.` };
  }
  if (type) return { title: `No ${type} found`, body: `Krawly didn’t find any ${type} on this site.` };
  return { title: 'Nothing to show', body: 'Clear the filters to see every page Krawly found.' };
};

/**
 * Write the empty state for a crawl whose start page itself failed, leaving nothing to map.
 * @param root - The start page's node
 * @param host - Host the visitor entered
 * @returns Heading and body
 */
export const rootFailedCopy = (root: CrawlNode, host: string): EmptyCopy => {
  const { code, reason } = describeStatus(root);
  if (code) {
    return {
      title: `${host} returned ${code} ${reason}`,
      body: 'Krawly couldn’t read any links on the start page, so there’s nothing to map. Check the address, or try again in a moment.',
    };
  }
  const failure = describeFailure(root.error);
  if (failure.proxy) return { title: `Krawly couldn’t check ${host}`, body: `${failure.explanation} Try again in a moment.` };
  return { title: `Krawly couldn’t reach ${host}`, body: `${failure.explanation} Check the address, or try again in a moment.` };
};
