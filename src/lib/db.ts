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
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from "./firebase";
import { Player, Match } from "./types";
import { calculateMatchRatings, DEFAULT_ELO } from "./elo";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ── Players ──

export async function addPlayer(name: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const ref = await addDoc(collection(db, "players"), {
    name,
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
  player1Score: number,
  player2Score: number
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

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

  const { newRatingA, newRatingB, changeA, changeB } = calculateMatchRatings(
    p1.elo,
    p2.elo,
    player1Score,
    player2Score
  );

  const winnerId = player1Score > player2Score ? player1Id : player2Id;

  // Update player 1
  await updateDoc(doc(db, "players", player1Id), {
    elo: newRatingA,
    matchesPlayed: p1.matchesPlayed + 1,
    wins: p1.wins + (winnerId === player1Id ? 1 : 0),
    losses: p1.losses + (winnerId !== player1Id ? 1 : 0),
  });

  // Update player 2
  await updateDoc(doc(db, "players", player2Id), {
    elo: newRatingB,
    matchesPlayed: p2.matchesPlayed + 1,
    wins: p2.wins + (winnerId === player2Id ? 1 : 0),
    losses: p2.losses + (winnerId !== player2Id ? 1 : 0),
  });

  // Record match
  await addDoc(collection(db, "matches"), {
    player1Id,
    player2Id,
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    winnerId,
    eloChange: Math.abs(changeA),
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
