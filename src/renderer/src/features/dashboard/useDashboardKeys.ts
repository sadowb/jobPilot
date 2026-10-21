import { useEffect } from 'react';
import { keyToResult, type KeyEffect } from './keys';
import type { DashboardAction, DashboardState } from './state';

const isTextTarget = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/**
 * Global keyboard model for the Dashboard (see keys.ts). Actions go to the reducer; effects that need the
 * DOM or the window (focus the search box, open the posting) are run by `onEffect`.
 */
export function useDashboardKeys(
  state: DashboardState,
  dispatch: (a: DashboardAction) => void,
  onEffect: (e: KeyEffect) => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const res = keyToResult(e, state, isTextTarget(e.target));
      if (!res) return;
      if (res.preventDefault) e.preventDefault();
      if (res.action) dispatch(res.action);
      if (res.effect) onEffect(res.effect);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, dispatch, onEffect, enabled]);
}
