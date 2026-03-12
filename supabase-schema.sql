-- =============================================
-- DEVOSI F1 — Supabase Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teams / Écuries
create table teams (
  id serial primary key,
  name text not null,
  short_name text,
  points integer default 0,
  wins integer default 0,
  podiums integer default 0,
  poles integer default 0,
  color text default '#ffffff',
  base text,
  principal text,
  engine text,
  chassis text,
  founded integer,
  championships integer default 0,
  bio text,
  image_url text,
  created_at timestamptz default now()
);

-- Drivers / Pilotes
create table drivers (
  id serial primary key,
  name text not null,
  short_name text,
  number integer,
  team_id integer references teams(id),
  team text,
  nationality text,
  flag text,
  points integer default 0,
  wins integer default 0,
  podiums integer default 0,
  poles integer default 0,
  fastest_laps integer default 0,
  dob text,
  bio text,
  color text default '#ffffff',
  image_url text,
  races integer default 0,
  dnf integer default 0,
  avg_finish numeric(4,2) default 0,
  avg_start numeric(4,2) default 0,
  created_at timestamptz default now()
);

-- Races / Courses
create table races (
  id serial primary key,
  name text not null,
  circuit text,
  country text,
  flag text,
  date date not null,
  completed boolean default false,
  laps integer,
  distance text,
  results jsonb default '[]',
  created_at timestamptz default now()
);

-- News / Actualités
create table news (
  id serial primary key,
  title text not null,
  summary text,
  content text,
  date date not null,
  category text,
  read_time text,
  image_url text,
  featured boolean default false,
  created_at timestamptz default now()
);

-- Storage buckets for images
insert into storage.buckets (id, name, public) 
values 
  ('drivers', 'drivers', true),
  ('teams', 'teams', true),
  ('news', 'news', true),
  ('cars', 'cars', true);

-- RLS Policies (allow public read)
alter table teams enable row level security;
alter table drivers enable row level security;
alter table races enable row level security;
alter table news enable row level security;

create policy "Public read teams" on teams for select using (true);
create policy "Public read drivers" on drivers for select using (true);
create policy "Public read races" on races for select using (true);
create policy "Public read news" on news for select using (true);

-- Storage policies
create policy "Public read driver images"
on storage.objects for select
using (bucket_id = 'drivers');

create policy "Public read team images"
on storage.objects for select
using (bucket_id = 'teams');

create policy "Public read news images"
on storage.objects for select
using (bucket_id = 'news');

create policy "Public read car images"
on storage.objects for select
using (bucket_id = 'cars');
