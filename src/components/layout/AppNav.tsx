"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

const tabs = [
  { href: "/analyze", label: "Analyse" },
  { href: "/games", label: "Library" },
];

export function AppNav() {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  const activeHref =
    tabs.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ?? null;

  const measure = useCallback(() => {
    const el = activeHref ? tabRefs.current[activeHref] : null;
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    else setPill(null);
  }, [activeHref]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Enable the slide transition only after the first placement, so the pill doesn't fly in on load.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <header className="pointer-events-none z-50 flex shrink-0 justify-center px-4 pt-3 pb-2">
      <nav className="pointer-events-auto relative flex items-center rounded-full border border-white/10 bg-zinc-900/70 p-1 shadow-lg shadow-black/40 ring-1 ring-black/20 backdrop-blur-xl backdrop-saturate-150">
        <span
          aria-hidden
          className={`absolute top-1 left-1 h-8 rounded-full bg-white/15 shadow-inner shadow-white/5 ${
            ready ? "transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" : ""
          }`}
          style={{
            width: pill?.width ?? 0,
            transform: `translateX(${(pill?.left ?? 0) - 4}px)`,
            opacity: pill ? 1 : 0,
          }}
        />
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={(el) => {
                tabRefs.current[tab.href] = el;
              }}
              aria-current={active ? "page" : undefined}
              className={`relative z-10 flex h-8 items-center rounded-full px-4 text-sm transition-colors duration-200 ${
                active ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
