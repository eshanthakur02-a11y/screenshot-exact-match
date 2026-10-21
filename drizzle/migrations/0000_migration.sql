create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  status text not null default 'active' check (status in ('active','on_hold','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  target_date date,
  status text not null default 'active' check (status in ('active','achieved','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  due_date timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10000),
  source text not null default 'manual' check (source in ('manual','ai_capture')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  week_start date not null,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['projects','goals','milestones','tasks','weekly_reviews','notifications'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
    execute format('create index on public.%I (user_id, created_at desc)', t);
  end loop;
end $$;
create index on public.tasks (user_id, status, due_date);
create index on public.milestones (goal_id);