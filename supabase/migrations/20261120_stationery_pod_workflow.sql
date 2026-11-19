-- Stationery orders now follow the same lifecycle as print orders:
--   PAYMENT_PENDING -> READY_FOR_PICKUP -> POD_CONNECTED -> DISPENSING -> PICKED_UP
-- (CREATED / PAID are kept so existing rows stay valid.)

alter table public.stationery_orders
  drop constraint if exists stationery_orders_status_check;

alter table public.stationery_orders
  add constraint stationery_orders_status_check check (
    status in (
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'READY_FOR_PICKUP',
      'POD_CONNECTED',
      'DISPENSING',
      'PICKED_UP',
      'CANCELLED'
    )
  );

alter table public.stationery_orders
  alter column status set default 'PAYMENT_PENDING';

-- Pickup-code lookups (kiosk) cover every active state
drop index if exists public.idx_stationery_orders_pickup_code;
create index idx_stationery_orders_pickup_code
  on public.stationery_orders (pickup_code)
  where status in ('READY_FOR_PICKUP', 'POD_CONNECTED', 'DISPENSING');

-- Student phones listen for pod-driven status changes
alter table public.stationery_orders replica identity full;
