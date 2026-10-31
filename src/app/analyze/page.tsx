import { Suspense } from "react";
import { AnalyzePageClient } from "@/components/analysis/AnalyzePageClient";

export default function AnalyzePage() {
  return (
    <main className="h-full overflow-hidden">
      <Suspense fallback={<p className="px-6 py-10 text-sm text-zinc-400">Loading game…</p>}>
        <AnalyzePageClient />
      </Suspense>
    </main>
  );
}
