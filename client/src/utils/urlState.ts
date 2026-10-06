import { STATUS_FILTERS, TYPE_FILTERS } from '../store/filters';

import { toCrawlUrl } from '../engine/urlUtils';

import type { AppView } from '../store/crawlStore';
import type { FilterState } from '../store/filters';

/** The query parameter for each piece of state a shared link carries */
export const URL_PARAMS = { startUrl: 'u', view: 'view', status: 'status', type: 'type', search: 'q' } as const;

/** What a page URL can carry: the crawl to start, plus the view and filters to show */
interface UrlState {
  /** Start URL of a shared crawl, or null when it's missing or isn't a web address */
  startUrl: string | null;
  /** Which view to open */
  view?: AppView;
  /** Filters to apply */
  filter: Partial<FilterState>;
}

const VIEWS: readonly AppView[] = ['graph', 'report'];

/**
 * Match a raw parameter against a list of allowed values.
 * @param options - Allowed values
 * @param value - Raw parameter
 * @returns The matching option, or undefined
 */
const pick = <T extends string>(options: readonly T[], value: string | null): T | undefined =>
  options.find((option) => option === value);

/**
 * Read the crawl, view, and filters from the current page URL, ignoring anything invalid.
 * @returns Parsed URL state
 */
export const readUrlState = (): UrlState => {
  const params = new URLSearchParams(window.location.search);
  const filter: Partial<FilterState> = {};

  const statusFilter = pick(STATUS_FILTERS, params.get(URL_PARAMS.status));
  if (statusFilter) filter.statusFilter = statusFilter;
  const typeFilter = pick(TYPE_FILTERS, params.get(URL_PARAMS.type));
  if (typeFilter) filter.typeFilter = typeFilter;
  const search = params.get(URL_PARAMS.search);
  if (search) filter.search = search;

  const startUrl = params.get(URL_PARAMS.startUrl);
  return { startUrl: startUrl ? toCrawlUrl(startUrl) : null, view: pick(VIEWS, params.get(URL_PARAMS.view)), filter };
};
