"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  pillEaseClasses,
  pillHighlightClasses,
  pillSurfaceClasses,
} from "@/components/ui/pillStyles";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

/** Pill option group that uses the same surface and sliding highlight as the navigation. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = buttonRefs.current[value];
    setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, options.length]);

  // Enable the slide only after the first placement, so the highlight doesn't fly in on mount.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center rounded-full p-1 ${pillSurfaceClasses}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 left-1 h-8 rounded-full ${pillHighlightClasses} ${
          ready ? `transition-[transform,width,opacity] duration-300 ${pillEaseClasses}` : ""
        }`}
        style={{
          width: indicator?.width ?? 0,
          transform: `translateX(${(indicator?.left ?? 0) - 4}px)`,
          opacity: indicator ? 1 : 0,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[option.value] = el;
            }}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`relative z-10 h-8 rounded-full px-3 text-sm transition-colors duration-200 ${
              active ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
