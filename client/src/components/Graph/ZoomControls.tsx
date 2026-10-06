import React from 'react';

import { Icon } from '../UI/Icon';
import { FOCUS_RING_INSET, HOVER_TRANSITION } from '../UI/styles';

import type { IconName } from '../UI/Icon';

interface ZoomControlsProps {
  /** Zoom the map out one step */
  onZoomOut?: () => void;
  /** Zoom the map in one step */
  onZoomIn?: () => void;
  /** Fit the whole map, and keep fitting as the crawl grows */
  onFit?: () => void;
  /** `sm` for a mouse, `touch` for 44px buttons on touch screens */
  size?: 'sm' | 'touch';
  /** Additional classes, typically for positioning */
  className?: string;
  /** Offsets that depend on open panels */
  style?: React.CSSProperties;
}

const SIZES = {
  sm: { group: 'rounded-[5px]', button: 'h-[26px] w-7', icon: 12 },
  touch: { group: 'rounded-lg', button: 'h-11 w-11', icon: 16 },
} as const;

/**
 * Joined zoom out, zoom in, and fit buttons for the map's corner.
 * @param props - Zoom handlers, size, positioning classes, and offsets
 * @returns Zoom button group
 */
export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomOut, onZoomIn, onFit, size = 'sm', className = '', style }) => {
  const spec = SIZES[size];
  const buttons: Array<{ label: string; icon: IconName; onClick?: () => void }> = [
    { label: 'Zoom out', icon: 'minus', onClick: onZoomOut },
    { label: 'Zoom in', icon: 'plus', onClick: onZoomIn },
    { label: 'Fit to view', icon: 'fit', onClick: onFit },
  ];

  return (
    <div role="group" aria-label="Zoom" style={style} className={`flex divide-x divide-line overflow-hidden border border-line bg-surface ${spec.group} ${className}`}>
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          aria-label={button.label}
          onClick={button.onClick}
          className={`grid cursor-pointer place-items-center bg-surface text-ink-2 hover:bg-wash-hover hover:text-ink ${spec.button}
            ${HOVER_TRANSITION} ${FOCUS_RING_INSET}`}
        >
          <Icon name={button.icon} size={spec.icon} />
        </button>
      ))}
    </div>
  );
};
