-- Round two: fast book search with a permanent resolved-book cache, format-aware word counts,
-- a quiz prep queue, API usage tracking, and the family code that gates the app.

alter table books
  add column if not exists format text,
  add column if not exists page_count int,
  add column if not exists year int,
  add column if not exists cover_url text,
  add column if not exists level_source text,
  add column if not exists word_count_source text,
  add column if not exists resolved_model text,
  add column if not exists resolved_at timestamptz;

create table if not exists search_cache (
  q text primary key,
  provider text not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists prep_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  book_id uuid references books(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','generating','ready','failed')),
  source text not null default 'grownup',
  error text,
  tries int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prep_queue_status_idx on prep_queue (status, created_at);

create table if not exists warmed_series (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists api_usage (
  id bigserial primary key,
  model text not null,
  purpose text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  searches int not null default 0,
  cost_usd numeric(10,5) not null default 0,
  ms int,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['search_cache','prep_queue','warmed_series','settings','api_usage']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;

-- Family code: an unguessable segment that every device learns once from the shareable link.
insert into settings (key, value)
values ('family_code', upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
on conflict (key) do nothing;
insert into settings (key, value) values ('books_provider', 'openlibrary') on conflict (key) do nothing;
