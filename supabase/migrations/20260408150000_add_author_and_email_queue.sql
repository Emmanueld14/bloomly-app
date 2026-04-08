-- Add author attribution and newsletter queue metadata for automated publishing flow.

alter table if exists public.posts
  add column if not exists author text;

alter table if exists public.email_logs
  add column if not exists attempts integer not null default 1;

alter table if exists public.email_logs
  add column if not exists error_message text;

alter table if exists public.email_logs
  add column if not exists retry_at timestamptz;

create index if not exists email_logs_status_retry_idx
  on public.email_logs (status, retry_at);
