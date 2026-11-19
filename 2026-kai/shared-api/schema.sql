create table public.kai_schedule_state (
  id text primary key check (id = '2026-kai'),
  revision integer not null check (revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  check ((document->>'revision')::integer = revision)
);
alter table public.kai_schedule_state enable row level security;
revoke all on public.kai_schedule_state from public, anon, authenticated;
grant select, insert, update on public.kai_schedule_state to service_role;

create table public.kai_schedule_versions (
  revision integer primary key,
  document jsonb not null,
  saved_at timestamptz not null default now()
);
alter table public.kai_schedule_versions enable row level security;
create policy kai_state_no_direct_client_access on public.kai_schedule_state
for all to anon, authenticated using (false) with check (false);
create policy kai_versions_no_direct_client_access on public.kai_schedule_versions
for all to anon, authenticated using (false) with check (false);
revoke all on public.kai_schedule_versions from public, anon, authenticated;
grant select, insert on public.kai_schedule_versions to service_role;

create function public.kai_schedule_keep_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.kai_schedule_versions(revision, document)
  values (new.revision, new.document);
  return new;
end;
$$;
revoke all on function public.kai_schedule_keep_version() from public, anon, authenticated;
grant execute on function public.kai_schedule_keep_version() to service_role;
create trigger kai_schedule_keep_version after insert or update on public.kai_schedule_state
for each row execute function public.kai_schedule_keep_version();
