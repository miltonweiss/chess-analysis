import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AppNav } from "@/components/layout/AppNav";
import "./globals.css";

const satoshi = localFont({
  src: "../../public/Satoshi-Variable.ttf",
  variable: "--font-satoshi",
  weight: "200 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chess Analysis",
  description: "Local-first chess analysis workspace",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
        <AppNav />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </body>
    </html>
  );
}
