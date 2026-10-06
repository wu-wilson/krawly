import type { AppView } from '../../store/crawlStore';
import type { CrawlStats, FilterState } from '../../store/filters';

/** Choices for the Graph/Report switch */
export const VIEW_OPTIONS: Array<{ value: AppView; label: string }> = [
  { value: 'graph', label: 'Graph' },
  { value: 'report', label: 'Report' },
];

/** Status filters in display order, each with the count it shows */
export const STATUS_OPTIONS: Array<{ value: FilterState['statusFilter']; label: string; count: keyof CrawlStats }> = [
  { value: 'all', label: 'All', count: 'total' },
  { value: 'broken', label: 'Broken', count: 'broken' },
  { value: 'redirects', label: 'Redirects', count: 'redirects' },
  { value: 'slow', label: 'Slow', count: 'slow' },
];

/** What each type filter shows, as a plural noun for sentences */
export const TYPE_NOUNS: Record<Exclude<FilterState['typeFilter'], 'all'>, string> = {
  pages: 'pages',
  scripts: 'scripts',
  styles: 'stylesheets',
  images: 'images',
  other: 'other files',
};

/** Choices for the resource type filter */
export const TYPE_OPTIONS: Array<{ value: FilterState['typeFilter']; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'pages', label: 'Pages' },
  { value: 'scripts', label: 'Scripts' },
  { value: 'styles', label: 'Stylesheets' },
  { value: 'images', label: 'Images' },
  { value: 'other', label: 'Other' },
];
