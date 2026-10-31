"use client";

type AiPrivacyNoteProps = {
  provider: string;
  model: string;
};

export function AiPrivacyNote({ provider, model }: AiPrivacyNoteProps) {
  return (
    <p className="text-xs text-zinc-500">
      Explaining sends this position, the engine line, and its evaluation to{" "}
      {provider} ({model}). Nothing else leaves your browser.
    </p>
  );
}
