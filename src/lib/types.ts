// TennisFriendsBCN - Data types

export interface Player {
  id: string;
  name: string;
  icon: string;
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

export interface TournamentParticipant {
  uid: string;
  email: string;
  playerId?: string;   // linked player profile for ELO seeding
  playerName?: string;
}

export interface TournamentGroup {
  id: string; // "A", "B", …
  participants: TournamentParticipant[];
}

export interface TournamentMatchRecord {
  id: string;
  phase: "group" | "semifinal" | "final";
  group?: string; // only for phase === "group"
  player1Uid: string;
  player1Email: string;
  player1Name?: string;
  player2Uid: string;
  player2Email: string;
  player2Name?: string;
  winnerId?: string;
  status: "scheduled" | "played";
  createdAt?: any;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  format: "singles" | "doubles";
  tournamentFormat: "round_robin" | "groups_knockout";
  numGroups: number;
  maxPlayers: number;
  participants: TournamentParticipant[];
  groups?: TournamentGroup[];
  scheduleGenerated: boolean;
  status: "upcoming" | "active" | "finals" | "completed";
  createdBy: string;
  createdAt: Date;
}
