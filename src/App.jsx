import React, { useEffect, useMemo, useRef, useState } from "react";

// ... [unchanged parts above] ...

          {/* Players */}
          <Section
          title="Players"
          subtitle={
            showPlayers
              ? "Add and manage your club roster."
              : "Roster visible. Use Pass to edit."
          }
        >
          {showPlayers && (
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
                {showPlayers && state.kingId !== p.id && (
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
                      unlocked={showPlayers}
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
            <Stat title="Current King" value={king?.name || "—"} />
            <Stat title="Current Streak" value={king ? kingStreak : 0} />
          </div>
        </Section>
      </div>

      <footer className="text-center text-xs text-zinc-500 pt-4">
        Built for Warhammer 40K clubs • Data is stored locally in your browser • Use “Share link” for read‑only sharing
      </footer>
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
