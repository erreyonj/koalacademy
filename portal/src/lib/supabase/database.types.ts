/**
 * Hand-maintained database types for the tables and functions the portal
 * reads. Only client-visible columns are listed (column-level grants hide
 * the rest — e.g. sb_games.recovery_pin_hash never reaches a browser).
 * Regenerate against a local stack with:
 *   npx supabase gen types typescript --local
 * and reconcile if the schema changes.
 */

export type SbGameStatus =
  | "lobby"
  | "collecting"
  | "reviewing"
  | "teams"
  | "round_intro"
  | "turn_ready"
  | "turn_active"
  | "round_end"
  | "finished";

export type SbGameMode = "free_for_all" | "teacher_deck";

export type SbResponseStatus = "pending" | "accepted" | "rejected" | "flagged";

export type SbCardState = "bowl" | "hand" | "guessed";

export interface Database {
  public: {
    Tables: {
      sb_games: {
        Row: {
          id: string;
          code: string;
          status: SbGameStatus;
          mode: SbGameMode;
          responses_per_player: number;
          turn_seconds: number;
          team_count: number;
          round: number;
          current_team_pos: number;
          is_paused: boolean;
          version: number;
          host_user_id: string;
          created_at: string;
          expires_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sb_players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          display_name: string;
          name_key: string;
          is_host: boolean;
          team_id: string | null;
          team_order: number | null;
          cards_in: number;
          removed: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sb_teams: {
        Row: {
          id: string;
          game_id: string;
          position: number;
          name: string;
          next_slot: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sb_responses: {
        Row: {
          id: string;
          game_id: string;
          submitted_by: string | null;
          text: string;
          text_key: string;
          status: SbResponseStatus;
          flag_reason: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sb_round_cards: {
        Row: {
          game_id: string;
          round: number;
          response_id: string;
          state: SbCardState;
          guessed_by_team: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sb_turns: {
        Row: {
          id: string;
          game_id: string;
          round: number;
          team_id: string;
          player_id: string;
          status: "active" | "ended";
          started_at: string;
          ends_at: string;
          remaining_ms: number | null;
          pass_used: boolean;
          points: number;
          current_card_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sb_state: {
        Args: { p_game: string };
        Returns: unknown;
      };
    };
    Enums: {
      sb_game_status: SbGameStatus;
      sb_game_mode: SbGameMode;
      sb_response_status: SbResponseStatus;
      sb_card_state: SbCardState;
    };
    CompositeTypes: Record<string, never>;
  };
}
