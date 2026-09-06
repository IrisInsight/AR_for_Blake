-- Pivot: every minute of reading earns a spin; spins earn points. Quizzes, books and AI are gone.
drop table if exists question_flags cascade;
drop table if exists attempts cascade;
drop table if exists question_pools cascade;
drop table if exists prep_queue cascade;
drop table if exists search_cache cascade;
drop table if exists warmed_series cascade;
drop table if exists api_usage cascade;
drop table if exists planets cascade;
drop table if exists books cascade;

alter table kids
  add column if not exists spins_bank int not null default 0,
  add column if not exists carry_seconds int not null default 0,
  add column if not exists level int not null default 0,
  add column if not exists lifetime_minutes int not null default 0,
  add column if not exists machine jsonb not null default '{}'::jsonb;
alter table kids drop column if exists rocket;
alter table kids drop column if exists seen_flag_tip;

create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int not null default 0,
  source text not null default 'timer',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists reading_sessions_kid_idx on reading_sessions (kid_id, started_at desc);

create table if not exists jackpots (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  seq int not null,
  name text not null,
  color text not null,
  points int not null,
  minutes int not null default 0,
  goal_points int not null,
  hit_at timestamptz not null default now()
);

create table if not exists spins (
  id uuid primary key default gen_random_uuid(),
  kid_id text not null references kids(id) on delete cascade,
  reels int[] not null,
  symbols text[] not null,
  points int not null,
  coins int not null default 0,
  kind text not null check (kind in ('none','pair','triple','jackpot')),
  jackpot_id uuid references jackpots(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists spins_kid_idx on spins (kid_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['reading_sessions','jackpots','spins']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;

-- Fresh start for Blake under the new rules.
update kids set bolts = 0, lifetime_points = 0, carry_over = 0, owned = '{}', goal_points = 250, spins_bank = 0, carry_seconds = 0, level = 0, lifetime_minutes = 0,
  machine = '{"cabinet":"red","theme":"classic","lever":"red","lights":"gold","name":"Blake''s Jackpot"}'::jsonb
where id = 'blake';
delete from missions;
delete from kid_badges;
delete from bolt_ledger;
