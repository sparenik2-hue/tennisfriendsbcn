// Tennis Ranking App - Data types

export interface Player {
  id: string;
  name: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  createdAt: Date;
  createdBy: string;
}

export interface SetScore {
  player1: number;
  player2: number;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  sets: SetScore[];
  player1Sets: number;
  player2Sets: number;
  winnerId: string;
  eloChange: number;
  date: Date;
  recordedBy: string;
}

export type RankingEntry = Player & {
  rank: number;
};
