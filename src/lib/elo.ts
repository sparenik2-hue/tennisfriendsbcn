// ELO Rating System for Tennis
const K_FACTOR = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateNewRating(
  oldRating: number,
  opponentRating: number,
  won: boolean
): number {
  const expected = expectedScore(oldRating, opponentRating);
  const score = won ? 1 : 0;
  return Math.round(oldRating + K_FACTOR * (score - expected));
}

export const DEFAULT_ELO = 1200;
