export type AnalysisSettings = {
  depth: number;
  movetime?: number;
  /** Number of principal variations (1 = default, no MultiPV overhead). */
  multipv?: number;
};

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  depth: 15,
  multipv: 2,
};

export const DEPTH_OPTIONS = [10, 15, 20, 24] as const;

export function analysisCacheKey(fen: string, settings: AnalysisSettings): string {
  const movetime = settings.movetime ?? 0;
  const multipv = settings.multipv ?? 1;
  const multipvSuffix = multipv > 1 ? `|m:${multipv}` : "";
  return `${fen}|d:${settings.depth}|t:${movetime}${multipvSuffix}`;
}
