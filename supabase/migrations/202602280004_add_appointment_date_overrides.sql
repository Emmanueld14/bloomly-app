create table if not exists public.appointment_date_overrides (
  date date primary key,
  time_slots text[] not null default '{}',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_appointment_date_overrides_updated_at on public.appointment_date_overrides;
create trigger trg_appointment_date_overrides_updated_at
before update on public.appointment_date_overrides
for each row
execute function public.set_updated_at();

create index if not exists appointment_date_overrides_date_idx
  on public.appointment_date_overrides (date);
