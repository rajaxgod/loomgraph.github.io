export type RenderTier = 'dom' | 'canvas' | 'webgl';

export interface TierThresholds {
  domMax: number;
  canvasMax: number;
}

export const DEFAULT_THRESHOLDS: TierThresholds = {
  domMax: 300,
  canvasMax: 3000,
};

export function selectTier(
  nodeCount: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS
): RenderTier {
  if (nodeCount <= thresholds.domMax) return 'dom';
  if (nodeCount <= thresholds.canvasMax) return 'canvas';
  return 'webgl';
}
