import { useLayoutEffect, type RefObject } from 'react';

/**
 * Sizes `ref` to the space left under its own top edge (the shell's top bar sits above it) and keeps it
 * in sync when the window resizes or the bar above changes height (e.g. once web fonts load).
 */
export function useFillViewportHeight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = `${Math.max(0, window.innerHeight - el.getBoundingClientRect().top)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    const above = el.previousElementSibling;
    const observer = above ? new ResizeObserver(fit) : null;
    if (above) observer?.observe(above);
    return () => {
      window.removeEventListener('resize', fit);
      observer?.disconnect();
    };
  }, [ref]);
}
