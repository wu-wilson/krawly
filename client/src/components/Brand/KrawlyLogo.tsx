import React from 'react';

import { KrawlyMark } from './KrawlyMark';

interface KrawlyLogoProps {
  /** `md` for the landing header, `sm` for the app bar */
  size?: 'sm' | 'md';
  /** Additional classes for the lockup */
  className?: string;
}

const SIZES = {
  sm: { mark: 20, text: 'text-[15px]', gap: 'gap-2' },
  md: { mark: 26, text: 'text-[21px]', gap: 'gap-2.5' },
} as const;

/**
 * The mark and "krawly" wordmark lockup.
 * @param props - Size and classes
 * @returns Logo lockup
 */
export const KrawlyLogo: React.FC<KrawlyLogoProps> = ({ size = 'md', className = '' }) => {
  const spec = SIZES[size];

  return (
    <span className={`flex items-center ${spec.gap} ${className}`}>
      <KrawlyMark size={spec.mark} />
      <span className={`${spec.text} font-semibold leading-none tracking-[-0.045em]`}>krawly</span>
    </span>
  );
};
