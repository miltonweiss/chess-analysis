export const CLASSIFIER_VERSION = "classifier-v3";
export const ACCURACY_VERSION = "accuracy-v1";
export const DEFAULT_ENGINE_VERSION = "stockfish-19-lite";

export type AnalysisVersion = {
  engineVersion: string;
  depth: number;
  classifierVersion: string;
  accuracyVersion: string;
};

export function createAnalysisVersion(options: {
  depth: number;
  engineVersion?: string;
}): AnalysisVersion {
  return {
    engineVersion: options.engineVersion ?? DEFAULT_ENGINE_VERSION,
    depth: options.depth,
    classifierVersion: CLASSIFIER_VERSION,
    accuracyVersion: ACCURACY_VERSION,
  };
}

export function analysisVersionsMatch(a: AnalysisVersion, b: AnalysisVersion): boolean {
  return (
    a.engineVersion === b.engineVersion &&
    a.depth === b.depth &&
    a.classifierVersion === b.classifierVersion &&
    a.accuracyVersion === b.accuracyVersion
  );
}
