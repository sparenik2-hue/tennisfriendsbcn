"use client";

import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayers, getMatches, addPlayer, recordMatch, deletePlayer, updatePlayerIcon } from "@/lib/db";
import type { Player, Match, SetScore } from "@/lib/types";
import {
  Trophy, Users, Swords, LogOut, Trash2, Plus, X,
  Minus, Plus as PlusIcon, TrendingUp, TrendingDown,
  Activity, ChevronRight
} from "lucide-react";

const PLAYER_ICONS = [
  "🎾", "🔥", "⚡", "💪", "🦁", "🐯", "🦅", "🐺",
  "🦈", "🐉", "🚀", "👑", "🌟", "💎", "🎯", "⚔️",
  "🛡️", "🧠", "🏅", "🦄", "🐻", "🦊", "🐼", "🌈",
];

function getLastMatchResult(playerId: string, matches: Match[]): "won" | "lost" | null {
  const lastMatch = matches.find(
    (m) => m.player1Id === playerId || m.player2Id === playerId
  );
  if (!lastMatch) return null;
  return lastMatch.winnerId === playerId ? "won" : "lost";
}

function getPlayerIcon(playerId: string, players: Player[]): string {
  return players.find(p => p.id === playerId)?.icon || "🎾";
}

function getWinRate(wins: number, played: number): string {
  if (played === 0) return "—";
  return Math.round((wins / played) * 100) + "%";
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerIcon, setNewPlayerIcon] = useState("🎾");
  const [editIconPlayerId, setEditIconPlayerId] = useState<string | null>(null);
  const [editIconValue, setEditIconValue] = useState("");
  const [activeTab, setActiveTab] = useState<"rankings" | "players" | "matches">("rankings");

  const [matchP1, setMatchP1] = useState("");
  const [matchP2, setMatchP2] = useState("");
  const [matchSets, setMatchSets] = useState<SetScore[]>([
    { player1: 0, player2: 0 },
    { player1: 0, player2: 0 },
  ]);
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [p, m] = await Promise.all([getPlayers(), getMatches()]);
    setPlayers(p);
    setMatches(m);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName.trim(), newPlayerIcon);
    setNewPlayerName("");
    setNewPlayerIcon("🎾");
    setShowAddPlayer(false);
    loadData();
  };

  const handleChangeIcon = async (playerId: string, newIcon: string) => {
    await updatePlayerIcon(playerId, newIcon);
    setEditIconPlayerId(null);
    loadData();
  };

  const handleAddSet = () => {
    if (matchSets.length >= 3) return;
    setMatchSets([...matchSets, { player1: 0, player2: 0 }]);
  };

  const handleRemoveSet = () => {
    if (matchSets.length <= 2) return;
    setMatchSets(matchSets.slice(0, -1));
  };

  const handleSetChange = (index: number, player: "player1" | "player2", value: number) => {
    const updated = [...matchSets];
    updated[index] = { ...updated[index], [player]: value };
    setMatchSets(updated);
  };

  const resetMatchForm = () => {
    setMatchP1("");
    setMatchP2("");
    setMatchSets([{ player1: 0, player2: 0 }, { player1: 0, player2: 0 }]);
    setMatchError("");
  };

  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchError("");

    if (matchP1 === matchP2) {
      setMatchError("Player 1 and Player 2 must be different");
      return;
    }

    let p1Sets = 0, p2Sets = 0;
    for (const s of matchSets) {
      if (s.player1 > s.player2) p1Sets++;
      else if (s.player2 > s.player1) p2Sets++;
    }

    if (p1Sets === p2Sets) {
      setMatchError("Match must have a winner. Check your set scores.");
      return;
    }

    for (const s of matchSets) {
      if (s.player1 === s.player2 && s.player1 !== 0) {
        setMatchError("Sets cannot be tied. Use 7-6 for tiebreaks.");
        return;
      }
    }

    try {
      await recordMatch(
        matchP1, matchP2,
        players.find(p => p.id === matchP1)?.name || "",
        players.find(p => p.id === matchP2)?.name || "",
        matchSets
      );
      setShowAddMatch(false);
      resetMatchForm();
      loadData();
    } catch (err: any) {
      setMatchError(err.message || "Failed to record match");
    }
  };

  const handleDeletePlayer = async (id: string) => {
    await deletePlayer(id);
    loadData();
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user) return null;

  const isAdmin = user.email === "sparenik2@gmail.com";

  const totalMatches = matches.length;
  const avgElo = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.elo, 0) / players.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎾</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TennisFriendsBCN</h1>
              <p className="text-xs text-emerald-200">BCN tennis crew rankings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-100 hidden sm:block">
              {user.email}
              {isAdmin && <span className="ml-1.5 text-xs bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-semibold">Admin</span>}
            </span>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Sign out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{players.length}</p>
            <p className="text-xs text-gray-400">Players</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalMatches}</p>
            <p className="text-xs text-gray-400">Matches</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{avgElo}</p>
            <p className="text-xs text-gray-400">Avg ELO</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-1 bg-white/80 backdrop-blur rounded-xl p-1 shadow-sm border mb-6">
          {([
            { key: "rankings" as const, label: "Rankings", icon: Trophy },
            { key: "players" as const, label: "Players", icon: Users },
            { key: "matches" as const, label: "Matches", icon: Swords },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════ RANKINGS TAB ════════ */}
        {activeTab === "rankings" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">🏆 Current Rankings</h2>
              <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border">
                {players.length} player{players.length !== 1 ? "s" : ""}
              </span>
            </div>
            {players.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <div className="text-6xl mb-4">🎾</div>
                <p className="text-gray-400 font-medium">No players yet</p>
                <p className="text-gray-300 text-sm mt-1">Add some to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map((p, i) => {
                  const result = getLastMatchResult(p.id, matches);
                  const winRate = getWinRate(p.wins, p.matchesPlayed);
                  const top3 = ["from-amber-400 to-yellow-300", "from-gray-300 to-gray-200", "from-orange-400 to-amber-300"];
                  return (
                    <div
                      key={p.id}
                      className={`group bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all overflow-hidden ${
                        i < 3 ? "border-l-4 border-l-emerald-500" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Rank badge */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                          i === 0 ? "bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 shadow-sm" :
                          i === 1 ? "bg-gradient-to-br from-gray-100 to-slate-200 text-gray-500 shadow-sm" :
                          i === 2 ? "bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 shadow-sm" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {i + 1}
                        </div>

                        {/* Icon + Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{p.icon || "🎾"}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-800 truncate">{p.name}</p>
                              {result === "won" && <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />}
                              {result === "lost" && <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="font-medium text-emerald-600">{p.wins}W</span>
                              <span className="text-gray-300">-</span>
                              <span className="font-medium text-red-400">{p.losses}L</span>
                              <span className="text-gray-300">·</span>
                              <span>{winRate} win rate</span>
                              <span className="text-gray-300">·</span>
                              <span>{p.matchesPlayed} matches</span>
                            </div>
                          </div>
                        </div>

                        {/* ELO */}
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-emerald-600">{p.elo}</p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400">ELO</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════ PLAYERS TAB ════════ */}
        {activeTab === "players" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800">👥 Players</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Player
                </button>
              )}
            </div>

            {/* Add Player Form */}
            {isAdmin && showAddPlayer && (
              <form onSubmit={handleAddPlayer} className="bg-white p-5 rounded-2xl shadow-sm border mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">New Player</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Player name"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                    <div className="flex gap-1">
                      <div className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 min-w-[120px]">
                        <span className="text-xl">{newPlayerIcon}</span>
                        <span className="text-xs text-gray-400">pick one ↓</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                  {PLAYER_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewPlayerIcon(icon)}
                      className={`text-xl w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                        newPlayerIcon === icon
                          ? "bg-emerald-100 ring-2 ring-emerald-500 scale-110"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all">
                    Add Player
                  </button>
                  <button type="button" onClick={() => setShowAddPlayer(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Player List */}
            <div className="grid gap-3">
              {players.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    {/* Icon (clickable to change for admin) */}
                    <div className="relative">
                      {isAdmin && editIconPlayerId === p.id ? (
                        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-xl border max-w-[280px]">
                          {PLAYER_ICONS.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => handleChangeIcon(p.id, icon)}
                              className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-100 transition-all ${
                                (p.icon || "🎾") === icon ? "bg-emerald-100 ring-2 ring-emerald-500" : ""
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (isAdmin) {
                              setEditIconPlayerId(p.id);
                              setEditIconValue(p.icon || "🎾");
                            }
                          }}
                          className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50 transition-all ${
                            isAdmin ? "cursor-pointer hover:ring-2 hover:ring-emerald-400" : ""
                          }`}
                          title={isAdmin ? "Click to change icon" : ""}
                        >
                          {p.icon || "🎾"}
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="font-semibold text-emerald-600">{p.wins}W</span>
                        <span className="text-gray-300">-</span>
                        <span className="font-semibold text-red-400">{p.losses}L</span>
                        <span className="text-gray-300">·</span>
                        <span>{getWinRate(p.wins, p.matchesPlayed)} win rate</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-600">{p.elo}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">ELO</p>
                    </div>

                    {isAdmin && editIconPlayerId !== p.id && (
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-all"
                        title="Delete player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ MATCHES TAB ════════ */}
        {activeTab === "matches" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800">⚔️ Recent Matches</h2>
              <button
                onClick={() => { setShowAddMatch(true); resetMatchForm(); }}
                disabled={players.length < 2}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Record Match
              </button>
            </div>

            {/* Record Match Form */}
            {showAddMatch && (
              <form onSubmit={handleRecordMatch} className="bg-white p-6 rounded-2xl shadow-sm border mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">Record a Match</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Player 1</label>
                    <select
                      value={matchP1}
                      onChange={(e) => setMatchP1(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      required
                    >
                      <option value="">Select...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id === matchP2}>
                          {p.icon || "🎾"} {p.name} ({p.elo})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Player 2</label>
                    <select
                      value={matchP2}
                      onChange={(e) => setMatchP2(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      required
                    >
                      <option value="">Select...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id === matchP1}>
                          {p.icon || "🎾"} {p.name} ({p.elo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Set Scores */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500">Set Scores</label>
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
                    <div className="grid grid-cols-[1fr_repeat(3,60px)_auto] gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                      <div></div>
                      {matchSets.map((_, i) => (
                        <div key={i} className="text-center">S{i + 1}</div>
                      ))}
                      <div></div>
                    </div>

                    {[matchP1, matchP2].map((pid, rowIdx) => {
                      const p = players.find(p => p.id === pid);
                      return (
                        <div key={rowIdx} className="grid grid-cols-[1fr_repeat(3,60px)_auto] gap-2 items-center mb-1.5">
                          <span className="text-sm font-medium text-gray-700 truncate px-1">
                            {p ? `${p.icon || ""} ${p.name}` : `Player ${rowIdx + 1}`}
                          </span>
                          {matchSets.map((set, si) => (
                            <input
                              key={si}
                              type="number"
                              min={0} max={7}
                              value={rowIdx === 0 ? set.player1 : set.player2}
                              onChange={(e) => handleSetChange(si, rowIdx === 0 ? "player1" : "player2", parseInt(e.target.value) || 0)}
                              className="w-full p-1.5 text-center border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="0"
                            />
                          ))}
                          <span className="text-[11px] text-gray-400 px-1">games</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Use 7-6 for tiebreaks · Best of {matchSets.length === 2 ? "2" : "3"} sets</p>
                </div>

                {matchError && (
                  <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">{matchError}</p>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                    Record Match
                  </button>
                  <button type="button" onClick={() => setShowAddMatch(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Match History */}
            <div className="space-y-3">
              {matches.map((m) => {
                const p1Won = m.winnerId === m.player1Id;
                const matchDate = new Date(m.date as any).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                });
                const p1Icon = getPlayerIcon(m.player1Id, players);
                const p2Icon = getPlayerIcon(m.player2Id, players);
                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all ${
                      p1Won ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{p1Icon}</span>
                        <span className={`font-bold truncate ${p1Won ? "text-emerald-700" : "text-gray-500"}`}>
                          {m.player1Name}
                        </span>
                        <span className="text-gray-300 text-sm shrink-0">vs</span>
                        <span className={`font-bold truncate ${!p1Won ? "text-emerald-700" : "text-gray-500"}`}>
                          {m.player2Name}
                        </span>
                        <span className="text-lg shrink-0">{p2Icon}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-gray-400">{matchDate}</span>
                      <span className="text-gray-200">|</span>
                      <div className="flex gap-1.5">
                        {m.sets?.map((set, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded font-medium ${
                            p1Won
                              ? (set.player1 > set.player2 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400")
                              : (set.player2 > set.player1 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400")
                          }`}>
                            {set.player1}-{set.player2}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-200">|</span>
                      <span className={`text-xs font-semibold ${p1Won ? "text-emerald-600" : "text-amber-600"}`}>
                        ±{m.eloChange} ELO
                      </span>
                    </div>
                  </div>
                );
              })}
              {matches.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                  <div className="text-6xl mb-4">🎾</div>
                  <p className="text-gray-400 font-medium">No matches yet</p>
                  <p className="text-gray-300 text-sm mt-1">Record your first match!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
