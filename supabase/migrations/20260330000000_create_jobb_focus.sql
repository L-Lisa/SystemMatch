-- Jobb Focus: saved AI-powered candidate queries
create table if not exists jobb_focus (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing recent searches
create index if not exists idx_jobb_focus_created_at on jobb_focus (created_at desc);
