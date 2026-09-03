-- Reader Rocket schema
-- Applied to Supabase project "reader-rocket". No auth: the app is server-rendered and
-- talks to Postgres through the Supabase publishable key from server code only, so the
-- policies below grant the anon role full access to these app tables.

create table if not exists kids (
  id text primary key,
  name text not null,
  grade int not null check (grade between 1 and 8),
  goal_points numeric(6,1) not null default 20,
  accent text not null default '#ff7a1a',
  avatar text not null default 'astronaut',
  bolts int not null default 0,
  lifetime_points numeric(8,1) not null default 0,
  carry_over numeric(6,1) not null default 0,
  rocket jsonb not null default '{}'::jsonb,
  owned text[] not null default '{}',
  seen_flag_tip boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  norm_key text unique not null,
  title text not null,
  author text not null,
  series text,
  series_number int,
  atos numeric(4,1) not null,
  word_count int not null,
  description text,
  emoji text,
  points numeric(6,1) not null,
  source text not null default 'search',
  created_at timestamptz not null default now()
);

create table if not exists question_pools (
  book_id uuid not null references books(id) on delete cascade,
  kind text not null check (kind in ('main','bonus')),
  questions jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  primary key (book_id, kind)
);

create table if not exists planets (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  seq int not null,
  name text not null,
  color text not null,
  style int not null default 0,
  points numeric(6,1) not null,
  goal_points numeric(6,1) not null,
  launched_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','passed','failed')),
  question_idxs int[] not null,
  answers jsonb not null default '{}'::jsonb,
  flagged int[] not null default '{}',
  correct int,
  total int,
  percent numeric(5,3),
  points_earned numeric(6,1) not null default 0,
  bolts_earned int not null default 0,
  level_label text,
  bonus_status text check (bonus_status in ('available','in_progress','passed','failed','declined')),
  bonus_idxs int[] not null default '{}',
  bonus_answers jsonb not null default '{}'::jsonb,
  planet_id uuid references planets(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (kid_id, book_id)
);
create index if not exists attempts_kid_idx on attempts (kid_id, completed_at desc);

create table if not exists question_flags (
  id bigserial primary key,
  book_id uuid not null references books(id) on delete cascade,
  kind text not null,
  question_idx int not null,
  kid_id text references kids(id) on delete set null,
  attempt_id uuid references attempts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists question_flags_book_idx on question_flags (book_id, kind, question_idx);

create table if not exists kid_badges (
  kid_id text not null references kids(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (kid_id, badge_id)
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  week_start date not null,
  kind text not null,
  target int not null,
  progress int not null default 0,
  reward_bolts int not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kid_id, week_start, kind)
);

create table if not exists bolt_ledger (
  id bigserial primary key,
  kid_id text not null references kids(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists bolt_ledger_kid_idx on bolt_ledger (kid_id, created_at desc);

-- Row level security: open to the anon role (the app has no accounts by design).
do $$
declare t text;
begin
  foreach t in array array['kids','books','question_pools','planets','attempts','question_flags','kid_badges','missions','bolt_ledger']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;

-- Seed the two readers so there is no setup flow.
insert into kids (id, name, grade, goal_points, accent, avatar, sort_order, rocket)
values
  ('blake', 'Blake', 3, 20, '#ff7a1a', 'astronaut', 0,
   '{"hull":"red","nose":"cone","fins":"swept","decal":"none","booster":"none","engine":"standard","exhaust":"orange","name":"Blake 1","patch":{"shape":"circle","icon":"rocket","c1":"#ff7a1a","c2":"#1b2a4a"}}'::jsonb),
  ('brooklyn', 'Brooklyn', 5, 20, '#c26cff', 'cat', 1,
   '{"hull":"purple","nose":"rounded","fins":"delta","decal":"none","booster":"none","engine":"standard","exhaust":"orange","name":"Brooklyn 1","patch":{"shape":"shield","icon":"star","c1":"#c26cff","c2":"#1b2a4a"}}'::jsonb)
on conflict (id) do nothing;
