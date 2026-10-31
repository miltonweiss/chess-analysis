"use client";

type AiContextDebugProps = {
  context: unknown;
};

export function AiContextDebug({ context }: AiContextDebugProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <details className="mt-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
      <summary className="cursor-pointer text-xs text-zinc-500">AI Context (dev)</summary>
      <pre className="mt-2 max-h-48 overflow-auto text-xs text-zinc-400">
        {JSON.stringify(context, null, 2)}
      </pre>
    </details>
  );
}
