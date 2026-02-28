create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.appointment_bookings(id) on delete cascade,
  provider text not null check (provider in ('mpesa', 'airtel', 'paypal')),
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending',
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_attempts_booking_id_idx
  on public.payment_attempts (booking_id);

create index if not exists payment_attempts_provider_status_idx
  on public.payment_attempts (provider, status);

drop trigger if exists trg_payment_attempts_updated_at on public.payment_attempts;
create trigger trg_payment_attempts_updated_at
before update on public.payment_attempts
for each row
execute function public.set_updated_at();

alter table public.payment_attempts enable row level security;
