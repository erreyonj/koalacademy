import type {
  SbGameMode,
  SbGameStatus,
  SbResponseStatus,
} from "@/lib/supabase/database.types";

/** Parsed result of the sb_state() RPC. */
export interface SbState {
  game: {
    id: string;
    code: string;
    status: SbGameStatus;
    mode: SbGameMode;
    responsesPerPlayer: number;
    turnSeconds: number;
    teamCount: number;
    round: number;
    currentTeamPos: number;
    isPaused: boolean;
    version: number;
    hostUserId: string;
  };
  me: { playerId: string; isHost: boolean; teamId: string | null } | null;
  players: SbPlayer[];
  teams: SbTeam[];
  scores: { round: number; teamId: string; points: number }[];
  bowl: { inBowl: number; inHand: number; guessed: number } | null;
  turn: SbTurn | null;
  upNext: { teamId: string | null; playerId: string | null } | null;
  serverTime: string;
}

export interface SbPlayer {
  id: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  teamId: string | null;
  teamOrder: number | null;
  cardsIn: number;
  removed: boolean;
}

export interface SbTeam {
  id: string;
  position: number;
  name: string;
  nextSlot: number;
}

export interface SbTurn {
  id: string;
  round: number;
  teamId: string;
  playerId: string;
  status: "active" | "ended";
  endsAt: string;
  remainingMs: number | null;
  passUsed: boolean;
  points: number;
  hasCard: boolean;
  /** Present only for the active player and the host (RLS-enforced). */
  cardText: string | null;
}

export interface SbResponseRow {
  id: string;
  text: string;
  status: SbResponseStatus;
  flagReason: string | null;
  submittedBy: string | null;
}

export type SbCommandType =
  | "create_game"
  | "join_game"
  | "recover_host"
  | "update_settings"
  | "open_submissions"
  | "set_deck"
  | "submit_response"
  | "retract_response"
  | "review_response"
  | "add_banned_word"
  | "lock_responses"
  | "randomize_teams"
  | "move_player"
  | "lock_teams"
  | "begin_round"
  | "start_turn"
  | "mark_correct"
  | "pass_card"
  | "end_turn"
  | "undo_last"
  | "pause"
  | "resume"
  | "skip_player"
  | "next_round"
  | "reset_round"
  | "remove_player"
  | "clear_game";

export interface SbCommandResult {
  ok: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/** Locally persisted seat so a refreshed iPad rejoins its game. */
export interface SbSeat {
  gameId: string;
  code: string;
  playerId: string;
  isHost: boolean;
  /** Shown once at creation; kept only on the host device. */
  recoveryPin?: string;
}
