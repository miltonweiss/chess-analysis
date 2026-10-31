import type { GameMetadata, PlayerColor } from "@/lib/chess/types";

/**
 * Returns the color the given user played in a game, based on the player names
 * in the metadata (case-insensitive). Returns undefined when the user is unknown
 * or did not play in the game.
 */
export function userColorFromMetadata(
  metadata: GameMetadata,
  username: string | undefined | null,
): PlayerColor | undefined {
  const target = username?.trim().toLowerCase();
  if (!target) {
    return undefined;
  }

  const white = metadata.white?.trim().toLowerCase();
  const black = metadata.black?.trim().toLowerCase();

  if (white === target && black !== target) {
    return "white";
  }
  if (black === target && white !== target) {
    return "black";
  }

  return undefined;
}
