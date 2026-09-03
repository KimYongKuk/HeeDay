'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

/** True below Tailwind's `md` breakpoint. False during SSR so markup matches the desktop-first HTML. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
