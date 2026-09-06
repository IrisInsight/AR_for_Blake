export interface Machine {
  cabinet: string; // paint id
  theme: string; // symbol theme id
  lever: string; // lever knob id
  lights: string; // marquee light color id
  name: string; // painted on the marquee
}

export interface Kid {
  id: string;
  name: string;
  grade: number;
  goal_points: number;
  accent: string;
  avatar: string;
  bolts: number; // shown as coins
  lifetime_points: number;
  carry_over: number;
  owned: string[];
  sort_order: number;
  spins_bank: number;
  carry_seconds: number;
  level: number;
  lifetime_minutes: number;
  machine: Machine;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  kid_id: string;
  started_at: string;
  ended_at: string | null;
  minutes: number;
  source: string;
  note: string | null;
  created_at: string;
}

export type SpinKind = "none" | "pair" | "triple" | "jackpot";

export interface Spin {
  id: string;
  kid_id: string;
  reels: number[];
  symbols: string[];
  points: number;
  coins: number;
  kind: SpinKind;
  jackpot_id: string | null;
  created_at: string;
}

export interface Jackpot {
  id: string;
  kid_id: string;
  seq: number;
  name: string;
  color: string;
  points: number;
  minutes: number;
  goal_points: number;
  hit_at: string;
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
