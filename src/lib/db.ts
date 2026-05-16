// Firestore helper functions
import { auth } from "./auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from "./firebase";
import { Player, Match, SetScore, Tournament, TournamentParticipant } from "./types";
import { calculateNewRating, DEFAULT_ELO } from "./elo";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ── Players ──

export async function addPlayer(name: string, icon: string = "🎾"): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const ref = await addDoc(collection(db, "players"), {
    name,
    icon,
    elo: DEFAULT_ELO,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    createdAt: Timestamp.now(),
    createdBy: user.uid,
  });
  return ref.id;
}

export async function getPlayers(): Promise<Player[]> {
  const snap = await getDocs(
    query(collection(db, "players"), orderBy("elo", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
}

// ── Matches ──

export async function recordMatch(
  player1Id: string,
  player2Id: string,
  player1Name: string,
  player2Name: string,
  sets: SetScore[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Count sets won by each player
  let p1Sets = 0, p2Sets = 0;
  for (const s of sets) {
    if (s.player1 > s.player2) p1Sets++;
    else if (s.player2 > s.player1) p2Sets++;
  }
  if (p1Sets === p2Sets) throw new Error("Match must have a winner (sets can't be tied)");
  const winnerId = p1Sets > p2Sets ? player1Id : player2Id;

  // Get current ratings
  const p1Snap = await getDocs(
    query(collection(db, "players"), where("__name__", "==", player1Id))
  );
  const p2Snap = await getDocs(
    query(collection(db, "players"), where("__name__", "==", player2Id))
  );

  const p1 = p1Snap.docs[0]?.data() as Player | undefined;
  const p2 = p2Snap.docs[0]?.data() as Player | undefined;

  if (!p1 || !p2) throw new Error("Player not found");

  // Calculate ELO based on match outcome
  const p1Won = winnerId === player1Id;
  const newRatingA = calculateNewRating(p1.elo, p2.elo, p1Won);
  const newRatingB = calculateNewRating(p2.elo, p1.elo, !p1Won);

  // Update player 1
  await updateDoc(doc(db, "players", player1Id), {
    elo: newRatingA,
    matchesPlayed: p1.matchesPlayed + 1,
    wins: p1.wins + (p1Won ? 1 : 0),
    losses: p1.losses + (p1Won ? 0 : 1),
  });

  // Update player 2
  await updateDoc(doc(db, "players", player2Id), {
    elo: newRatingB,
    matchesPlayed: p2.matchesPlayed + 1,
    wins: p2.wins + (p1Won ? 0 : 1),
    losses: p2.losses + (p1Won ? 1 : 0),
  });

  // Record match with sets
  await addDoc(collection(db, "matches"), {
    player1Id,
    player2Id,
    player1Name,
    player2Name,
    sets,
    player1Sets: p1Sets,
    player2Sets: p2Sets,
    winnerId,
    eloChange: Math.abs(newRatingA - p1.elo),
    date: Timestamp.now(),
    recordedBy: user.uid,
  });
}

export async function getMatches(): Promise<Match[]> {
  const snap = await getDocs(
    query(collection(db, "matches"), orderBy("date", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
}

export async function deletePlayer(playerId: string) {
  await deleteDoc(doc(db, "players", playerId));
}

export async function updatePlayerIcon(playerId: string, icon: string) {
  await updateDoc(doc(db, "players", playerId), { icon });
}

// ── Tournaments ──

export async function createTournament(data: {
  name: string;
  description: string;
  date: Date;
  location: string;
  format: "singles" | "doubles";
  maxPlayers: number;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const ref = await addDoc(collection(db, "tournaments"), {
    ...data,
    date: Timestamp.fromDate(data.date),
    participants: [],
    status: "upcoming",
    createdBy: user.uid,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getTournaments(): Promise<Tournament[]> {
  const snap = await getDocs(
    query(collection(db, "tournaments"), orderBy("date", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
}

export async function joinTournament(tournamentId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const participant: TournamentParticipant = { uid: user.uid, email: user.email || "" };
  await updateDoc(doc(db, "tournaments", tournamentId), {
    participants: arrayUnion(participant),
  });
}

export async function leaveTournament(tournamentId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const participant: TournamentParticipant = { uid: user.uid, email: user.email || "" };
  await updateDoc(doc(db, "tournaments", tournamentId), {
    participants: arrayRemove(participant),
  });
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  await deleteDoc(doc(db, "tournaments", tournamentId));
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: "upcoming" | "active" | "completed"
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId), { status });
}
