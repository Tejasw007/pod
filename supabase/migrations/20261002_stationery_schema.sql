-- PrintPod Stationery Store Schema
-- Tables: stationery_products, stationery_orders, stationery_order_items

-- 1. Stationery Products (catalog)
create table public.stationery_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (category in ('paper', 'notebooks', 'writing', 'essentials', 'files_folders')),
  price numeric(10,2) not null check (price > 0),
  image_url text,
  in_stock boolean not null default true,
  stock_qty integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stationery_products enable row level security;

-- Products are publicly readable by authenticated users
create policy "Anyone can view products"
  on public.stationery_products for select
  to authenticated
  using (true);

-- 2. Stationery Orders
create table public.stationery_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'CREATED' check (
    status in ('CREATED', 'PAID', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED')
  ),
  total_price numeric(10,2) not null default 0,
  pickup_code text,
  pod_id uuid references public.pods(id),
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stationery_orders enable row level security;

create policy "Users can view their own stationery orders"
  on public.stationery_orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own stationery orders"
  on public.stationery_orders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own stationery orders"
  on public.stationery_orders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Indexes
create index idx_stationery_orders_user_status
  on public.stationery_orders (user_id, status);

create index idx_stationery_orders_pickup_code
  on public.stationery_orders (pickup_code)
  where status in ('PAID', 'READY_FOR_PICKUP');

-- Updated_at trigger (reuses existing function)
create trigger set_stationery_orders_updated_at
  before update on public.stationery_orders
  for each row execute function public.update_updated_at();

-- 3. Stationery Order Items (line items)
create table public.stationery_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.stationery_orders(id) on delete cascade,
  product_id uuid not null references public.stationery_products(id),
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

alter table public.stationery_order_items enable row level security;

-- Users can view items belonging to their orders
create policy "Users can view their own order items"
  on public.stationery_order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.stationery_orders
      where id = order_id and user_id = (select auth.uid())
    )
  );

create policy "Users can create order items for their orders"
  on public.stationery_order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.stationery_orders
      where id = order_id and user_id = (select auth.uid())
    )
  );

-- Enable realtime for stationery_orders
alter publication supabase_realtime add table public.stationery_orders;

-- 4. Seed stationery products (comprehensive campus inventory)
insert into public.stationery_products (name, description, category, price, in_stock, stock_qty) values

  -- ═══════════════════════════════════════
  -- PAPER
  -- ═══════════════════════════════════════
  ('A4 Sheets (10 pcs)', 'Plain white 75 GSM copier paper', 'paper', 5.00, true, 500),
  ('A4 Sheets (25 pcs)', 'Plain white 75 GSM — value pack', 'paper', 10.00, true, 300),
  ('A4 Sheets (50 pcs)', 'Plain white 75 GSM — half ream', 'paper', 18.00, true, 200),
  ('A4 Sheets (100 pcs)', 'Plain white 75 GSM — full ream', 'paper', 35.00, true, 100),
  ('A3 Sheets (5 pcs)', 'Large-format white sheets', 'paper', 15.00, true, 100),
  ('A3 Sheets (10 pcs)', 'Large-format white sheets — pack', 'paper', 28.00, true, 60),
  ('Ruled Sheets (25 pcs)', 'Single-ruled A4 sheets', 'paper', 12.00, true, 200),
  ('Ruled Sheets (50 pcs)', 'Single-ruled A4 — bulk', 'paper', 22.00, true, 120),
  ('Graph Paper (10 pcs)', 'A4 graph paper — 1mm grid', 'paper', 10.00, true, 150),
  ('Graph Paper (25 pcs)', 'A4 graph paper — bulk pack', 'paper', 22.00, true, 80),
  ('Tracing Paper (5 pcs)', 'Translucent A4 tracing sheets', 'paper', 15.00, true, 80),
  ('Drawing Sheet (A3)', 'Thick cartridge paper for sketches', 'paper', 8.00, true, 200),
  ('Drawing Sheet (A2)', 'Large cartridge paper for drawing', 'paper', 15.00, true, 80),
  ('Chart Paper — White', 'Full-size white chart paper', 'paper', 10.00, true, 100),
  ('Chart Paper — Colored', 'Assorted color chart paper (1 pc)', 'paper', 12.00, true, 100),
  ('Butter Paper (10 pcs)', 'Semi-transparent wrapping sheets', 'paper', 10.00, true, 60),
  ('Carbon Paper (5 pcs)', 'Blue carbon paper — A4', 'paper', 15.00, true, 40),
  ('Answer Booklet (16 pg)', 'Exam-style answer sheet booklet', 'paper', 5.00, true, 300),
  ('Supplementary Sheet (8 pg)', 'Extra answer sheet booklet', 'paper', 3.00, true, 400),
  ('Sticky Notes (100 pcs)', '3×3 inch yellow sticky notes', 'paper', 25.00, true, 150),
  ('Sticky Notes — Neon Pack', '5-color neon sticky notes — 250 pcs', 'paper', 50.00, true, 60),
  ('Index Cards (50 pcs)', '3×5 inch lined index cards', 'paper', 20.00, true, 80),
  ('Brown Paper (Sheet)', 'Kraft brown wrapping paper', 'paper', 8.00, true, 100),

  -- ═══════════════════════════════════════
  -- NOTEBOOKS
  -- ═══════════════════════════════════════
  ('Record Notebook (200 pg)', 'Hard-bound record book for practicals', 'notebooks', 80.00, true, 50),
  ('Record Notebook (100 pg)', 'Soft-bound record book', 'notebooks', 50.00, true, 80),
  ('Long Notebook (200 pg)', 'Standard ruled long notebook', 'notebooks', 45.00, true, 100),
  ('Long Notebook (100 pg)', 'Standard ruled long notebook', 'notebooks', 30.00, true, 120),
  ('Lab Manual', 'Pre-formatted lab observation book', 'notebooks', 60.00, true, 40),
  ('Lab File (Practical)', 'Practical lab file with cover', 'notebooks', 35.00, true, 60),
  ('Rough Notebook (80 pg)', 'Unruled rough notebook', 'notebooks', 20.00, true, 120),
  ('Rough Notebook (160 pg)', 'Unruled rough notebook — thick', 'notebooks', 35.00, true, 60),
  ('Spiral Notebook (A4)', 'Wiro-bound ruled — 200 pages', 'notebooks', 60.00, true, 50),
  ('Spiral Notebook (A5)', 'Wiro-bound ruled — 160 pages', 'notebooks', 40.00, true, 70),
  ('Drawing Book (A4)', 'Blank pages for sketching — 36 pg', 'notebooks', 30.00, true, 60),
  ('Drawing Book (A3)', 'Large sketching book — 24 pg', 'notebooks', 50.00, true, 40),
  ('Project File', 'Interleaf project file with cover', 'notebooks', 40.00, true, 60),
  ('Assignment Notebook', 'Ruled assignment submission book', 'notebooks', 25.00, true, 100),
  ('Graph Notebook', 'Graph-ruled notebook — 80 pages', 'notebooks', 35.00, true, 50),
  ('Pocket Diary', 'Small pocket-size notebook — 100 pg', 'notebooks', 20.00, true, 80),
  ('Attendance Register', 'Large ruled register — 300 pg', 'notebooks', 120.00, true, 20),

  -- ═══════════════════════════════════════
  -- WRITING INSTRUMENTS
  -- ═══════════════════════════════════════
  ('Blue Pen (Cello Gripper)', 'Cello Gripper ballpoint — blue', 'writing', 10.00, true, 300),
  ('Blue Pen (Reynolds)', 'Reynolds 045 fine — blue', 'writing', 8.00, true, 300),
  ('Black Pen', 'Ballpoint pen — black ink', 'writing', 10.00, true, 200),
  ('Red Pen', 'Ballpoint pen — red ink', 'writing', 10.00, true, 150),
  ('Green Pen', 'Ballpoint pen — green ink', 'writing', 10.00, true, 100),
  ('Gel Pen — Blue', 'Smooth gel ink pen — blue', 'writing', 15.00, true, 150),
  ('Gel Pen — Black', 'Smooth gel ink pen — black', 'writing', 15.00, true, 150),
  ('Gel Pen — Red', 'Smooth gel ink pen — red', 'writing', 15.00, true, 100),
  ('Pen Set (5 pcs)', 'Assorted ballpoint pens — 5 colors', 'writing', 40.00, true, 60),
  ('Pencil — HB (Apsara)', 'Apsara HB writing pencil', 'writing', 5.00, true, 300),
  ('Pencil — 2B', 'Soft 2B pencil for drawing', 'writing', 8.00, true, 150),
  ('Pencil — Pack of 10', 'Apsara HB pencils — 10 pack', 'writing', 40.00, true, 80),
  ('Mechanical Pencil (0.5mm)', 'Auto pencil with lead', 'writing', 20.00, true, 100),
  ('Mechanical Pencil (0.7mm)', 'Auto pencil with lead', 'writing', 20.00, true, 100),
  ('Pencil Lead (0.5mm)', 'Refill leads — 20 pcs', 'writing', 10.00, true, 120),
  ('Pencil Lead (0.7mm)', 'Refill leads — 20 pcs', 'writing', 10.00, true, 120),
  ('Eraser (Dust-Free)', 'Non-dust white eraser', 'writing', 5.00, true, 200),
  ('Eraser (Large)', 'Jumbo white eraser', 'writing', 10.00, true, 100),
  ('Sharpener', 'Single-hole metal sharpener', 'writing', 5.00, true, 200),
  ('Sharpener (Double)', 'Two-hole sharpener with container', 'writing', 15.00, true, 80),
  ('Highlighter — Yellow', 'Fluorescent highlighter — yellow', 'writing', 20.00, true, 100),
  ('Highlighter — Pink', 'Fluorescent highlighter — pink', 'writing', 20.00, true, 80),
  ('Highlighter — Green', 'Fluorescent highlighter — green', 'writing', 20.00, true, 80),
  ('Highlighter — Orange', 'Fluorescent highlighter — orange', 'writing', 20.00, true, 80),
  ('Highlighter — Blue', 'Fluorescent highlighter — blue', 'writing', 20.00, true, 80),
  ('Highlighter Set (5 pcs)', 'Assorted neon highlighters', 'writing', 80.00, true, 40),
  ('Marker — Black (Permanent)', 'Waterproof permanent marker — black', 'writing', 25.00, true, 80),
  ('Marker — Blue (Permanent)', 'Waterproof permanent marker — blue', 'writing', 25.00, true, 60),
  ('Marker — Red (Permanent)', 'Waterproof permanent marker — red', 'writing', 25.00, true, 60),
  ('Whiteboard Marker — Black', 'Dry-erase marker — black', 'writing', 30.00, true, 60),
  ('Whiteboard Marker — Blue', 'Dry-erase marker — blue', 'writing', 30.00, true, 60),
  ('Whiteboard Marker — Red', 'Dry-erase marker — red', 'writing', 30.00, true, 40),
  ('Sketch Pen Set (12 pcs)', 'Fine-tip color sketch pens', 'writing', 40.00, true, 50),
  ('Sketch Pen Set (24 pcs)', 'Fine-tip color sketch pens — large', 'writing', 70.00, true, 30),
  ('Color Pencils (12 pcs)', 'Faber-Castell colored pencils', 'writing', 50.00, true, 50),
  ('Color Pencils (24 pcs)', 'Faber-Castell colored pencils — large', 'writing', 90.00, true, 30),
  ('Crayons (12 pcs)', 'Wax crayons — assorted colors', 'writing', 30.00, true, 40),
  ('Oil Pastels (12 pcs)', 'Oil pastels — assorted colors', 'writing', 50.00, true, 30),
  ('Oil Pastels (25 pcs)', 'Oil pastels — large set', 'writing', 90.00, true, 20),
  ('Whitener Pen', 'Correction fluid pen — white', 'writing', 15.00, true, 100),
  ('Correction Tape', 'Dry correction tape — 5mm', 'writing', 20.00, true, 80),
  ('Ink Pen (Fountain)', 'Classic fountain pen — blue', 'writing', 30.00, true, 40),
  ('Ink Bottle — Blue (30ml)', 'Camlin/Parker blue ink', 'writing', 20.00, true, 50),
  ('Ink Cartridges (Pack of 5)', 'Fountain pen ink cartridges — blue', 'writing', 25.00, true, 40),

  -- ═══════════════════════════════════════
  -- ESSENTIALS & TOOLS
  -- ═══════════════════════════════════════
  ('Stapler (Small)', 'No.10 mini stapler', 'essentials', 40.00, true, 40),
  ('Stapler Pins No.10 (Box)', 'No.10 stapler pins — 1000 pcs', 'essentials', 15.00, true, 80),
  ('Stapler Pins No.24 (Box)', 'Heavy-duty pins — 1000 pcs', 'essentials', 20.00, true, 40),
  ('Staple Remover', 'Claw-type staple remover', 'essentials', 20.00, true, 40),
  ('Glue Stick (8g)', 'Non-toxic glue stick — small', 'essentials', 15.00, true, 100),
  ('Glue Stick (15g)', 'Non-toxic glue stick — medium', 'essentials', 25.00, true, 60),
  ('Fevicol (50g)', 'White adhesive — small bottle', 'essentials', 25.00, true, 60),
  ('Fevikwik (1g)', 'Instant super glue — single use', 'essentials', 5.00, true, 200),
  ('Transparent Tape (1 inch)', 'BOPP tape — 1 inch × 30m', 'essentials', 20.00, true, 60),
  ('Transparent Tape (2 inch)', 'BOPP tape — 2 inch × 30m', 'essentials', 35.00, true, 40),
  ('Masking Tape (1 inch)', 'Paper masking tape — 1 inch', 'essentials', 30.00, true, 40),
  ('Double-Sided Tape', 'Strong adhesive — 1 inch × 5m', 'essentials', 30.00, true, 30),
  ('Cello Tape Dispenser', 'Tape dispenser with cutter', 'essentials', 40.00, true, 20),
  ('Paper Clips (Box)', 'GI paper clips — 100 pcs', 'essentials', 10.00, true, 100),
  ('Binder Clips (Small, 12 pcs)', '15mm binder clips', 'essentials', 15.00, true, 80),
  ('Binder Clips (Medium, 12 pcs)', '25mm binder clips', 'essentials', 25.00, true, 60),
  ('Binder Clips (Large, 6 pcs)', '41mm binder clips', 'essentials', 25.00, true, 40),
  ('Rubber Bands (Pack)', 'Assorted rubber bands — 100g', 'essentials', 10.00, true, 60),
  ('Scissors (7 inch)', 'Stainless steel office scissors', 'essentials', 30.00, true, 40),
  ('Paper Cutter / Blade', 'Retractable utility knife', 'essentials', 20.00, true, 40),
  ('Scale / Ruler (15 cm)', 'Transparent plastic ruler', 'essentials', 10.00, true, 150),
  ('Scale / Ruler (30 cm)', 'Transparent plastic ruler — long', 'essentials', 15.00, true, 100),
  ('Steel Scale (30 cm)', 'Stainless steel ruler', 'essentials', 25.00, true, 50),
  ('Set Square (2 pcs)', '45° and 60° set squares', 'essentials', 25.00, true, 40),
  ('Protractor', '180° transparent protractor', 'essentials', 10.00, true, 80),
  ('Compass (Geometry)', 'Metal geometry compass', 'essentials', 20.00, true, 60),
  ('Geometry Box', 'Complete set — compass, divider, set squares, protractor, scale', 'essentials', 80.00, true, 30),
  ('Calculator (Scientific)', 'Casio FX-991 style scientific calculator', 'essentials', 350.00, true, 20),
  ('Calculator (Basic)', '12-digit basic calculator', 'essentials', 120.00, true, 30),
  ('Paper Punch (2-Hole)', 'Standard 2-hole paper punch', 'essentials', 60.00, true, 20),
  ('Push Pins / Thumb Tacks', 'Colored push pins — 50 pcs', 'essentials', 15.00, true, 60),
  ('Drawing Pins (Box)', 'Brass drawing pins — 100 pcs', 'essentials', 10.00, true, 50),
  ('Pen Stand / Holder', 'Desk pen organizer', 'essentials', 40.00, true, 20),
  ('Tag / Name Label (10 pcs)', 'Self-adhesive labels for books', 'essentials', 10.00, true, 80),
  ('Lanyard / ID Card Holder', 'Neck strap with plastic holder', 'essentials', 20.00, true, 60),
  ('Exam Pad / Writing Board', 'Clip-board exam writing pad — A4', 'essentials', 50.00, true, 40),

  -- ═══════════════════════════════════════
  -- FILES & FOLDERS
  -- ═══════════════════════════════════════
  ('Clear Folder (A4)', 'Transparent L-folder — A4', 'files_folders', 10.00, true, 150),
  ('Clear Folder (A4, 10 pcs)', 'L-folder bulk pack', 'files_folders', 80.00, true, 40),
  ('Spring File', 'PP spring file with metal clip', 'files_folders', 25.00, true, 80),
  ('Box File', 'Cardboard lever-arch box file', 'files_folders', 60.00, true, 30),
  ('Ring Binder (2-Ring)', 'PP ring binder — A4', 'files_folders', 50.00, true, 30),
  ('Ring Binder (3-Ring)', 'PP ring binder — A4 wide', 'files_folders', 60.00, true, 20),
  ('Report File', 'Plastic cover clip report file', 'files_folders', 15.00, true, 80),
  ('Stick File', 'Paper stick file — simple', 'files_folders', 10.00, true, 100),
  ('Envelope — A4 (Brown)', 'Brown kraft envelope — A4 size', 'files_folders', 5.00, true, 200),
  ('Envelope — Legal (Brown)', 'Brown kraft envelope — legal', 'files_folders', 7.00, true, 150),
  ('Envelope — White (A4)', 'White business envelope — A4', 'files_folders', 8.00, true, 100),
  ('Envelope — Small', 'Standard letter envelope', 'files_folders', 3.00, true, 300),
  ('Certificate Holder', 'Transparent certificate sleeve — A4', 'files_folders', 10.00, true, 100),
  ('Display Book (20 pockets)', 'Clear pocket presentation book', 'files_folders', 50.00, true, 30),
  ('Display Book (40 pockets)', 'Clear pocket presentation book — large', 'files_folders', 80.00, true, 20),
  ('Document Bag (Zip)', 'A4 zip document pouch', 'files_folders', 30.00, true, 50),
  ('Document Bag (Button)', 'A4 button-snap document pouch', 'files_folders', 20.00, true, 60),
  ('Expanding File (13 Pockets)', 'Accordion-style organizer', 'files_folders', 80.00, true, 20),
  ('File Separator Tabs (5 pcs)', 'Colored divider tabs — A4', 'files_folders', 15.00, true, 60),
  ('Plastic Cover (A4)', 'Transparent plastic sheet cover', 'files_folders', 5.00, true, 200),
  ('Binding Strip (10 pcs)', 'Plastic binding combs', 'files_folders', 20.00, true, 40);
