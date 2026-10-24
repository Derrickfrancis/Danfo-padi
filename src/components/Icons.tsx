import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GlobeIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Svg>
);

export const PinIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const ChevronDownIcon = (p: P) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const ChevronLeftIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const DotIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="5" />
  </Svg>
);

export const TargetIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
);

export const PlusIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const WarningIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l10 18H2L12 3z" />
    <path d="M12 10v5M12 18v.5" />
  </Svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.7 2.7L16 9.8" />
  </Svg>
);
