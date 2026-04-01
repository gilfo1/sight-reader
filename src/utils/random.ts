/**
 * Selects an item from an array based on weights.
 * @param items
 * @param weights
 * @returns {T}
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length === 0 || items.length !== weights.length) {
    throw new Error('Items and weights must be non-empty and have the same length.');
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)]!;
  }

  let r = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]!) {
      return items[i]!;
    }
    r -= weights[i]!;
  }

  return items[items.length - 1]!;
}
