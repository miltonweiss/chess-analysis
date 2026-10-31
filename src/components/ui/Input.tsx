import type { InputHTMLAttributes } from "react";
import { pillSurfaceClasses } from "@/components/ui/pillStyles";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Full-rounded text field with the navigation's pill surface. */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`h-10 w-full rounded-full px-4 text-sm text-foreground placeholder:text-zinc-500 transition-colors focus:border-white/25 focus:outline-none disabled:opacity-50 ${pillSurfaceClasses} ${className}`}
      {...props}
    />
  );
}
