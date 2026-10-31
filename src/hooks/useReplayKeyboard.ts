"use client";

import { useEffect } from "react";

type ReplayKeyboardHandlers = {
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  enabled?: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.isContentEditable;
}

export function useReplayKeyboard({
  onFirst,
  onPrevious,
  onNext,
  onLast,
  enabled = true,
}: ReplayKeyboardHandlers) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onPrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          onNext();
          break;
        case "Home":
          event.preventDefault();
          onFirst();
          break;
        case "End":
          event.preventDefault();
          onLast();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onFirst, onLast, onNext, onPrevious]);
}
