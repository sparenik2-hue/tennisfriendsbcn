// Firestore helper functions
import { auth } from "./auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from "./firebase";
import {
  Player, Match, SetScore,
  Tournament, TournamentParticipant, TournamentGroup, TournamentMatchRecord,
} from "./types";
import { calculateNewRating, DEFAULT_ELO } from "./elo";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ── Players ──────────────────────────────────────────────────────────────

export async function addPlayer(name: string, icon: string = "🎾"): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = await addDoc(collection(db, "players"), {
    name, icon, elo: DEFAULT_ELO, matchesPlayed: 0, wins: 0, losses: 0,
    createdAt: Timestamp.now(), createdBy: user.uid,
  });
  return ref.id;
}

export async function getPlayers(): Promise<Player[]> {
  const snap = await getDocs(query(collection(db, "players"), orderBy("elo", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
}

// ── Matches ───────────────────────────────────────────────────────────────

export async function recordMatch(
  player1Id: string, player2Id: string,
  player1Name: string, player2Name: string,
  sets: SetScore[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  let p1Sets = 0, p2Sets = 0;
  for (const s of sets) {
    if (s.player1 > s.player2) p1Sets++;
    else if (s.player2 > s.player1) p2Sets++;
  }
  if (p1Sets === p2Sets) throw new Error("Match must have a winner (sets can't be tied)");
  const winnerId = p1Sets > p2Sets ? player1Id : player2Id;

  const p1Snap = await getDocs(query(collection(db, "players"), where("__name__", "==", player1Id)));
  const p2Snap = await getDocs(query(collection(db, "players"), where("__name__", "==", player2Id)));
  const p1 = p1Snap.docs[0]?.data() as Player | undefined;
  const p2 = p2Snap.docs[0]?.data() as Player | undefined;
  if (!p1 || !p2) throw new Error("Player not found");

  const p1Won = winnerId === player1Id;
  const newRatingA = calculateNewRating(p1.elo, p2.elo, p1Won);
  const newRatingB = calculateNewRating(p2.elo, p1.elo, !p1Won);

  await updateDoc(doc(db, "players", player1Id), {
    elo: newRatingA, matchesPlayed: p1.matchesPlayed + 1,
    wins: p1.wins + (p1Won ? 1 : 0), losses: p1.losses + (p1Won ? 0 : 1),
  });
  await updateDoc(doc(db, "players", player2Id), {
    elo: newRatingB, matchesPlayed: p2.matchesPlayed + 1,
    wins: p2.wins + (p1Won ? 0 : 1), losses: p2.losses + (p1Won ? 1 : 0),
  });
  await addDoc(collection(db, "matches"), {
    player1Id, player2Id, player1Name, player2Name, sets,
    player1Sets: p1Sets, player2Sets: p2Sets, winnerId,
    eloChange: Math.abs(newRatingA - p1.elo),
    date: Timestamp.now(), recordedBy: user.uid,
  });
}

export async function getMatches(): Promise<Match[]> {
  const snap = await getDocs(query(collection(db, "matches"), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
}

export async function deletePlayer(playerId: string) {
  await deleteDoc(doc(db, "players", playerId));
}

export async function updatePlayerIcon(playerId: string, icon: string) {
  await updateDoc(doc(db, "players", playerId), { icon });
}

export async function updatePlayerPlaytomic(playerId: string, playtomicUsername: string) {
  await updateDoc(doc(db, "players", playerId), { playtomicUsername: playtomicUsername.trim() });
}

// ── Tournaments ───────────────────────────────────────────────────────────

export async function createTournament(data: {
  name: string;
  description: string;
  date: Date;
  location: string;
  format: "singles" | "doubles";
  tournamentFormat: "round_robin" | "groups_knockout";
  numGroups: number;
  maxPlayers: number;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = await addDoc(collection(db, "tournaments"), {
    ...data,
    date: Timestamp.fromDate(data.date),
    participants: [],
    groups: [],
    scheduleGenerated: false,
    status: "upcoming",
    createdBy: user.uid,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getTournaments(): Promise<Tournament[]> {
  const snap = await getDocs(query(collection(db, "tournaments"), orderBy("date", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
}

// Join — supports optional player-profile link for ELO seeding
export async function joinTournament(
  tournamentId: string,
  playerId?: string,
  playerName?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = doc(db, "tournaments", tournamentId);
  const snap = await getDoc(ref);
  const current: TournamentParticipant[] = snap.data()?.participants ?? [];
  const others = current.filter(p => p.uid !== user.uid);
  others.push({
    uid: user.uid,
    email: user.email || "",
    ...(playerId   ? { playerId }   : {}),
    ...(playerName ? { playerName } : {}),
  });
  await updateDoc(ref, { participants: others });
}

export async function leaveTournament(tournamentId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = doc(db, "tournaments", tournamentId);
  const snap = await getDoc(ref);
  const current: TournamentParticipant[] = snap.data()?.participants ?? [];
  await updateDoc(ref, { participants: current.filter(p => p.uid !== user.uid) });
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  await deleteDoc(doc(db, "tournaments", tournamentId));
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: Tournament["status"]
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId), { status });
}

// ── Tournament bracket ────────────────────────────────────────────────────

/**
 * Snake-seeds participants by ELO into numGroups groups, then creates
 * all round-robin pairings per group in the tournaments/{id}/matches sub-collection.
 */
export async function generateTournamentSchedule(
  tournamentId: string,
  numGroups: number,
  allPlayers: Player[]
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const tSnap = await getDoc(doc(db, "tournaments", tournamentId));
  const tData = tSnap.data();
  if (!tData) throw new Error("Tournament not found");

  const participants: TournamentParticipant[] = tData.participants ?? [];
  if (participants.length < numGroups * 2)
    throw new Error(`Need at least ${numGroups * 2} participants to generate ${numGroups} groups`);

  // Sort by ELO descending; players without a linked profile go to the bottom
  const seeded = [...participants].sort((a, b) => {
    const eloA = allPlayers.find(p => p.id === a.playerId)?.elo ?? 0;
    const eloB = allPlayers.find(p => p.id === b.playerId)?.elo ?? 0;
    return eloB - eloA;
  });

  // Snake seeding: round 0 left→right, round 1 right→left, …
  const groups: TournamentGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: String.fromCharCode(65 + i), // A, B, C, D
    participants: [],
  }));
  seeded.forEach((p, i) => {
    const round = Math.floor(i / numGroups);
    const pos   = i % numGroups;
    const idx   = round % 2 === 0 ? pos : numGroups - 1 - pos;
    groups[idx].participants.push(p);
  });

  // Create all round-robin pairings per group
  const batch = writeBatch(db);
  for (const group of groups) {
    const ps = group.participants;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const mRef = doc(collection(db, "tournaments", tournamentId, "matches"));
        batch.set(mRef, {
          phase: "group",
          group: group.id,
          player1Uid:   ps[i].uid,
          player1Email: ps[i].email,
          player1Name:  ps[i].playerName ?? ps[i].email,
          player2Uid:   ps[j].uid,
          player2Email: ps[j].email,
          player2Name:  ps[j].playerName ?? ps[j].email,
          status: "scheduled",
          createdAt: Timestamp.now(),
        });
      }
    }
  }
  batch.update(doc(db, "tournaments", tournamentId), {
    groups,
    numGroups,
    scheduleGenerated: true,
    status: "active",
  });
  await batch.commit();
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatchRecord[]> {
  const snap = await getDocs(
    query(collection(db, "tournaments", tournamentId, "matches"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentMatchRecord));
}

export async function setTournamentMatchWinner(
  tournamentId: string,
  matchId: string,
  winnerId: string
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "matches", matchId), {
    winnerId,
    status: "played",
  });
}

/**
 * Creates the two semi-final pairings (A1 vs B2, B1 vs A2) based on
 * current group standings and moves the tournament to "finals" status.
 */
export async function generateFinalsSchedule(
  tournamentId: string,
  groups: TournamentGroup[],
  groupMatches: TournamentMatchRecord[]
): Promise<void> {
  if (groups.length < 2) throw new Error("Need at least 2 groups");

  const getStandings = (group: TournamentGroup) =>
    group.participants.map(p => {
      const played = groupMatches.filter(
        m => m.phase === "group" && m.group === group.id && m.status === "played" &&
             (m.player1Uid === p.uid || m.player2Uid === p.uid)
      );
      const wins = played.filter(m => m.winnerId === p.uid).length;
      return { ...p, wins, points: wins * 2 };
    }).sort((a, b) => b.points - a.points || b.wins - a.wins);

  const aRows = getStandings(groups[0]);
  const bRows = getStandings(groups[1]);
  const [a1, a2] = aRows;
  const [b1, b2] = bRows;
  if (!a1 || !a2 || !b1 || !b2) throw new Error("Not enough players in standings");

  const batch = writeBatch(db);
  const mkParticipant = (p: typeof a1) => ({
    uid: p.uid, email: p.email, name: p.playerName ?? p.email,
  });

  // Semi 1: 1st Group A vs 2nd Group B
  const s1 = mkParticipant(a1), s2 = mkParticipant(b2);
  batch.set(doc(collection(db, "tournaments", tournamentId, "matches")), {
    phase: "semifinal",
    player1Uid: s1.uid, player1Email: s1.email, player1Name: s1.name,
    player2Uid: s2.uid, player2Email: s2.email, player2Name: s2.name,
    status: "scheduled", createdAt: Timestamp.now(),
  });

  // Semi 2: 1st Group B vs 2nd Group A
  const s3 = mkParticipant(b1), s4 = mkParticipant(a2);
  batch.set(doc(collection(db, "tournaments", tournamentId, "matches")), {
    phase: "semifinal",
    player1Uid: s3.uid, player1Email: s3.email, player1Name: s3.name,
    player2Uid: s4.uid, player2Email: s4.email, player2Name: s4.name,
    status: "scheduled", createdAt: Timestamp.now(),
  });

  batch.update(doc(db, "tournaments", tournamentId), { status: "finals" });
  await batch.commit();
}

/**
 * Creates the final match once both semi-finals have been played.
 */
export async function generateFinalMatch(
  tournamentId: string,
  semifinals: TournamentMatchRecord[]
): Promise<void> {
  const played = semifinals.filter(m => m.phase === "semifinal" && m.status === "played");
  if (played.length < 2) throw new Error("Both semi-finals must be completed first");

  const getWinner = (m: TournamentMatchRecord) => {
    const isP1 = m.player1Uid === m.winnerId;
    return {
      uid:   isP1 ? m.player1Uid   : m.player2Uid,
      email: isP1 ? m.player1Email : m.player2Email,
      name:  isP1 ? (m.player1Name ?? m.player1Email) : (m.player2Name ?? m.player2Email),
    };
  };
  const f1 = getWinner(played[0]);
  const f2 = getWinner(played[1]);

  await addDoc(collection(db, "tournaments", tournamentId, "matches"), {
    phase: "final",
    player1Uid: f1.uid, player1Email: f1.email, player1Name: f1.name,
    player2Uid: f2.uid, player2Email: f2.email, player2Name: f2.name,
    status: "scheduled", createdAt: Timestamp.now(),
  });
}
