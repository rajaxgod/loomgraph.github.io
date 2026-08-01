import { describe, it, expect } from 'vitest';
import { selectTier, DEFAULT_THRESHOLDS } from './tier';

describe('Tier Selection Logic', () => {
  it('should return dom for small node counts', () => {
    expect(selectTier(10)).toBe('dom');
    expect(selectTier(DEFAULT_THRESHOLDS.domMax)).toBe('dom');
  });

  it('should return canvas for mid-sized node counts', () => {
    expect(selectTier(DEFAULT_THRESHOLDS.domMax + 1)).toBe('canvas');
    expect(selectTier(DEFAULT_THRESHOLDS.canvasMax)).toBe('canvas');
  });

  it('should return webgl for massive node counts', () => {
    expect(selectTier(DEFAULT_THRESHOLDS.canvasMax + 1)).toBe('webgl');
    expect(selectTier(50000)).toBe('webgl');
  });

  it('should respect custom thresholds', () => {
    const customThresholds = { domMax: 50, canvasMax: 500 };
    expect(selectTier(60, customThresholds)).toBe('canvas');
    expect(selectTier(600, customThresholds)).toBe('webgl');
  });
});
