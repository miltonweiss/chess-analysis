import type { MoveClassification } from "@/lib/analysis/types";

export type ClassificationStyle = {
  label: string;
  glyph: string;
  color: string;
  textColorClass: string;
  badgeBgClass: string;
  description: string;
};

export const CLASSIFICATION_STYLES: Record<MoveClassification, ClassificationStyle> = {
  brilliant: {
    label: "Brilliant",
    glyph: "!!",
    color: "#26c2a3",
    textColorClass: "text-[#26c2a3]",
    badgeBgClass: "bg-[#26c2a3]",
    description: "A sharp, winning sacrifice.",
  },
  great: {
    label: "Great",
    glyph: "!",
    color: "#5c8bb0",
    textColorClass: "text-[#5c8bb0]",
    badgeBgClass: "bg-[#5c8bb0]",
    description: "The only move that maintains the advantage.",
  },
  best: {
    label: "Best",
    glyph: "★",
    color: "#81b64c",
    textColorClass: "text-[#81b64c]",
    badgeBgClass: "bg-[#81b64c]",
    description: "The best move found by the engine.",
  },
  excellent: {
    label: "Excellent",
    glyph: "✓",
    color: "#96bc4b",
    textColorClass: "text-[#96bc4b]",
    badgeBgClass: "bg-[#96bc4b]",
    description: "Nearly as good as the best move.",
  },
  good: {
    label: "Good",
    glyph: "✓",
    color: "#95b776",
    textColorClass: "text-[#95b776]",
    badgeBgClass: "bg-[#95b776]",
    description: "A natural, solid move.",
  },
  book: {
    label: "Book",
    glyph: "📖",
    color: "#a88865",
    textColorClass: "text-[#a88865]",
    badgeBgClass: "bg-[#a88865]",
    description: "Standard opening theory.",
  },
  forced: {
    label: "Forced",
    glyph: "→",
    color: "#71717a",
    textColorClass: "text-zinc-400",
    badgeBgClass: "bg-zinc-600",
    description: "The only legal response.",
  },
  inaccuracy: {
    label: "Inaccuracy",
    glyph: "?!",
    color: "#f7c631",
    textColorClass: "text-[#f7c631]",
    badgeBgClass: "bg-[#f7c631]",
    description: "Slightly weakens the position.",
  },
  mistake: {
    label: "Mistake",
    glyph: "?",
    color: "#ffa459",
    textColorClass: "text-[#ffa459]",
    badgeBgClass: "bg-[#ffa459]",
    description: "A noticeable mistake that concedes an advantage.",
  },
  miss: {
    label: "Miss",
    glyph: "✕",
    color: "#ff7769",
    textColorClass: "text-[#ff7769]",
    badgeBgClass: "bg-[#ff7769]",
    description: "A missed tactical opportunity.",
  },
  blunder: {
    label: "Blunder",
    glyph: "??",
    color: "#fa412d",
    textColorClass: "text-[#fa412d]",
    badgeBgClass: "bg-[#fa412d]",
    description: "A serious blunder that could change the outcome.",
  },
};

export function classificationSymbol(classification: MoveClassification): string {
  return CLASSIFICATION_STYLES[classification]?.glyph ?? "";
}

export function classificationColorClass(classification: MoveClassification): string {
  return CLASSIFICATION_STYLES[classification]?.textColorClass ?? "text-zinc-500";
}

export function classificationHex(classification: MoveClassification): string {
  return CLASSIFICATION_STYLES[classification]?.color ?? "#a1a1aa";
}

/** Review list: only visible marks for significant moves. */
export function reviewClassificationMark(
  classification: MoveClassification,
): { glyph: string; className: string } | null {
  const style = CLASSIFICATION_STYLES[classification];
  if (!style) return null;

  if (
    classification === "blunder" ||
    classification === "mistake" ||
    classification === "miss" ||
    classification === "inaccuracy" ||
    classification === "brilliant" ||
    classification === "great"
  ) {
    return { glyph: style.glyph, className: style.textColorClass };
  }
  return null;
}
