import type { ReactNode } from "react";

const s = (d: ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

export const Ic = {
  wallet: s(<><path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z" /></>),
  server: s(<><rect x="2" y="3" width="20" height="8" rx="2" /><rect x="2" y="13" width="20" height="8" rx="2" /><path d="M6 7h.01M6 17h.01" /></>),
  globe: s(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></>),
  panel: s(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>),
  receipt: s(<><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-3 2-3-2-3 2-3-2-3 2z" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  hash: s(<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />),
  coins: s(<><circle cx="8" cy="8" r="6" /><path d="M18.1 10.4A6 6 0 1 1 10.4 18.1M7 6h1v4M16.7 13.9l.7.7-2.8 2.8" /></>),
  box: s(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  user: s(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  grid: s(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  chat: s(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>),
  shield: s(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  home: s(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  logout: s(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
  chevron: s(<path d="m6 9 6 6 6-6" />, 16),
};
