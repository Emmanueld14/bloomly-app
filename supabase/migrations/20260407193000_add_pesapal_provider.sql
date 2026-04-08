alter table public.payment_attempts
  drop constraint if exists payment_attempts_provider_check;

alter table public.payment_attempts
  add constraint payment_attempts_provider_check
  check (provider in ('mpesa', 'airtel', 'paypal', 'pesapal'));
