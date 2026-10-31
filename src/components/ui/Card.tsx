import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  /** When set, the whole card becomes a link. */
  href?: string;
};

// No display utility here: callers choose it (e.g. `flex`), so classes never conflict.
const baseClasses = "rounded-card border border-border bg-surface-muted transition-colors";
const interactiveClasses =
  "hover:border-zinc-600 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500";

export function Card({ children, className = "", href }: CardProps) {
  const classes = `${baseClasses} ${href ? interactiveClasses : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
