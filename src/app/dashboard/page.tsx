"use client";

import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayers, getMatches, addPlayer, recordMatch, deletePlayer } from "@/lib/db";
import type { Player, Match, SetScore } from "@/lib/types";
import { Trophy, Users, Swords, LogOut, Trash2, Plus, X, Minus, Plus as PlusIcon } from "lucide-react";

function getLastMatchResult(playerId: string, matches: Match[]): "won" | "lost" | null {
  const lastMatch = matches.find(
    (m) => m.player1Id === playerId || m.player2Id === playerId
  );
  if (!lastMatch) return null;
  return lastMatch.winnerId === playerId ? "won" : "lost";
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [activeTab, setActiveTab] = useState<"rankings" | "players" | "matches">("rankings");

  // Match form state
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
    await addPlayer(newPlayerName.trim());
    setNewPlayerName("");
    setShowAddPlayer(false);
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

    // Count set winners
    let p1Sets = 0, p2Sets = 0;
    for (const s of matchSets) {
      if (s.player1 > s.player2) p1Sets++;
      else if (s.player2 > s.player1) p2Sets++;
    }

    if (p1Sets === p2Sets) {
      setMatchError("Match must have a winner. Check your set scores.");
      return;
    }

    // Check no set is tied (except both can be 0 if the set wasn't played)
    for (const s of matchSets) {
      if (s.player1 === s.player2 && s.player1 !== 0) {
        setMatchError("Sets cannot be tied. Use 7-6 for tiebreaks.");
        return;
      }
    }

    try {
      await recordMatch(
        matchP1,
        matchP2,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <h1 className="text-xl font-bold text-gray-800">TennisFriendsBCN</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border mb-6">
          {([
            { key: "rankings" as const, label: "Rankings", icon: Trophy },
            { key: "players" as const, label: "Players", icon: Users },
            { key: "matches" as const, label: "Matches", icon: Swords },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rankings Tab */}
        {activeTab === "rankings" && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">🏆 Current Rankings</h2>
              <span className="text-sm text-gray-400">{players.length} players</span>
            </div>
            {players.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No players yet. Add some!</div>
            ) : (
              <div className="divide-y">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-gray-100 text-gray-500" :
                      i === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {p.name}
                        {(() => {
                          const result = getLastMatchResult(p.id, matches);
                          if (result === "won") return <span className="text-green-500 ml-1.5 font-bold" title="Won last match">↑</span>;
                          if (result === "lost") return <span className="text-red-500 ml-1.5 font-bold" title="Lost last match">↓</span>;
                          return null;
                        })()}
                      </p>
                      <p className="text-xs text-gray-400">{p.wins}W - {p.losses}L ({p.matchesPlayed} matches)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{p.elo}</p>
                      <p className="text-xs text-gray-400">ELO</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg">👥 Players</h2>
              <button
                onClick={() => setShowAddPlayer(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Player
              </button>
            </div>

            {showAddPlayer && (
              <form onSubmit={handleAddPlayer} className="bg-white p-4 rounded-xl shadow-sm border mb-4 flex gap-3">
                <input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Add</button>
                <button type="button" onClick={() => setShowAddPlayer(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">ELO {p.elo} · {p.matchesPlayed} matches</p>
                  </div>
                  <button onClick={() => handleDeletePlayer(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === "matches" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg">⚔️ Matches</h2>
              <button
                onClick={() => { setShowAddMatch(true); resetMatchForm(); }}
                disabled={players.length < 2}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Record Match
              </button>
            </div>

            {showAddMatch && (
              <form onSubmit={handleRecordMatch} className="bg-white p-6 rounded-xl shadow-sm border mb-4">
                {/* Player Selection */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Player 1</label>
                    <select
                      value={matchP1}
                      onChange={(e) => setMatchP1(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      required
                    >
                      <option value="">Select...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id === matchP2}>
                          {p.name} ({p.elo})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Player 2</label>
                    <select
                      value={matchP2}
                      onChange={(e) => setMatchP2(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      required
                    >
                      <option value="">Select...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id === matchP1}>
                          {p.name} ({p.elo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sets */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">Set Scores</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handleAddSet}
                        disabled={matchSets.length >= 3}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Add set"
                      >
                        <PlusIcon className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSet}
                        disabled={matchSets.length <= 2}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Remove set"
                      >
                        <Minus className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-400 mb-1">
                      <div></div>
                      <div className="text-center">Set 1</div>
                      <div className="text-center">Set 2</div>
                      {matchSets[2] !== undefined && <div className="text-center">Set 3</div>}
                      {matchSets[2] === undefined && <div></div>}
                      <div></div>
                    </div>

                    {matchP1 && (
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {players.find(p => p.id === matchP1)?.name}
                        </span>
                        {matchSets.map((set, i) => (
                          <input
                            key={`p1-${i}`}
                            type="number"
                            min={0}
                            max={7}
                            value={set.player1}
                            onChange={(e) => handleSetChange(i, "player1", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 text-center border rounded text-sm"
                          />
                        ))}
                        <span className="text-xs text-gray-400">games</span>
                      </div>
                    )}
                    {!matchP1 && (
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <span className="text-sm text-gray-400">Player 1</span>
                        {matchSets.map((_, i) => (
                          <div key={i} className="w-full p-1.5 text-center border rounded bg-white text-gray-300 text-sm">-</div>
                        ))}
                        <div></div>
                      </div>
                    )}

                    {matchP2 && (
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {players.find(p => p.id === matchP2)?.name}
                        </span>
                        {matchSets.map((set, i) => (
                          <input
                            key={`p2-${i}`}
                            type="number"
                            min={0}
                            max={7}
                            value={set.player2}
                            onChange={(e) => handleSetChange(i, "player2", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 text-center border rounded text-sm"
                          />
                        ))}
                        <span className="text-xs text-gray-400">games</span>
                      </div>
                    )}
                    {!matchP2 && (
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <span className="text-sm text-gray-400">Player 2</span>
                        {matchSets.map((_, i) => (
                          <div key={i} className="w-full p-1.5 text-center border rounded bg-white text-gray-300 text-sm">-</div>
                        ))}
                        <div></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Use 7-6 for tiebreaks. Best of 3 sets.</p>
                </div>

                {matchError && (
                  <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4">{matchError}</p>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Record Match
                  </button>
                  <button type="button" onClick={() => setShowAddMatch(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Match History */}
            <div className="space-y-3">
              {matches.map((m) => {
                const p1Won = m.winnerId === m.player1Id;
                return (
                  <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${p1Won ? "text-emerald-700" : "text-gray-500"}`}>
                            {m.player1Name} {p1Won && "👑"}
                          </span>
                          <span className="text-gray-300 text-sm">vs</span>
                          <span className={`font-semibold ${!p1Won ? "text-emerald-700" : "text-gray-500"}`}>
                            {m.player2Name} {!p1Won && "👑"}
                          </span>
                        </div>
                        {/* Set scores display */}
                        <div className="flex gap-3 mt-1">
                          {m.sets?.map((set, i) => (
                            <span key={i} className={`text-sm px-2 py-0.5 rounded ${
                              p1Won
                                ? (set.player1 > set.player2 ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-gray-50 text-gray-400")
                                : (set.player2 > set.player1 ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-gray-50 text-gray-400")
                            }`}>
                              {set.player1}-{set.player2}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">ELO change: ±{m.eloChange}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(m.date as any).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              {matches.length === 0 && (
                <div className="text-center text-gray-400 py-8">No matches recorded yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
