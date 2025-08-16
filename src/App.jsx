import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Local storage keys ---
const LS_KEY = "koth40k_state_v1";
const UNLOCK_LS_KEY = "koth40k_players_unlocked_v1";

// --- Utils ---
const uid = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();

function download(filename, text) {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "application/json" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  element.remove();
}

function encodeShare(state) {
  try {
    const json = JSON.stringify(state);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}${window.location.pathname}#data=${b64}`;
  } catch (e) {
    console.error(e);
    return "";
  }
}

function decodeShare(hash) {
  try {
    const m = hash.match(/#data=([A-Za-z0-9+/=]+)/);
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(m[1])));
    return JSON.parse(json);
  } catch (e) {
    console.error(e);
    return null;
  }
}

// --- Default seed ---
const seedState = {
  players: [
    { id: uid(), name: "Alice" },
    { id: uid(), name: "Boris" },
    { id: uid(), name: "Cass" },
  ],
  kingId: null,
  history: [],
};

// --- Small presentational bits ---
function Section({ title, subtitle, children }) {
  return (
    <section className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-800 p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm">
      {children}
    </span>
  );
}

function PlayerPill({ name }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold">
        {initials || "?"}
      </div>
      <span className="font-medium">{name}</span>
    </div>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium shadow-sm transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 outline-none focus:ring-2 focus:ring-indigo-500 ${props.className || ""}`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full min-h-[90px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 ${props.className || ""}`}
    />
  );
}

// --- Row for the table ---
function HistoryRow({ match, players, onDelete, unlocked }) {
  const winner = players.find((p) => p.id === match.winnerId);
  const loser = players.find((p) => p.id === match.loserId);
  return (
    <tr className="border-b last:border-0 border-zinc-200 dark:border-zinc-800">
      <td className="py-2 text-sm whitespace-nowrap text-zinc-600 dark:text-zinc-400">
        {new Date(match.date).toLocaleString()}
      </td>
      <td className="py-2 text-sm">{winner?.name}</td>
      <td className="py-2 text-sm">{loser?.name}</td>
      <td className="py-2 text-sm max-w-[250px] truncate" title={match.notes}>
        {match.notes || "—"}
      </td>
      <td className="py-2 text-right">
        {unlocked && (
          <button
            className="text-sm text-red-600 hover:text-red-700"
            onClick={() => onDelete(match.id)}
            aria-label="Delete match"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

export default function App() {
  const [state, setState] = useState(seedState);
  const [newPlayer, setNewPlayer] = useState("");
  const [notes, setNotes] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [winner, setWinner] = useState("king"); // "king" or "opponent"
  const fileRef = useRef(null);

  // --- Players gate state (unlocked -> can add/make king/delete) ---
  const [unlocked, setUnlocked] = useState(false);

  // Load from URL (shared) or localStorage
  useEffect(() => {
    const shared = decodeShare(window.location.hash);
    if (shared) {
      setState(shared);
      return;
    }
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {}
    }

    // Restore unlock state
    const u = localStorage.getItem(UNLOCK_LS_KEY);
    if (u === "true") setUnlocked(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const players = state.players;
  const king = useMemo(
    () => players.find((p) => p.id === state.kingId) || null,
    [players, state.kingId]
  );

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name) return;
    setState((s) => ({ ...s, players: [...s.players, { id: uid(), name }] }));
    setNewPlayer("");
  };

  const removeMatch = (id) =>
    setState((s) => ({ ...s, history: s.history.filter((m) => m.id !== id) }));

  const recordMatch = () => {
    if (!state.kingId || !opponentId) return;
    const kingId = state.kingId;
    const winnerId = winner === "king" ? kingId : opponentId;
    const loserId = winner === "king" ? opponentId : kingId;
    const match = {
      id: uid(),
      date: nowISO(),
      winnerId,
      loserId,
      notes: notes.trim(),
    };

    setState((s) => ({
      ...s,
      kingId: winnerId, // throne changes if king loses
      history: [match, ...s.history],
    }));

    setNotes("");
    setWinner("king");
    setOpponentId("");
  };

  const setInitialKing = (pid) => setState((s) => ({ ...s, kingId: pid }));

  const exportJSON = () => download("koth40k.json", JSON.stringify(state, null, 2));
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(String(e.target?.result || ""));
        setState(obj);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const shareLink = () => {
    const url = encodeShare(state);
    navigator.clipboard
      .writeText(url)
      .then(() => alert("Read-only link copied to clipboard!"));
  };

  const kingStreak = useMemo(() => {
    if (!state.kingId) return 0;
    let streak = 0;
    for (const match of state.history) {
      if (match.winnerId === state.kingId) streak++;
      else if (match.loserId === state.kingId) break;
    }
    return streak;
  }, [state.history, state.kingId]);

  // --- Unlock / Lock handlers (header "Pass" button) ---
  const PASSWORD = "secret123"; // change this
  const onPassClick = () => {
    const input = window.prompt("Enter password to unlock editing:");
    if (input == null) return; // cancelled
    if (input === PASSWORD) {
      setUnlocked(true);
      localStorage.setItem(UNLOCK_LS_KEY, "true");
    } else {
      alert("Wrong password");
    }
  };

  // Longest overall streak across the full history
  const longestStreak = useMemo(() => {
    if (state.history.length === 0) return { count: 0, playerId: null };
    // Iterate oldest -> newest so consecutive wins by same king form a streak
    const hist = [...state.history].reverse();
    let currentKingId = null;
    let currentCount = 0;
    let best = { count: 0, playerId: null };

    for (const match of hist) {
      const winnerId = match.winnerId;
      if (winnerId === currentKingId) {
        currentCount += 1;
      } else {
        currentKingId = winnerId;
        currentCount = 1;
      }
      if (currentCount > best.count) {
        best = { count: currentCount, playerId: currentKingId };
      }
    }
    return best;
  }, [state.history]);

  const longestStreakName = useMemo(
    () => players.find((p) => p.id === longestStreak.playerId)?.name || "—",
    [players, longestStreak.playerId]
  );

  const onLockClick = () => {
    setUnlocked(false);
    localStorage.removeItem(UNLOCK_LS_KEY);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-amber-400 text-amber-950 font-black grid place-items-center">👑</span>
              40K — King of the Hill
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Track your club’s reigning champion, record matches, and share a read-only scoreboard.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OutlineButton onClick={exportJSON}>⬇️ Export</OutlineButton>
            <OutlineButton onClick={() => fileRef.current?.click()}>⬆️ Import</OutlineButton>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            <PrimaryButton onClick={shareLink}>🔗 Share link</PrimaryButton>
            {!unlocked ? (
              <OutlineButton onClick={onPassClick}>Pass</OutlineButton>
            ) : (
              <OutlineButton onClick={onLockClick}>Lock</OutlineButton>
            )}
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Current King */}
          <Section title="Current King" subtitle="Who sits on the throne right now.">
            {!king ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No king yet. Choose a starting king{unlocked ? ":" : " (unlock required)"}</p>
                {unlocked && (
                  <select
                    className="h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                    onChange={(e) => setInitialKing(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Select player</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <PlayerPill name={king.name} />
                  <Pill>Streak: {kingStreak}</Pill>
                </div>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Challenge the King</label>
                  <div className="flex gap-2">
                    <select
                      className="h-10 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                      value={opponentId}
                      onChange={(e) => setOpponentId(e.target.value)}
                    >
                      <option value="">Select challenger</option>
                      {players.filter((p) => p.id !== state.kingId).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <PrimaryButton onClick={recordMatch} disabled={!opponentId}>Record</PrimaryButton>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      className={`h-10 rounded-xl border ${winner === "king" ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-300 dark:border-zinc-700"}`}
                      onClick={() => setWinner("king")}
                    >
                      Winner: {king?.name}
                    </button>
                    <button
                      className={`h-10 rounded-xl border ${winner === "opponent" ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-300 dark:border-zinc-700"}`}
                      onClick={() => setWinner("opponent")}
                      disabled={!opponentId}
                    >
                      Winner: {players.find((p) => p.id === opponentId)?.name || "Challenger"}
                    </button>
                  </div>
                  <label className="text-sm font-medium mt-2">Notes</label>
                  <TextArea
                    placeholder="e.g. Mission: Priority Targets, 2000pts, Grey Knights vs Orks"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Players (roster always visible; add/make king gated) */}
          <Section
            title="Players"
            subtitle={
              unlocked
                ? "Add and manage your club roster."
                : "Roster visible. Use Pass to edit."
            }
          >
            {unlocked && (
              <div className="flex gap-2 mb-3">
                <TextInput
                  placeholder="Add player name"
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                />
                <PrimaryButton onClick={addPlayer}>Add</PrimaryButton>
              </div>
            )}

            {/* Roster is always visible */}
            <ul className="space-y-2">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <PlayerPill name={p.name} />
                  {unlocked && state.kingId !== p.id && (
                    <OutlineButton onClick={() => setInitialKing(p.id)}>
                      Make King
                    </OutlineButton>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {/* Match History */}
          <Section title="Match History" subtitle="Latest first.">
            {state.history.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No matches yet. Record your first challenge!
              </p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-zinc-500">
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Winner</th>
                      <th className="py-2 font-medium">Loser</th>
                      <th className="py-2 font-medium">Notes</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.history.map((m) => (
                      <HistoryRow
                        key={m.id}
                        match={m}
                        players={players}
                        onDelete={removeMatch}
                        unlocked={unlocked}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Summary */}
          <Section title="Club Summary" subtitle="Quick stats at a glance.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat title="Players" value={players.length} />
              <Stat title="Matches" value={state.history.length} />
              <Stat title="Longest Streak" value={`${longestStreak.count} — ${longestStreakName}`} />
            </div>
          </Section>
        </div>

        <footer className="text-center text-xs text-zinc-500 pt-4">
          Built for Warhammer 40K clubs • Data is stored locally in your browser • Use “Share link” for read-only sharing
        </footer>
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="text-2xl font-semibold">{String(value)}</p>
    </div>
  );
}
