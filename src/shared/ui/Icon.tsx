import type { ReactNode } from 'react';

/** Fine-line 24px icons (1.5 stroke) drawn in currentColor. */
const PATHS = {
  play: <path d="M7.5 4.8v14.4L19 12z" />,
  pause: <path d="M8.5 5v14M15.5 5v14" />,
  pencil: (
    <>
      <path d="M16.5 3.5l4 4L8 20H4v-4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  exit: (
    <>
      <path d="M14 4.5h3.5a2 2 0 012 2v11a2 2 0 01-2 2H14" />
      <path d="M10 16l-4-4 4-4M6 12h9.5" />
    </>
  ),
  cloud: <path d="M7 18.5h10.5a4 4 0 00.5-7.97A5.5 5.5 0 007.3 9.1 4.75 4.75 0 007 18.5z" />,
  cloudOff: (
    <>
      <path d="M7 18.5h10.5c.6 0 1.2-.13 1.72-.37M20.9 15.2a4 4 0 00-2.9-4.67A5.5 5.5 0 009.7 6.4M6.2 9.6A4.75 4.75 0 007 18.5" />
      <path d="M3.5 3.5l17 17" />
    </>
  ),
  dots: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),
  lockOpen: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 017.6-1.7" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 01-3 3.7M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1" />
    </>
  ),
  chevronUp: <path d="M6 15l6-6 6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 000 11H13" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M20.5 16l-5-5-9 8.5" />
    </>
  ),
  type: <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />,
  shape: (
    <>
      <rect x="4" y="4" width="9.5" height="9.5" rx="1.5" />
      <circle cx="15.5" cy="15.5" r="4.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l9 4.75-9 4.75-9-4.75z" />
      <path d="M3 12.5l9 4.75 9-4.75" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 100 17c1.2 0 1.7-.9 1.4-1.9-.4-1.2.3-2.4 1.6-2.4h2a3.5 3.5 0 003.5-3.5c0-5.1-3.8-9.2-8.5-9.2z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
    </>
  ),
  arrowUpRight: <path d="M7 17L17 7M9 7h8v8" />,
  trophy: (
    <>
      <path d="M8 4.5h8v5a4 4 0 01-8 0z" />
      <path d="M8 6.5H5a3 3 0 003 3.5M16 6.5h3a3 3 0 01-3 3.5" />
      <path d="M12 13.5V17M8.5 20h7M10 17h4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5a6.5 6.5 0 0113 0" />
      <path d="M16 5.2a3.5 3.5 0 010 6.6M18 14.2a6.5 6.5 0 013.5 5.3" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5" />
      <path d="M5 9v9a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 18V9M10 13h4" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" />
    </>
  ),
  trash: <path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 13h9l1-13" />,
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="8.5" width="16" height="4" rx="1" />
      <path d="M5.5 12.5v7h13v-7M12 8.5v11" />
      <path d="M12 8.5S10.5 4 8 4.5 7 8.5 12 8.5zM12 8.5s1.5-4.5 4-4 1 4-4 4z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  monitor: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 01-13.3 4.8M4.5 12a7.5 7.5 0 0113.3-4.8" />
      <path d="M18 3.5v3.8h-3.8M6 20.5v-3.8h3.8" />
    </>
  ),
  save: (
    <>
      <path d="M5 4.5h11.5l3 3V18a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 18V6A1.5 1.5 0 015 4.5z" />
      <path d="M8 4.5v4h7v-4M7.5 19.5v-5.5h9v5.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
