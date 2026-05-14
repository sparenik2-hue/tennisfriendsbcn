"use client";

import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayers, getMatches, addPlayer, recordMatch, deletePlayer } from "@/lib/db";
import type { Player, Match } from "@/lib/types";
import { Trophy, Users, Swords, LogOut, Trash2, Plus, X, Award } from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [activeTab, setActiveTab] = useState<"rankings" | "players" | "matches">("rankings");

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

  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await recordMatch(
      data.get("p1") as string,
      data.get("p2") as string,
      players.find(p => p.id === data.get("p1"))?.name || "",
      players.find(p => p.id === data.get("p2"))?.name || "",
      parseInt(data.get("s1") as string),
      parseInt(data.get("s2") as string)
    );
    setShowAddMatch(false);
    loadData();
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
            <h1 className="text-xl font-bold text-gray-800">Tennis Ranking</h1>
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
          {[
            { key: "rankings", label: "Rankings", icon: Trophy },
            { key: "players", label: "Players", icon: Users },
            { key: "matches", label: "Matches", icon: Swords },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
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
                      <p className="font-medium text-gray-800">{p.name}</p>
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
                onClick={() => setShowAddMatch(true)}
                disabled={players.length < 2}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Record Match
              </button>
            </div>

            {showAddMatch && (
              <form onSubmit={handleRecordMatch} className="bg-white p-6 rounded-xl shadow-sm border mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Player 1</label>
                    <select name="p1" className="w-full p-2 border rounded-lg" required>
                      <option value="">Select...</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.elo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Player 2</label>
                    <select name="p2" className="w-full p-2 border rounded-lg" required>
                      <option value="">Select...</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.elo})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Score (games won)</label>
                    <input name="s1" type="number" min={0} className="w-full p-2 border rounded-lg" placeholder="e.g. 6" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Score (games won)</label>
                    <input name="s2" type="number" min={0} className="w-full p-2 border rounded-lg" placeholder="e.g. 4" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">Record Match</button>
                  <button type="button" onClick={() => setShowAddMatch(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${m.winnerId === m.player1Id ? "text-emerald-700" : "text-gray-500"}`}>
                        {m.player1Name} {m.winnerId === m.player1Id && "👑"}
                      </span>
                      <span className="text-sm font-bold text-gray-400">vs</span>
                      <span className={`font-medium ${m.winnerId === m.player2Id ? "text-emerald-700" : "text-gray-500"}`}>
                        {m.player2Name} {m.winnerId === m.player2Id && "👑"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Score: {m.player1Score} - {m.player2Score} · ELO change: ±{m.eloChange}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(m.date as any).toLocaleDateString()}</span>
                </div>
              ))}
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
