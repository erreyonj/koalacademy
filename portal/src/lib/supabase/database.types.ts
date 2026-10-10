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

/**
 * Row shape every behavior_* RPC returns (behavior_students minus flags).
 * A type alias, not an interface: supabase-js constrains rows to
 * Record<string, unknown>, which interfaces fail to satisfy.
 */
export type BehaviorStudentRow = {
  id: string;
  cohort: string;
  first_name: string;
  last_initial: string;
  preferred_name: string | null;
  marbles: number;
  prize: boolean;
  avatar_seed: string;
};

/** Class-level marbles held in a cohort's bucket beyond the student sum. */
export type BehaviorPoolRow = {
  cohort: string;
  marbles: number;
};

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
      behavior_students: {
        Row: BehaviorStudentRow & {
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      behavior_cohort_pool: {
        Row: BehaviorPoolRow & { updated_at: string };
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
      teacher_progress: {
        Args: { p_code: string };
        Returns: {
          band: string;
          section: string;
          lesson_slug: string;
          lesson: boolean;
          review: boolean;
          lab: boolean;
        }[];
      };
      teacher_set_progress: {
        Args: {
          p_code: string;
          p_band: string;
          p_section: string;
          p_lesson: string;
          p_phase: string;
          p_done: boolean;
        };
        Returns: {
          band: string;
          section: string;
          lesson_slug: string;
          lesson: boolean;
          review: boolean;
          lab: boolean;
        }[];
      };
      behavior_roster: {
        Args: { p_code: string };
        Returns: BehaviorStudentRow[];
      };
      behavior_adjust: {
        Args: { p_code: string; p_student: string; p_delta: number };
        Returns: BehaviorStudentRow[];
      };
      behavior_move: {
        Args: { p_code: string; p_student: string; p_cohort: string };
        Returns: BehaviorStudentRow[];
      };
      behavior_remove: {
        Args: { p_code: string; p_student: string };
        Returns: undefined;
      };
      behavior_prize: {
        Args: { p_code: string; p_student: string; p_on: boolean };
        Returns: BehaviorStudentRow[];
      };
      behavior_pools: {
        Args: { p_code: string };
        Returns: BehaviorPoolRow[];
      };
      behavior_pool_adjust: {
        Args: { p_code: string; p_cohort: string; p_delta: number };
        Returns: BehaviorPoolRow[];
      };
      behavior_empty: {
        Args: { p_code: string; p_cohort: string };
        Returns: undefined;
      };
      behavior_pool_set: {
        Args: { p_code: string; p_cohort: string; p_total: number };
        Returns: number;
      };
      behavior_set_preferred_name: {
        Args: { p_code: string; p_student: string; p_name: string };
        Returns: BehaviorStudentRow[];
      };
      class_seating_get: {
        Args: { p_code: string; p_class: string };
        Returns: {
          seats: Record<string, string>;
          students: {
            id: string;
            first_name: string;
            preferred_name: string | null;
          }[];
        };
      };
      class_seating_set: {
        Args: {
          p_code: string;
          p_class: string;
          p_seats: Record<string, string>;
        };
        Returns: undefined;
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
