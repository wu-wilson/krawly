import { useCallback, useEffect, useRef, useState } from 'react';

/** Outcome of the latest copy, shown briefly beside the control that triggered it */
export type CopyState = 'idle' | 'copied' | 'failed';

const RESULT_MS = 1600;

interface UseCopyReturn {
  /** Copy text, falling back to a hidden field where the Clipboard API is unavailable */
  copy: (text: string) => Promise<void>;
  /** Outcome of the latest copy; returns to idle after a moment */
  state: CopyState;
}

/**
 * Copy text to the clipboard and briefly report whether it worked.
 * @returns Copy function and outcome
 */
export const useCopy = (): UseCopyReturn => {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(async (text: string) => {
    let ok: boolean;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Older browsers and insecure origins: copy through a temporary field instead, then hand focus back to the
      // control that copied, since selecting the field took it.
      const previous = document.activeElement;
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      ok = document.execCommand('copy');
      document.body.removeChild(field);
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    }
    setState(ok ? 'copied' : 'failed');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState('idle'), RESULT_MS);
  }, []);

  return { copy, state };
};
