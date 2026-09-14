import { describe, expect, it } from "vitest";
import {
  activePlayerId,
  allCardsIn,
  clockSkewMs,
  formatClock,
  isMyTurn,
  playersMissingCards,
  remainingMs,
  roundInfo,
  scoresForRound,
  teamMembers,
  teamSizeSpread,
  totalScores,
} from "../engine";
import type { SbPlayer, SbState, SbTeam, SbTurn } from "../types";

function player(overrides: Partial<SbPlayer> & { id: string }): SbPlayer {
  return {
    userId: `u-${overrides.id}`,
    displayName: overrides.id,
    isHost: false,
    teamId: null,
    teamOrder: null,
    cardsIn: 0,
    removed: false,
    ...overrides,
  };
}

function team(overrides: Partial<SbTeam> & { id: string; position: number }): SbTeam {
  return { name: `Team ${overrides.position + 1}`, nextSlot: 0, ...overrides };
}

function baseState(overrides: Partial<SbState> = {}): SbState {
  return {
    game: {
      id: "g1",
      code: "ABCDE",
      status: "turn_active",
      mode: "free_for_all",
      responsesPerPlayer: 2,
      turnSeconds: 60,
      teamCount: 2,
      round: 1,
      currentTeamPos: 0,
      isPaused: false,
      version: 1,
      hostUserId: "u-host",
    },
    me: { playerId: "p1", isHost: false, teamId: "t1" },
    players: [],
    teams: [],
    scores: [],
    bowl: { inBowl: 5, inHand: 1, guessed: 2 },
    turn: null,
    upNext: null,
    serverTime: new Date().toISOString(),
    ...overrides,
  };
}

function turn(overrides: Partial<SbTurn> = {}): SbTurn {
  return {
    id: "turn1",
    round: 1,
    teamId: "t1",
    playerId: "p1",
    status: "active",
    endsAt: new Date(Date.now() + 30_000).toISOString(),
    remainingMs: null,
    passUsed: false,
    points: 0,
    hasCard: true,
    cardText: null,
    ...overrides,
  };
}

describe("remainingMs (pause/resume time math)", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);

  it("counts down from the server ends_at", () => {
    const state = baseState({
      turn: turn({ endsAt: new Date(now + 42_000).toISOString() }),
    });
    expect(remainingMs(state, now)).toBe(42_000);
  });

  it("never goes negative after expiry", () => {
    const state = baseState({
      turn: turn({ endsAt: new Date(now - 5_000).toISOString() }),
    });
    expect(remainingMs(state, now)).toBe(0);
  });

  it("freezes at the stored remainder while master-paused", () => {
    const state = baseState({
      game: { ...baseState().game, isPaused: true },
      turn: turn({
        endsAt: new Date(now - 60_000).toISOString(), // stale — must be ignored
        remainingMs: 17_500,
      }),
    });
    expect(remainingMs(state, now)).toBe(17_500);
    expect(remainingMs(state, now + 60_000)).toBe(17_500); // no drift while paused
  });

  it("corrects for device clock skew", () => {
    const state = baseState({
      turn: turn({ endsAt: new Date(now + 30_000).toISOString() }),
    });
    // Device clock 10s behind the server: without correction it would show 40s.
    expect(remainingMs(state, now - 10_000, 10_000)).toBe(30_000);
  });

  it("is zero with no active turn", () => {
    expect(remainingMs(baseState({ turn: null }), now)).toBe(0);
    expect(
      remainingMs(baseState({ turn: turn({ status: "ended" }) }), now),
    ).toBe(0);
  });
});

describe("clockSkewMs", () => {
  it("is positive when the device clock runs behind the server", () => {
    const fetchedAt = Date.UTC(2026, 0, 1, 12, 0, 0);
    const serverTime = new Date(fetchedAt + 3_000).toISOString();
    expect(clockSkewMs(serverTime, fetchedAt)).toBe(3_000);
  });

  it("returns 0 for garbage input", () => {
    expect(clockSkewMs("not a date", Date.now())).toBe(0);
  });
});

describe("formatClock", () => {
  it("formats m:ss and rounds up partial seconds", () => {
    expect(formatClock(60_000)).toBe("1:00");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(9_000)).toBe("0:09");
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-500)).toBe("0:00");
  });
});

describe("scores", () => {
  const teams = [
    team({ id: "t1", position: 0 }),
    team({ id: "t2", position: 1 }),
  ];
  const scores = [
    { round: 1, teamId: "t1", points: 4 },
    { round: 1, teamId: "t2", points: 6 },
    { round: 2, teamId: "t1", points: 5 },
  ];

  it("totals across rounds and sorts by points", () => {
    const totals = totalScores({ teams, scores });
    expect(totals.map((t) => t.team.id)).toEqual(["t1", "t2"]);
    expect(totals[0].points).toBe(9);
    expect(totals[1].points).toBe(6);
  });

  it("breaks ties by team position so the order is stable", () => {
    const tied = totalScores({
      teams,
      scores: [{ round: 1, teamId: "t2", points: 3 }, { round: 1, teamId: "t1", points: 3 }],
    });
    expect(tied.map((t) => t.team.id)).toEqual(["t1", "t2"]);
  });

  it("fills zero for rounds a team never scored in", () => {
    const round2 = scoresForRound({ teams, scores }, 2);
    expect(round2.find((s) => s.team.id === "t2")?.points).toBe(0);
  });
});

describe("turn ownership", () => {
  it("resolves the active player during a turn", () => {
    const state = baseState({ turn: turn({ playerId: "p9" }) });
    expect(activePlayerId(state)).toBe("p9");
    expect(isMyTurn(state)).toBe(false);
    expect(
      isMyTurn(baseState({ turn: turn({ playerId: "p1" }) })),
    ).toBe(true);
  });

  it("resolves the up-next player between turns", () => {
    const state = baseState({
      game: { ...baseState().game, status: "turn_ready" },
      turn: null,
      upNext: { teamId: "t1", playerId: "p1" },
    });
    expect(activePlayerId(state)).toBe("p1");
    expect(isMyTurn(state)).toBe(true);
  });

  it("is nobody's turn outside play states", () => {
    const state = baseState({
      game: { ...baseState().game, status: "lobby" },
      upNext: { teamId: "t1", playerId: "p1" },
    });
    expect(activePlayerId(state)).toBeNull();
  });
});

describe("quota tracking", () => {
  it("lists only non-host, non-removed players still owing cards", () => {
    const state = baseState({
      players: [
        player({ id: "host", isHost: true, cardsIn: 0 }),
        player({ id: "done", cardsIn: 2 }),
        player({ id: "short", cardsIn: 1 }),
        player({ id: "gone", cardsIn: 0, removed: true }),
      ],
    });
    expect(playersMissingCards(state).map((p) => p.id)).toEqual(["short"]);
    expect(allCardsIn(state)).toBe(false);
    state.players[2].cardsIn = 2;
    expect(allCardsIn(state)).toBe(true);
  });
});

describe("teams", () => {
  const state = baseState({
    teams: [team({ id: "t1", position: 0 }), team({ id: "t2", position: 1 })],
    players: [
      player({ id: "a", teamId: "t1", teamOrder: 1 }),
      player({ id: "b", teamId: "t1", teamOrder: 0 }),
      player({ id: "c", teamId: "t2", teamOrder: 0 }),
      player({ id: "x", teamId: "t1", teamOrder: 2, removed: true }),
    ],
  });

  it("orders members by team_order and drops removed players", () => {
    expect(teamMembers(state, "t1").map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("reports the size spread the server keeps at <= 1", () => {
    expect(teamSizeSpread(state)).toBe(1);
  });
});

describe("roundInfo", () => {
  it("names the three fixed rounds and clamps out-of-range values", () => {
    expect(roundInfo(1).title).toContain("Describe");
    expect(roundInfo(2).title).toContain("Charades");
    expect(roundInfo(3).title).toContain("One Word");
    expect(roundInfo(0).round).toBe(1);
    expect(roundInfo(9).round).toBe(3);
  });
});
