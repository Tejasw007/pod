-- PrintPod MVP Database Schema
-- Tables: profiles, pods, pod_sessions, print_orders

-- 1. Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Pods table
create table public.pods (
  id uuid primary key default gen_random_uuid(),
  pod_code text not null unique, -- e.g., 'POD-001'
  name text not null,            -- e.g., 'Library Block'
  location text not null,        -- e.g., 'Central Library'
  status text not null default 'READY' check (status in ('READY', 'BUSY', 'OFFLINE', 'MAINTENANCE')),
  created_at timestamptz not null default now()
);

alter table public.pods enable row level security;

-- Pods are publicly readable
create policy "Anyone can view pods"
  on public.pods for select
  to authenticated
  using (true);

-- Seed 5 pods
insert into public.pods (pod_code, name, location) values
  ('POD-001', 'Library Block', 'Central Library'),
  ('POD-002', 'Hostel Block', 'Hostel A'),
  ('POD-003', 'Canteen Block', 'Main Canteen'),
  ('POD-004', 'Academic Block', 'Dept. of CS'),
  ('POD-005', 'Admin Block', 'Admin Office');

-- 3. Pod Sessions table (for QR-based connections)
create table public.pod_sessions (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods(id) on delete cascade,
  token text not null unique,
  pickup_code text,              -- 5-digit fallback code
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pod_sessions enable row level security;

create policy "Authenticated users can view active sessions"
  on public.pod_sessions for select
  to authenticated
  using (is_active = true and expires_at > now());

-- Index for fast token lookup
create index idx_pod_sessions_token
  on public.pod_sessions (token)
  where is_active = true;

-- 4. Print Orders table
create table public.print_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- File info
  file_name text not null,
  file_drive_id text,            -- Google Drive file ID
  file_drive_link text,          -- Google Drive view link
  file_size_bytes bigint,
  page_count integer not null default 1,
  
  -- Print configuration
  copies integer not null default 1 check (copies >= 1 and copies <= 10),
  paper_size text not null default 'A4' check (paper_size in ('A4', 'A3', 'Letter')),
  color_mode text not null default 'bw' check (color_mode in ('bw', 'color')),
  print_side text not null default 'single' check (print_side in ('single', 'duplex')),
  
  -- Pricing
  total_price numeric(10,2) not null default 0,
  
  -- Pickup & Pod
  pickup_code text,              -- 5-digit code
  pod_id uuid references public.pods(id),
  
  -- Payment
  payment_id text,
  
  -- State machine
  status text not null default 'CREATED' check (
    status in (
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'READY_FOR_PRINT',
      'POD_CONNECTED',
      'AWAITING_CONFIRMATION',
      'PRINTING',
      'PRINTED',
      'PAYMENT_FAILED',
      'CANCELLED',
      'EXPIRED',
      'PRINT_FAILED'
    )
  ),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.print_orders enable row level security;

-- Students can only see their own orders
create policy "Users can view their own orders"
  on public.print_orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Students can create orders
create policy "Users can create their own orders"
  on public.print_orders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Students can update their own orders (limited state transitions)
create policy "Users can update their own orders"
  on public.print_orders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Indexes
create index idx_print_orders_user_status
  on public.print_orders (user_id, status);

create index idx_print_orders_pickup_code
  on public.print_orders (pickup_code)
  where status = 'READY_FOR_PRINT';

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.print_orders
  for each row execute function public.update_updated_at();

-- Enable realtime for print_orders (for live status updates)
alter publication supabase_realtime add table public.print_orders;
