"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { pillEaseClasses, pillSurfaceClasses } from "@/components/ui/pillStyles";

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownProps<T extends string> = {
  options: readonly DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  /** Short muted label shown before the value, e.g. "Sort". */
  prefix?: string;
  /** Which edge the menu opens from. Use "right" for controls placed at the right end of a row. */
  align?: "left" | "right";
  className?: string;
};

/**
 * Custom listbox in the navigation's pill style. Same height and inner padding
 * as the segmented controls, so they sit side by side without looking different.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  prefix,
  align = "left",
  className = "",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();

    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? [],
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = items[(current + step + items.length) % items.length];
    next?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs text-zinc-200 transition-[color,opacity] hover:text-zinc-50 hover:opacity-90 ${pillSurfaceClasses}`}
      >
        {prefix ? <span className="text-zinc-500">{prefix}</span> : null}
        <span>{selected?.label}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-300 ${pillEaseClasses} ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        aria-hidden={!open}
        inert={!open}
        onKeyDown={handleListKeyDown}
        className={`absolute z-40 mt-2 flex w-44 flex-col gap-1 rounded-2xl p-1.5 transition-[opacity,transform,visibility] duration-200 ${pillEaseClasses} ${pillSurfaceClasses} ${
          align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
        } ${
          open ? "visible scale-100 opacity-100" : "invisible pointer-events-none scale-95 opacity-0"
        }`}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => choose(option.value)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-xs transition-colors ${
                active
                  ? "bg-white/10 text-zinc-50"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              {option.label}
              {active ? <CheckIcon className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
