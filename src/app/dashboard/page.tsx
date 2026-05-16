"use client";

import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPlayers, getMatches, addPlayer, recordMatch, deletePlayer, updatePlayerIcon,
  getTournaments, createTournament, joinTournament, leaveTournament,
  deleteTournament, updateTournamentStatus,
} from "@/lib/db";
import type { Player, Match, SetScore, Tournament } from "@/lib/types";
import {
  Trophy, Users, Swords, LogOut, Trash2, Plus,
  Minus, Plus as PlusIcon, TrendingUp, TrendingDown,
  CalendarDays, MapPin, MessageCircle, Zap,
} from "lucide-react";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/YOUR_INVITE_CODE_HERE";

const PLAYER_ICONS = [
  "🎾", "🔥", "⚡", "💪", "🦁", "🐯", "🦅", "🐺",
  "🦈", "🐉", "🚀", "👑", "🌟", "💎", "🎯", "⚔️",
  "🛡️", "🧠", "🏅", "🦄", "🐻", "🦊", "🐼", "🌈",
];

const STATUS_STYLES: Record<Tournament["status"], { pill: string; bar: string }> = {
  upcoming:  { pill: "bg-blue-50 text-blue-700 border border-blue-200",      bar: "bg-blue-400" },
  active:    { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", bar: "bg-emerald-500" },
  completed: { pill: "bg-gray-100 text-gray-500 border border-gray-200",     bar: "bg-gray-300" },
};

const STATUS_LABELS: Record<Tournament["status"], string> = {
  upcoming: "Upcoming", active: "In Progress", completed: "Completed",
};

function winPct(wins: number, played: number) {
  return played === 0 ? 0 : Math.round((wins / played) * 100);
}

function getWinRateLabel(wins: number, played: number) {
  return played === 0 ? "—" : winPct(wins, played) + "%";
}

function getLastMatchResult(playerId: string, matches: Match[]): "won" | "lost" | null {
  const m = matches.find((m) => m.player1Id === playerId || m.player2Id === playerId);
  if (!m) return null;
  return m.winnerId === playerId ? "won" : "lost";
}

function getPlayerIcon(playerId: string, players: Player[]) {
  return players.find(p => p.id === playerId)?.icon || "🎾";
}

// ── Ranking card components ───────────────────────────────────────────────

function GoldCard({ p, result }: { p: Player; result: "won" | "lost" | null }) {
  const pct = winPct(p.wins, p.matchesPlayed);
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-amber-200/60 animate-fade-up">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500" />
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-black/5" />
      <div className="relative p-5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center shrink-0">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-0.5">RANK</span>
            <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-amber-900">1</span>
            </div>
          </div>
          <span className="text-4xl shrink-0 drop-shadow">{p.icon || "🎾"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-950 truncate">{p.name}</span>
              <span className="text-base">👑</span>
              {result === "won" && <TrendingUp className="w-4 h-4 text-amber-800 shrink-0" />}
              {result === "lost" && <TrendingDown className="w-4 h-4 text-amber-700 shrink-0" />}
            </div>
            <div className="text-sm text-amber-800 font-medium mt-0.5">
              {p.wins}W · {p.losses}L · {getWinRateLabel(p.wins, p.matchesPlayed)} win rate · {p.matchesPlayed} matches
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-black text-amber-950 stat-number leading-none">{p.elo}</div>
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mt-0.5">ELO</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 rounded-full bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MedalCard({ p, rank, result }: { p: Player; rank: 2 | 3; result: "won" | "lost" | null }) {
  const pct = winPct(p.wins, p.matchesPlayed);
  const gold = rank === 2;
  const gradient = gold
    ? "from-slate-300 via-gray-200 to-slate-300"
    : "from-orange-300 via-amber-300 to-orange-400";
  const shadow = gold ? "shadow-gray-200/80" : "shadow-orange-200/60";
  const textMain = gold ? "text-slate-800" : "text-orange-950";
  const textSub = gold ? "text-slate-600" : "text-orange-800";
  const barFill = gold ? "bg-slate-500/40" : "bg-orange-700/30";
  const barTrack = gold ? "bg-black/10" : "bg-black/10";
  const rankBg = gold ? "bg-white/40" : "bg-white/30";
  const medal = gold ? "🥈" : "🥉";

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg ${shadow} animate-fade-up delay-100`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${rankBg} rounded-xl flex items-center justify-center shrink-0`}>
            <span className="text-lg font-black">{medal}</span>
          </div>
          <span className="text-3xl shrink-0">{p.icon || "🎾"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-base ${textMain} truncate`}>{p.name}</span>
              {result === "won" && <TrendingUp className={`w-3.5 h-3.5 ${textSub} shrink-0`} />}
              {result === "lost" && <TrendingDown className={`w-3.5 h-3.5 ${textSub} shrink-0`} />}
            </div>
            <div className={`text-xs ${textSub} font-medium`}>
              {p.wins}W · {p.losses}L · {getWinRateLabel(p.wins, p.matchesPlayed)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-black ${textMain} stat-number leading-none`}>{p.elo}</div>
            <div className={`text-[10px] font-bold ${textSub} uppercase tracking-widest`}>ELO</div>
          </div>
        </div>
        <div className="mt-3">
          <div className={`h-1 ${barTrack} rounded-full overflow-hidden bg-black/10`}>
            <div className={`h-full ${barFill} rounded-full bar-fill`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RankCard({ p, rank, result }: { p: Player; rank: number; result: "won" | "lost" | null }) {
  const pct = winPct(p.wins, p.matchesPlayed);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-up delay-200 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-gray-400">{rank}</span>
        </div>
        <span className="text-2xl shrink-0">{p.icon || "🎾"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-800 truncate">{p.name}</span>
            {result === "won" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            {result === "lost" && <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 font-medium shrink-0">
              {p.wins}W {p.losses}L · {getWinRateLabel(p.wins, p.matchesPlayed)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 pl-2">
          <div className="text-xl font-black text-emerald-600 stat-number leading-none">{p.elo}</div>
          <div className="text-[10px] text-gray-300 uppercase tracking-widest font-semibold">ELO</div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddTournament, setShowAddTournament] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerIcon, setNewPlayerIcon] = useState("🎾");
  const [editIconPlayerId, setEditIconPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rankings" | "players" | "matches" | "tournaments">("rankings");

  const [matchP1, setMatchP1] = useState("");
  const [matchP2, setMatchP2] = useState("");
  const [matchSets, setMatchSets] = useState<SetScore[]>([
    { player1: 0, player2: 0 }, { player1: 0, player2: 0 },
  ]);
  const [matchError, setMatchError] = useState("");

  const [tName, setTName] = useState("");
  const [tDescription, setTDescription] = useState("");
  const [tDate, setTDate] = useState("");
  const [tLocation, setTLocation] = useState("");
  const [tFormat, setTFormat] = useState<"singles" | "doubles">("singles");
  const [tMaxPlayers, setTMaxPlayers] = useState(8);
  const [tError, setTError] = useState("");

  useEffect(() => { if (!user) return; loadData(); }, [user]);

  const loadData = async () => {
    const [p, m, t] = await Promise.all([getPlayers(), getMatches(), getTournaments()]);
    setPlayers(p); setMatches(m); setTournaments(t);
  };

  const handleAddPlayer = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName.trim(), newPlayerIcon);
    setNewPlayerName(""); setNewPlayerIcon("🎾"); setShowAddPlayer(false);
    loadData();
  };

  const handleChangeIcon = async (playerId: string, icon: string) => {
    await updatePlayerIcon(playerId, icon);
    setEditIconPlayerId(null); loadData();
  };

  const handleAddSet = () => { if (matchSets.length < 3) setMatchSets([...matchSets, { player1: 0, player2: 0 }]); };
  const handleRemoveSet = () => { if (matchSets.length > 2) setMatchSets(matchSets.slice(0, -1)); };

  const handleSetChange = (i: number, player: "player1" | "player2", value: number) => {
    const updated = [...matchSets];
    updated[i] = { ...updated[i], [player]: value };
    setMatchSets(updated);
  };

  const resetMatchForm = () => {
    setMatchP1(""); setMatchP2("");
    setMatchSets([{ player1: 0, player2: 0 }, { player1: 0, player2: 0 }]);
    setMatchError("");
  };

  const resetTournamentForm = () => {
    setTName(""); setTDescription(""); setTDate(""); setTLocation("");
    setTFormat("singles"); setTMaxPlayers(8); setTError("");
  };

  const handleRecordMatch = async (e: React.SyntheticEvent) => {
    e.preventDefault(); setMatchError("");
    if (matchP1 === matchP2) { setMatchError("Player 1 and Player 2 must be different"); return; }
    let p1Sets = 0, p2Sets = 0;
    for (const s of matchSets) {
      if (s.player1 > s.player2) p1Sets++;
      else if (s.player2 > s.player1) p2Sets++;
    }
    if (p1Sets === p2Sets) { setMatchError("Match must have a winner. Check your set scores."); return; }
    for (const s of matchSets) {
      if (s.player1 === s.player2 && s.player1 !== 0) { setMatchError("Sets cannot be tied. Use 7-6 for tiebreaks."); return; }
    }
    try {
      await recordMatch(matchP1, matchP2,
        players.find(p => p.id === matchP1)?.name || "",
        players.find(p => p.id === matchP2)?.name || "",
        matchSets
      );
      setShowAddMatch(false); resetMatchForm(); loadData();
    } catch (err: any) { setMatchError(err.message || "Failed to record match"); }
  };

  const handleCreateTournament = async (e: React.SyntheticEvent) => {
    e.preventDefault(); setTError("");
    if (!tName.trim() || !tDate || !tLocation.trim()) { setTError("Name, date, and location are required"); return; }
    try {
      await createTournament({ name: tName.trim(), description: tDescription.trim(), date: new Date(tDate), location: tLocation.trim(), format: tFormat, maxPlayers: tMaxPlayers });
      setShowAddTournament(false); resetTournamentForm(); loadData();
    } catch (err: any) { setTError(err.message || "Failed to create tournament"); }
  };

  const handleLogout = async () => { await logout(); router.push("/"); };

  if (!user) return null;

  const isAdmin = user.email === "sparenik2@gmail.com";
  const totalMatches = matches.length;
  const avgElo = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.elo, 0) / players.length) : 0;
  const upcomingCount = tournaments.filter(t => t.status !== "completed").length;

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-gray-50/30 transition-all";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #012318 0%, #022c22 30%, #064e3b 70%, #065f46 100%)" }}>
        {/* Court lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ch" x="0" y="0" width="300" height="200" patternUnits="userSpaceOnUse">
              <rect x="16" y="16" width="268" height="168" fill="none" stroke="white" strokeWidth="2"/>
              <line x1="150" y1="16" x2="150" y2="184" stroke="white" strokeWidth="1.5"/>
              <line x1="16" y1="100" x2="284" y2="100" stroke="white" strokeWidth="1.5"/>
              <rect x="52" y="52" width="196" height="96" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ch)"/>
        </svg>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_20%_50%,rgba(16,185,129,0.15)_0%,transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center justify-center shadow-inner">
              <span className="text-2xl">🎾</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">
                TennisFriends<span className="text-emerald-400">BCN</span>
              </h1>
              <p className="text-xs text-emerald-400/80 mt-0.5 font-medium tracking-wide">Barcelona tennis crew</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 rounded-xl text-sm font-semibold text-[#4ade80] transition-all">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            {isAdmin && (
              <span className="hidden sm:flex items-center gap-1 text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1.5 rounded-lg font-bold">
                ⚡ Admin
              </span>
            )}
            <button onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Sign out">
              <LogOut className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 -mt-5 mb-6 relative z-10">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Players", value: players.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { label: "Matches", value: totalMatches, icon: Swords, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
            { label: "Avg ELO", value: avgElo, icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Events", value: upcomingCount, icon: CalendarDays, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          ].map((s, i) => (
            <div key={s.label} className={`bg-white rounded-2xl shadow-sm border ${s.border} p-3 text-center animate-fade-up`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`inline-flex items-center justify-center w-7 h-7 ${s.bg} rounded-lg mb-1.5`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className={`text-xl font-black stat-number ${s.color} leading-none`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-6">
          {([
            { key: "rankings" as const, label: "Rankings", icon: Trophy },
            { key: "players" as const, label: "Players", icon: Users },
            { key: "matches" as const, label: "Matches", icon: Swords },
            { key: "tournaments" as const, label: "Tournaments", icon: CalendarDays },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ════════ RANKINGS ════════ */}
        {activeTab === "rankings" && (
          <div className="space-y-3 pb-10">
            {players.length === 0 ? (
              <EmptyState icon="🏆" title="No players yet" subtitle="Add some to get started!" />
            ) : players.map((p, i) => {
              const result = getLastMatchResult(p.id, matches);
              if (i === 0) return <GoldCard key={p.id} p={p} result={result} />;
              if (i === 1) return <MedalCard key={p.id} p={p} rank={2} result={result} />;
              if (i === 2) return <MedalCard key={p.id} p={p} rank={3} result={result} />;
              return <RankCard key={p.id} p={p} rank={i + 1} result={result} />;
            })}
          </div>
        )}

        {/* ════════ PLAYERS ════════ */}
        {activeTab === "players" && (
          <div className="pb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-gray-800 text-lg">Players</h2>
              {isAdmin && (
                <button onClick={() => setShowAddPlayer(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Add Player
                </button>
              )}
            </div>

            {isAdmin && showAddPlayer && (
              <form onSubmit={handleAddPlayer} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-5 animate-scale-in">
                <p className="text-sm font-bold text-gray-700 mb-4">New Player</p>
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player name" className={`flex-1 ${inputClass}`} autoFocus />
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400 min-w-[110px]">
                    <span className="text-xl">{newPlayerIcon}</span> pick below
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PLAYER_ICONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setNewPlayerIcon(icon)}
                      className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                        newPlayerIcon === icon ? "bg-emerald-100 ring-2 ring-emerald-500 scale-110" : "hover:bg-gray-100"
                      }`}>{icon}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">Add</button>
                  <button type="button" onClick={() => setShowAddPlayer(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {players.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all animate-fade-up">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {isAdmin && editIconPlayerId === p.id ? (
                        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-xl border max-w-[280px]">
                          {PLAYER_ICONS.map((icon) => (
                            <button key={icon} onClick={() => handleChangeIcon(p.id, icon)}
                              className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-100 transition-all ${
                                (p.icon || "🎾") === icon ? "bg-emerald-100 ring-2 ring-emerald-500" : ""
                              }`}>{icon}</button>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => { if (isAdmin) setEditIconPlayerId(p.id); }}
                          className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50 transition-all ${
                            isAdmin ? "cursor-pointer hover:ring-2 hover:ring-emerald-400" : ""
                          }`} title={isAdmin ? "Click to change icon" : ""}>
                          {p.icon || "🎾"}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full bar-fill" style={{ width: `${winPct(p.wins, p.matchesPlayed)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {p.wins}W {p.losses}L · {getWinRateLabel(p.wins, p.matchesPlayed)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 px-2">
                      <p className="text-xl font-black text-emerald-600 stat-number leading-none">{p.elo}</p>
                      <p className="text-[10px] text-gray-300 uppercase tracking-widest font-semibold">ELO</p>
                    </div>
                    {isAdmin && editIconPlayerId !== p.id && (
                      <button onClick={() => { deletePlayer(p.id); loadData(); }}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ MATCHES ════════ */}
        {activeTab === "matches" && (
          <div className="pb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-gray-800 text-lg">Matches</h2>
              <button onClick={() => { setShowAddMatch(true); resetMatchForm(); }} disabled={players.length < 2}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                <Plus className="w-4 h-4" /> Record Match
              </button>
            </div>

            {showAddMatch && (
              <form onSubmit={handleRecordMatch} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-5 animate-scale-in">
                <p className="text-sm font-bold text-gray-700 mb-4">Record a Match</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {[{ label: "Player 1", value: matchP1, other: matchP2, set: setMatchP1 },
                    { label: "Player 2", value: matchP2, other: matchP1, set: setMatchP2 }].map(({ label, value, other, set }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                      <select value={value} onChange={(e) => set(e.target.value)}
                        className={inputClass} required>
                        <option value="">Select player…</option>
                        {players.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === other}>
                            {p.icon || "🎾"} {p.name} ({p.elo})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Set Scores</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={handleAddSet} disabled={matchSets.length >= 3}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg disabled:opacity-30 transition-all">
                        <PlusIcon className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button type="button" onClick={handleRemoveSet} disabled={matchSets.length <= 2}
                        className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-all">
                        <Minus className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="grid gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1"
                      style={{ gridTemplateColumns: `1fr repeat(${matchSets.length}, 60px) auto` }}>
                      <div />
                      {matchSets.map((_, i) => <div key={i} className="text-center">S{i + 1}</div>)}
                      <div />
                    </div>
                    {[matchP1, matchP2].map((pid, rowIdx) => {
                      const p = players.find(p => p.id === pid);
                      return (
                        <div key={rowIdx} className="gap-2 items-center mb-1.5 grid"
                          style={{ gridTemplateColumns: `1fr repeat(${matchSets.length}, 60px) auto` }}>
                          <span className="text-sm font-semibold text-gray-700 truncate px-1">
                            {p ? `${p.icon || ""} ${p.name}` : `Player ${rowIdx + 1}`}
                          </span>
                          {matchSets.map((set, si) => (
                            <input key={si} type="number" min={0} max={7}
                              value={rowIdx === 0 ? set.player1 : set.player2}
                              onChange={(e) => handleSetChange(si, rowIdx === 0 ? "player1" : "player2", parseInt(e.target.value) || 0)}
                              className="w-full p-1.5 text-center border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
                          ))}
                          <span className="text-[11px] text-gray-400 px-1">pts</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Use 7-6 for tiebreaks · Best of {matchSets.length === 2 ? "2" : "3"} sets</p>
                </div>

                {matchError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4 border border-red-100">{matchError}</p>}

                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                    Record Match
                  </button>
                  <button type="button" onClick={() => setShowAddMatch(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {matches.length === 0 && <EmptyState icon="⚔️" title="No matches yet" subtitle="Record your first match!" />}
              {matches.map((m) => {
                const p1Won = m.winnerId === m.player1Id;
                const matchDate = new Date(m.date as any).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short",
                });
                return (
                  <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all animate-fade-up">
                    <div className={`h-1 ${p1Won ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xl shrink-0">{getPlayerIcon(m.player1Id, players)}</span>
                          <span className={`font-bold text-sm truncate ${p1Won ? "text-emerald-700" : "text-gray-500"}`}>{m.player1Name}</span>
                        </div>
                        <span className="text-xs font-black text-gray-300 shrink-0">VS</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className={`font-bold text-sm truncate ${!p1Won ? "text-emerald-700" : "text-gray-500"}`}>{m.player2Name}</span>
                          <span className="text-xl shrink-0">{getPlayerIcon(m.player2Id, players)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {m.sets?.map((set, i) => {
                            const p1WonSet = set.player1 > set.player2;
                            const winnerWonSet = (p1Won && p1WonSet) || (!p1Won && !p1WonSet);
                            return (
                              <div key={i} className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl text-xs font-black ${
                                winnerWonSet ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gray-50 text-gray-400"
                              }`}>
                                <span>{p1Won ? set.player1 : set.player2}</span>
                                <span className="text-[10px] font-normal text-gray-300 leading-none my-0.5">—</span>
                                <span>{p1Won ? set.player2 : set.player1}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-400">{matchDate}</span>
                          <span className={`font-bold px-2 py-1 rounded-lg ${p1Won ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                            ±{m.eloChange} ELO
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════ TOURNAMENTS ════════ */}
        {activeTab === "tournaments" && (
          <div className="pb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-gray-800 text-lg">Tournaments</h2>
              {isAdmin && (
                <button onClick={() => { setShowAddTournament(true); resetTournamentForm(); }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> New Tournament
                </button>
              )}
            </div>

            {isAdmin && showAddTournament && (
              <form onSubmit={handleCreateTournament} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-5 animate-scale-in">
                <p className="text-sm font-bold text-gray-700 mb-4">New Tournament</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Name *</label>
                    <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="BCN Spring Open" className={inputClass} autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Location *</label>
                    <input value={tLocation} onChange={(e) => setTLocation(e.target.value)} placeholder="Pista Central, Montjuïc" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date *</label>
                    <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Format</label>
                    <select value={tFormat} onChange={(e) => setTFormat(e.target.value as "singles" | "doubles")} className={inputClass}>
                      <option value="singles">Singles</option>
                      <option value="doubles">Doubles</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Max Players</label>
                    <input type="number" min={2} max={64} value={tMaxPlayers} onChange={(e) => setTMaxPlayers(parseInt(e.target.value) || 8)} className={inputClass} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description (optional)</label>
                  <textarea value={tDescription} onChange={(e) => setTDescription(e.target.value)} placeholder="Format details, prize, rules…"
                    rows={2} className={`${inputClass} resize-none`} />
                </div>
                {tError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-3 border border-red-100">{tError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">Create</button>
                  <button type="button" onClick={() => setShowAddTournament(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                </div>
              </form>
            )}

            {tournaments.length === 0 ? (
              <EmptyState icon="🏅" title="No tournaments yet" subtitle={isAdmin ? "Create the first one!" : "Check back soon."} />
            ) : (
              <div className="space-y-4">
                {tournaments.map((t) => {
                  const hasJoined = t.participants?.some((p) => p.uid === user.uid);
                  const joined = t.participants?.length ?? 0;
                  const isFull = joined >= t.maxPlayers;
                  const fillPct = Math.min(100, Math.round((joined / t.maxPlayers) * 100));
                  const tournamentDate = new Date(t.date as any).toLocaleDateString("en-GB", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  });
                  const s = STATUS_STYLES[t.status];
                  return (
                    <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all animate-fade-up">
                      <div className={`h-1.5 ${s.bar}`} />
                      <div className="p-5">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-black text-gray-800 text-base">{t.name}</h3>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.pill}`}>{STATUS_LABELS[t.status]}</span>
                              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{t.format}</span>
                            </div>
                            {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                          </div>
                          {isAdmin && (
                            <button onClick={() => { deleteTournament(t.id); loadData(); }}
                              className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-all shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />{tournamentDate}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />{t.location}
                          </span>
                        </div>

                        {/* Registration progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span className="font-semibold">Registration</span>
                            <span className={`font-bold ${isFull ? "text-red-500" : "text-emerald-600"}`}>
                              {joined} / {t.maxPlayers} players
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bar-fill ${isFull ? "bg-red-400" : "bg-emerald-400"}`}
                              style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>

                        {/* Participants */}
                        {t.participants && t.participants.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {t.participants.map((p) => (
                              <span key={p.uid} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                p.uid === user.uid
                                  ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400"
                                  : "bg-gray-100 text-gray-500"
                              }`}>{p.email}</span>
                            ))}
                          </div>
                        )}

                        {/* Admin status controls */}
                        {isAdmin && (
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {(["upcoming", "active", "completed"] as const).map((status) => (
                              <button key={status} onClick={() => { updateTournamentStatus(t.id, status); loadData(); }}
                                disabled={t.status === status}
                                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all disabled:opacity-40 ${STATUS_STYLES[status].pill}`}>
                                {STATUS_LABELS[status]}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Join / Leave */}
                        {t.status !== "completed" && (
                          hasJoined ? (
                            <button onClick={() => { leaveTournament(t.id); loadData(); }}
                              className="text-sm font-bold px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
                              Leave tournament
                            </button>
                          ) : (
                            <button onClick={() => { joinTournament(t.id); loadData(); }} disabled={isFull}
                              className="text-sm font-bold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 disabled:text-gray-400 text-white transition-all shadow-sm">
                              {isFull ? "Tournament full" : "Join tournament"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-14 text-center animate-fade-up">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-bold text-gray-500">{title}</p>
      <p className="text-gray-300 text-sm mt-1">{subtitle}</p>
    </div>
  );
}
