import React from 'react';

import { Icon } from '../UI/Icon';

import { LIMIT_SENTENCE } from '../../engine/statusText';

/**
 * A quiet note under the filters once a crawl has hit its page limit.
 * @returns Limit note
 */
export const LimitNotice: React.FC = () => (
  <div
    role="note"
    className="flex items-start gap-2.5 border-b border-line bg-wash-row px-4 py-2.5 text-[12.5px] leading-snug text-ink-2 sm:px-5"
  >
    <Icon name="info" size={14} className="mt-0.5 text-ink-3" />
    {LIMIT_SENTENCE}
  </div>
);
