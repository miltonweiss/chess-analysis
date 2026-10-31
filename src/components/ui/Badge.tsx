import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "win" | "loss" | "draw" | "neutral" | "accent";
  className?: string;
};

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  win: "bg-win text-zinc-950",
  loss: "bg-loss text-zinc-950",
  draw: "bg-draw text-zinc-950",
  neutral: "bg-zinc-800 text-zinc-200",
  accent: "bg-accent text-zinc-950",
};

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
