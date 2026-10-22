/** Paper-dart mark (design/brand/logo-mark.svg) + Bagel Fat One wordmark, as drawn on the V17 boards. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 11.2 L21.5 2.5 L14.2 21.5 L11 13.4 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 13.4 L21.5 2.5" stroke="var(--bg)" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <circle cx="15.6" cy="8.6" r="1.9" fill="var(--bg)" />
      <circle cx="16.1" cy="8.3" r=".8" fill="currentColor" />
    </svg>
  );
}

export function Logo({ label = 'JobPilot' }: { label?: string }) {
  return (
    <a
      className="flex items-center gap-2 font-logo text-[23px] font-normal tracking-[-0.01em] [html[data-platform=darwin]_&]:[-webkit-app-region:no-drag] [html[data-platform=darwin]_&]:[app-region:no-drag]"
      href="#/"
      aria-label={label}
    >
      <i className="grid size-7 place-items-center">
        <LogoMark />
      </i>
      jobpilot
    </a>
  );
}
