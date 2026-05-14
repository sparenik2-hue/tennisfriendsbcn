// ELO Rating System for Tennis
// Standard K-factor = 32 (common for recreational leagues)

const K_FACTOR = 32;

/**
 * Calculate expected score (probability of winning)
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO rating
 * R_new = R_old + K * (S - E)
 * where S = 1 for win, 0 for loss
 */
export function calculateNewRating(
  oldRating: number,
  opponentRating: number,
  won: boolean
): number {
  const expected = expectedScore(oldRating, opponentRating);
  const score = won ? 1 : 0;
  return Math.round(oldRating + K_FACTOR * (score - expected));
}

/**
 * Calculate ELO change for a match
 * Returns [ratingA_change, ratingB_change]
 */
export function calculateMatchRatings(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number
): { newRatingA: number; newRatingB: number; changeA: number; changeB: number } {
  // Best-of format: whoever has more games won
  const aWon = scoreA > scoreB;

  const newRatingA = calculateNewRating(ratingA, ratingB, aWon);
  const newRatingB = calculateNewRating(ratingB, ratingA, !aWon);

  return {
    newRatingA,
    newRatingB,
    changeA: newRatingA - ratingA,
    changeB: newRatingB - ratingB,
  };
}

/**
 * Get default starting ELO
 */
export const DEFAULT_ELO = 1200;
