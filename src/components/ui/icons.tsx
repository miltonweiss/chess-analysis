type IconProps = {
  className?: string;
};

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "" }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function FilterIcon({ className = "" }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </svg>
  );
}

export function XIcon({ className = "" }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
