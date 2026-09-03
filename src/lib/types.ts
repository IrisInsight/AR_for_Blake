import type { LevelLabel } from "./ar";

export type NoseShape = "cone" | "rounded" | "blunt" | "needle";
export type FinStyle = "swept" | "straight" | "delta" | "none";
export type Decal = "none" | "stripes" | "stars" | "flames" | "lightning" | "teeth" | "shooting_star";
export type Booster = "none" | "twin" | "quad";
export type Engine = "standard" | "wide" | "triple";
export type Exhaust = "orange" | "blue" | "green" | "purple" | "pink" | "rainbow" | "comet";
export type PatchShape = "circle" | "shield" | "hex" | "star";

export interface Patch {
  shape: PatchShape;
  icon: string;
  c1: string;
  c2: string;
}

export interface RocketConfig {
  hull: string;
  nose: NoseShape;
  fins: FinStyle;
  decal: Decal;
  booster: Booster;
  engine: Engine;
  exhaust: Exhaust;
  name: string;
  patch: Patch;
}

export interface Kid {
  id: string;
  name: string;
  grade: number;
  goal_points: number;
  accent: string;
  avatar: string;
  bolts: number;
  lifetime_points: number;
  carry_over: number;
  rocket: RocketConfig;
  owned: string[];
  seen_flag_tip: boolean;
  sort_order: number;
  created_at: string;
}

export interface Book {
  id: string;
  norm_key: string;
  title: string;
  author: string;
  series: string | null;
  series_number: number | null;
  atos: number;
  word_count: number;
  description: string | null;
  emoji: string | null;
  points: number;
  source: string;
  format: string | null;
  page_count: number | null;
  year: number | null;
  cover_url: string | null;
  level_source: string | null;
  word_count_source: string | null;
  resolved_model: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type PrepStatus = "pending" | "generating" | "ready" | "failed";
export interface PrepItem {
  id: string;
  title: string;
  author: string | null;
  book_id: string | null;
  status: PrepStatus;
  source: string;
  error: string | null;
  tries: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  q: string;
  choices: string[];
  answer: number;
  skill: string;
}

export type AttemptStatus = "in_progress" | "passed" | "failed";
export type BonusStatus = "available" | "in_progress" | "passed" | "failed" | "declined" | null;

export interface Attempt {
  id: string;
  kid_id: string;
  book_id: string;
  status: AttemptStatus;
  question_idxs: number[];
  answers: Record<string, number>;
  flagged: number[];
  correct: number | null;
  total: number | null;
  percent: number | null;
  points_earned: number;
  bolts_earned: number;
  level_label: LevelLabel | null;
  bonus_status: BonusStatus;
  bonus_idxs: number[];
  bonus_answers: Record<string, number>;
  planet_id: string | null;
  archived: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Planet {
  id: string;
  kid_id: string;
  seq: number;
  name: string;
  color: string;
  style: number;
  points: number;
  goal_points: number;
  launched_at: string;
}

export interface Mission {
  id: string;
  kid_id: string;
  week_start: string;
  kind: string;
  target: number;
  progress: number;
  reward_bolts: number;
  completed_at: string | null;
  created_at: string;
}

export interface KidBadge {
  kid_id: string;
  badge_id: string;
  earned_at: string;
}

export interface LedgerEntry {
  id: number;
  kid_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

/** A search result before it becomes a stored book. */
export interface BookCandidate {
  title: string;
  author: string;
  series: string | null;
  series_number: number | null;
  atos: number;
  word_count: number;
  description: string;
  emoji: string;
  points: number;
  level: LevelLabel;
}

/** What the client sees for a question: never the answer. */
export interface ClientQuestion {
  idx: number;
  q: string;
  choices: string[];
}
