-- SystemMatch schema
-- Run this in Supabase SQL Editor

create table if not exists kandidater (
  id uuid primary key default gen_random_uuid(),
  namn text not null,
  bransch text not null default '',
  mer_bransch text not null default '',
  nystartsjobb boolean not null default false,
  loneansprak text not null default '',
  korkort boolean not null default false,
  introduktionsjobb boolean not null default false,
  slutdatum text not null default '',
  cv1 text not null default '',
  cv2 text not null default '',
  cv3 text not null default '',
  stads_flag boolean not null default false,
  restaurang_flag boolean not null default false,
  keywords text[] not null default '{}',
  aktiv boolean not null default true,
  excel_rad integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rekryterare (
  id uuid primary key default gen_random_uuid(),
  namn text not null,
  slug text not null unique
);

create table if not exists jobb (
  id uuid primary key default gen_random_uuid(),
  rekryterare_id uuid not null references rekryterare(id) on delete cascade,
  tjänst text not null,
  arbetsgivare text not null default '',
  plats text not null default '',
  sysselsattningsgrad text not null default '',
  loneniva text not null default '',
  krav text not null default '',
  meriter text not null default '',
  presenterad text not null default '',
  excel_rad integer,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  kandidat_id uuid references kandidater(id) on delete set null,
  kandidat_namn text not null,
  jobb_id uuid references jobb(id) on delete set null,
  jobb_titel text not null,
  typ text not null check (typ in ('vinkel', 'prioritet', 'resultat')),
  kommentar text not null,
  resultat text check (resultat in ('anställd', 'ej_aktuell', 'pågående')),
  created_at timestamptz not null default now()
);

-- Seed recruiters
insert into rekryterare (namn, slug) values
  ('Nikola', 'nikola'),
  ('Rekryterare 2', '2'),
  ('Rekryterare 3', '3'),
  ('Rekryterare 4', '4')
on conflict (slug) do nothing;
