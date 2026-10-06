import { describeStatus, responseMs } from '../engine/statusText';

import type { CrawlEdge, CrawlNode } from '../engine/types';

/**
 * Download text as a file through a temporary link.
 * @param filename - Suggested file name
 * @param content - File contents
 * @param mimeType - Content type
 */
const triggerDownload = (filename: string, content: string, mimeType: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Quote a CSV cell when it contains a comma, quote, or line break.
 * @param value - Cell text
 * @returns Escaped cell
 */
const escapeCsvValue = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Download nodes as a CSV file, one row per node, with a byte order mark so spreadsheet apps read it as UTF-8.
 * @param nodes - Crawl nodes to export
 */
export const exportCsv = (nodes: CrawlNode[]): void => {
  const headers = ['URL', 'Status', 'HTTP Code', 'Reason', 'Response Time (ms)', 'Type', 'Depth', 'Links Found', 'Redirects', 'Error'];
  // Code, reason, and time match what the report shows: a redirect's first hop, and no time for failed requests.
  const rows = nodes.map((node) => {
    const status = describeStatus(node);
    return [
      escapeCsvValue(node.url),
      node.status,
      String(status.code ?? ''),
      escapeCsvValue(status.reason),
      String(responseMs(node) ?? ''),
      node.resourceType,
      String(node.depth),
      String(node.outbound.length),
      escapeCsvValue(node.redirects.map((hop) => `${hop.status} ${hop.url}`).join(' | ')),
      escapeCsvValue(node.error ?? ''),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\r\n');
  triggerDownload('krawly-export.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
};

/**
 * Download nodes and the edges between them as a JSON file, with an export timestamp.
 * @param nodes - Crawl nodes to export
 * @param edges - Edges between those nodes
 */
export const exportJson = (nodes: CrawlNode[], edges: CrawlEdge[]): void => {
  const data = { nodes, edges, exportedAt: new Date().toISOString() };
  triggerDownload('krawly-export.json', JSON.stringify(data, null, 2), 'application/json');
};
