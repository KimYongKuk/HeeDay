'use client';

import { useSyncExternalStore } from 'react';

// Module-level store so the print state can be read with useSyncExternalStore.
let printing = false;
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;

function emit(next: boolean) {
  if (printing === next) return;
  printing = next;
  listeners.forEach((l) => l());
}

function attach() {
  if (typeof window === 'undefined') return;
  const mq = window.matchMedia('print');
  const onBefore = () => emit(true);
  const onAfter = () => emit(false);
  const onChange = (e: MediaQueryListEvent) => emit(e.matches);
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  mq.addEventListener('change', onChange);
  if (mq.matches) queueMicrotask(() => emit(true));
  detach = () => {
    window.removeEventListener('beforeprint', onBefore);
    window.removeEventListener('afterprint', onAfter);
    mq.removeEventListener('change', onChange);
    detach = null;
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) detach?.();
  };
}

/** True while the browser is laying out for print (beforeprint → afterprint, or print media emulation). */
export function usePrinting(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => printing,
    () => false,
  );
}
