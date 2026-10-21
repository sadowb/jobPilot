let activeTransition: ViewTransition | undefined;

/** Capture before saving the native preference, which also broadcasts theme changes. */
export function transitionTheme(update: () => Promise<void>): void {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void update();
    return;
  }

  const root = document.documentElement;
  activeTransition?.skipTransition();
  root.dataset.themeTransition = 'true';
  const transition = document.startViewTransition(update);
  activeTransition = transition;

  void transition.ready
    .then(() => {
      if (activeTransition !== transition) return;
      root.animate(
        { opacity: [0, 1] },
        {
          duration: 160,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {
      /* A newer click or a hidden window can skip the animation; the preference still updates. */
    });
  void transition.finished
    .finally(() => {
      if (activeTransition === transition) {
        activeTransition = undefined;
        delete root.dataset.themeTransition;
      }
    })
    .catch(() => {
      /* The update reports preference errors through useTheme. */
    });
}
