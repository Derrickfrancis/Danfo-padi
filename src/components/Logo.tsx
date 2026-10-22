// "Smiling bus" mark (logo option 1). Flat, no animation.
export function Logo({ size = 76 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="23" y="5" width="18" height="7" rx="3.5" fill="#B9A1FF" />
      <rect x="9" y="10" width="46" height="42" rx="12" fill="#5B2BD6" />
      <rect x="15" y="16" width="34" height="15" rx="5" fill="#fff" />
      <circle cx="21" cy="41" r="4.5" fill="#fff" />
      <circle cx="43" cy="41" r="4.5" fill="#fff" />
      <path d="M26 45.5Q32 51 38 45.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="14" y="50" width="9" height="8" rx="3" fill="#3B1A8F" />
      <rect x="41" y="50" width="9" height="8" rx="3" fill="#3B1A8F" />
    </svg>
  );
}
