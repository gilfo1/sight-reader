import { describe, it, expect } from 'vitest';
import { weightedRandom } from '@/utils/random';

describe('weightedRandom', (): void => {
  it('should throw an error if items and weights have different lengths', (): void => {
    expect((): void => {
      weightedRandom(['a', 'b'], [1]);
    }).toThrow('Items and weights must be non-empty and have the same length.');
  });

  it('should throw an error if items is empty', (): void => {
    expect((): void => {
      weightedRandom([], []);
    }).toThrow('Items and weights must be non-empty and have the same length.');
  });

  it('should return a random item if total weight is 0', (): void => {
    const items = ['a', 'b', 'c'];
    const weights = [0, 0, 0];
    const result = weightedRandom(items, weights);
    expect(items).toContain(result);
  });

  it('should return the only item with non-zero weight', (): void => {
    const items = ['a', 'b', 'c'];
    const weights = [0, 10, 0];
    const result = weightedRandom(items, weights);
    expect(result).toBe('b');
  });

  it('should respect weights for multiple items', (): void => {
    const items = ['a', 'b'];
    const weights = [1, 9]; // 10% 'a', 90% 'b'
    
    let aCount = 0;
    let bCount = 0;
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const result = weightedRandom(items, weights);
      if (result === 'a') aCount++;
      else bCount++;
    }
    
    // Expect rough distribution
    expect(aCount).toBeGreaterThan(50);
    expect(aCount).toBeLessThan(150);
    expect(bCount).toBeGreaterThan(850);
    expect(bCount).toBeLessThan(950);
  });

  it('should work with single item', (): void => {
    const items = ['a'];
    const weights = [10];
    const result = weightedRandom(items, weights);
    expect(result).toBe('a');
  });

  it('should handle fractional weights', (): void => {
    const items = ['a', 'b'];
    const weights = [0.1, 0.9];
    
    let aCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (weightedRandom(items, weights) === 'a') aCount++;
    }
    expect(aCount).toBeGreaterThan(50);
    expect(aCount).toBeLessThan(150);
  });

  it('should return the last item if random exceeds accumulated weights due to precision', (): void => {
    // Force Math.random() to return something very close to 1
    const originalRandom = Math.random;
    Math.random = () => 0.999999999999999;
    try {
      const items = ['a', 'b', 'c'];
      const weights = [1, 1, 1];
      const result = weightedRandom(items, weights);
      expect(result).toBe('c');
    } finally {
      Math.random = originalRandom;
    }
  });
});
