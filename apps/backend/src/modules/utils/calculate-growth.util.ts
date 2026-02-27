/**
 * Calculate growth percentage between current and previous values.
 * If previous is 0, returns 100 when current > 0, else 0.
 */
export function calculateGrowth(currentValue: number, previousValue: number): number {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}


