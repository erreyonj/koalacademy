"use client";

import { useState, type FormEvent } from "react";
import { ActionError, Panel } from "./bits";
import type { SaladBowlSession } from "../useSaladBowl";
import type { SbSeat } from "../types";

/**
 * Entry screen: join with the class code, host a new game, or recover a
 * lost host seat with the private PIN.
 */
export function Landing({
  session,
  prefillCode,
}: {
  session: SaladBowlSession;
  prefillCode: string;
}) {
  const [tab, setTab] = useState<"join" | "host" | "recover">("join");

  return (
    <>
      <Panel>
        <div className="sb-actions" role="tablist" aria-label="Salad Bowl entry">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "join"}
            aria-pressed={tab === "join"}
            className="notation-btn"
            onClick={() => setTab("join")}
          >
            Join a game
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "host"}
            aria-pressed={tab === "host"}
            className="notation-btn"
            onClick={() => setTab("host")}
          >
            Host (teacher)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "recover"}
            aria-pressed={tab === "recover"}
            className="notation-btn"
            onClick={() => setTab("recover")}
          >
            Recover host
          </button>
        </div>
      </Panel>
      {tab === "join" ? (
        <JoinForm session={session} prefillCode={prefillCode} />
      ) : tab === "host" ? (
        <HostForm session={session} />
      ) : (
        <RecoverForm session={session} prefillCode={prefillCode} />
      )}
    </>
  );
}

function JoinForm({
  session,
  prefillCode,
}: {
  session: SaladBowlSession;
  prefillCode: string;
}) {
  const [code, setCode] = useState(prefillCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("join_game", {
      code: code.trim().toUpperCase(),
      displayName: name.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't join. Check the code.");
      return;
    }
    const seat: SbSeat = {
      gameId: result.gameId as string,
      code: code.trim().toUpperCase(),
      playerId: result.playerId as string,
      isHost: false,
    };
    session.takeSeat(seat);
  }

  return (
    <Panel title="Join a game">
      <form onSubmit={onSubmit} className="sb-card" style={{ border: 0, padding: 0 }}>
        <label className="sb-field">
          Game code (on the board)
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={5}
            placeholder="ABCDE"
            required
          />
        </label>
        <label className="sb-field">
          First name (add a last initial if two of you share it)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="off"
            placeholder="e.g. Maya R"
            required
          />
        </label>
        <ActionError message={error} />
        <button
          type="submit"
          className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
          disabled={busy}
        >
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </Panel>
  );
}

function HostForm({ session }: { session: SaladBowlSession }) {
  const [mode, setMode] = useState<"free_for_all" | "teacher_deck">("free_for_all");
  const [cards, setCards] = useState(2);
  const [seconds, setSeconds] = useState(60);
  const [teams, setTeams] = useState(2);
  const [name, setName] = useState("Teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("create_game", {
      mode,
      responsesPerPlayer: cards,
      turnSeconds: seconds,
      teamCount: teams,
      displayName: name.trim() || "Teacher",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't create the game.");
      return;
    }
    session.takeSeat({
      gameId: result.gameId as string,
      code: result.code as string,
      playerId: result.playerId as string,
      isHost: true,
      recoveryPin: result.recoveryPin as string,
    });
  }

  return (
    <Panel title="Host a new game">
      <form onSubmit={onSubmit} className="sb-card" style={{ border: 0, padding: 0 }}>
        <div className="sb-field">
          Card source
          <div className="sb-actions">
            <button
              type="button"
              className="notation-btn"
              aria-pressed={mode === "free_for_all"}
              onClick={() => setMode("free_for_all")}
            >
              Free-For-All
            </button>
            <button
              type="button"
              className="notation-btn"
              aria-pressed={mode === "teacher_deck"}
              onClick={() => setMode("teacher_deck")}
            >
              Koala / Music deck
            </button>
          </div>
          <p className="sb-note">
            {mode === "free_for_all"
              ? "Students write their own cards from their iPads. You review every card before play."
              : "You paste the whole deck — students only join, guess, and give clues."}
          </p>
        </div>
        {mode === "free_for_all" ? (
          <label className="sb-field">
            Cards per student
            <select value={cards} onChange={(e) => setCards(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        ) : null}
        <label className="sb-field">
          Seconds per turn
          <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
            <option value={45}>45</option>
            <option value={60}>60 (standard)</option>
            <option value={90}>90</option>
            <option value={120}>120</option>
          </select>
        </label>
        <label className="sb-field">
          Teams
          <select value={teams} onChange={(e) => setTeams(Number(e.target.value))}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label className="sb-field">
          Your display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
          />
        </label>
        <ActionError message={error} />
        <button
          type="submit"
          className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
          disabled={busy}
        >
          {busy ? "Creating…" : "Create game"}
        </button>
      </form>
    </Panel>
  );
}

function RecoverForm({
  session,
  prefillCode,
}: {
  session: SaladBowlSession;
  prefillCode: string;
}) {
  const [code, setCode] = useState(prefillCode);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("recover_host", {
      code: code.trim().toUpperCase(),
      pin: pin.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "bad_pin"
          ? "Wrong PIN."
          : (result.message ?? "Couldn't recover the game."),
      );
      return;
    }
    session.takeSeat({
      gameId: result.gameId as string,
      code: code.trim().toUpperCase(),
      playerId: result.playerId as string,
      isHost: true,
    });
  }

  return (
    <Panel title="Recover host controls">
      <p className="sb-note">
        Lost the host iPad or cleared the browser? Enter the game code and the
        recovery PIN shown when the game was created. This device becomes the
        teacher device.
      </p>
      <form onSubmit={onSubmit} className="sb-card" style={{ border: 0, padding: 0 }}>
        <label className="sb-field">
          Game code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={5}
            autoComplete="off"
            required
          />
        </label>
        <label className="sb-field">
          Recovery PIN
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            required
          />
        </label>
        <ActionError message={error} />
        <button type="submit" className="notation-btn sb-btn-wide" disabled={busy}>
          {busy ? "Checking…" : "Take over as host"}
        </button>
      </form>
    </Panel>
  );
}
