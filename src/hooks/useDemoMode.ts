'use client';

/**
 * Global "demo mode" toggle — ported from King (github.com/KenKaiii/king).
 *
 * One source of truth (`localStorage[DEMO_KEY]`) shared across every component
 * that supports a demo view. Flipping the switch in any component is broadcast
 * to every other mounted listener via a custom event (because native `storage`
 * events fire only across documents, not within the same page).
 *
 * Default is `false`. Fresh installs boot into real-data mode — demo data
 * never leaks into production without explicit opt-in.
 */

import { useEffect, useState, useCallback } from 'react';

export const DEMO_KEY = 'openchair:demoMode';
const CHANGE_EVENT = 'openchair:demoMode:change';

interface ChangeDetail {
  on: boolean;
}

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_KEY, on ? '1' : '0');
  } catch {
    // Private mode or storage full — best effort.
  }
}

/**
 * Subscribe to the demo flag. Returns `[on, setOn]` where `setOn` updates
 * localStorage and notifies every other mounted listener in the same document.
 */
export function useDemoMode(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => readFlag());

  useEffect(() => {
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<ChangeDetail>).detail;
      setOn(!!detail?.on);
    };
    // `storage` fires when another window/tab changes localStorage.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DEMO_KEY) setOn(e.newValue === '1');
    };

    window.addEventListener(CHANGE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setDemoMode = useCallback((next: boolean) => {
    writeFlag(next);
    window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail: { on: next } }));
  }, []);

  return [on, setDemoMode];
}
