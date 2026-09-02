create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  age integer not null check (age >= 18 and age <= 100),
  relationship_status text not null default 'Single',
  looking_for text,
  bio text,
  whatsapp_number text not null,
  image_url_1 text,
  image_url_2 text,
  has_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_ref text not null unique,
  flw_ref text,
  amount numeric(12,2) not null default 1500,
  status text not null default 'successful',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.payments enable row level security;

create table if not exists public.payment_claims (
  transaction_ref text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  flw_ref text not null,
  amount numeric(12,2) not null default 1500,
  status text not null default 'verified',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.payment_claims enable row level security;

alter table public.payments add column if not exists flw_ref text;

-- Confirm a payment only for the currently authenticated member. The Flutterwave
-- verification endpoint must run first; this RPC only performs the authenticated
-- database write that is blocked by the normal client RLS policies.
create or replace function public.confirm_user_payment(tx_ref text, flw_ref_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  member_id uuid := auth.uid();
begin
  if member_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if tx_ref is null or btrim(tx_ref) = '' then
    raise exception 'Transaction reference is required' using errcode = '22023';
  end if;
  if flw_ref_id is null or btrim(flw_ref_id) = '' then
    raise exception 'Flutterwave reference is required' using errcode = '22023';
  end if;
  if exists (select 1 from public.payment_claims c where c.transaction_ref = tx_ref and c.user_id <> member_id) then
    raise exception 'Transaction reference belongs to another member' using errcode = '23505';
  end if;
  if not exists (
    select 1
    from public.payment_claims c
    where c.transaction_ref = tx_ref
      and c.user_id = member_id
      and c.flw_ref = flw_ref_id
      and c.amount >= 1500
      and c.status = 'verified'
      and c.expires_at > now()
  ) then
    raise exception 'Payment verification claim is missing or expired' using errcode = '42501';
  end if;

  insert into public.payments (user_id, transaction_ref, flw_ref, amount, status)
  values (member_id, tx_ref, flw_ref_id, 1500, 'successful')
  on conflict (transaction_ref) do update
    set flw_ref = excluded.flw_ref,
        amount = 1500,
        status = 'successful'
    where public.payments.user_id = member_id;

  update public.profiles
  set has_paid = true
  where id = member_id;
  if not found then
    raise exception 'Member profile not found' using errcode = 'P0002';
  end if;

  delete from public.payment_claims c where c.transaction_ref = tx_ref and c.user_id = member_id;
  return json_build_object('success', true, 'user_id', member_id, 'transaction_ref', tx_ref);
end;
$$;
revoke all on function public.confirm_user_payment(text, text) from public;
revoke all on function public.confirm_user_payment(text, text) from anon;
grant execute on function public.confirm_user_payment(text, text) to authenticated;

-- Remove any prior policies on these tables, including legacy names from earlier deployments.
-- This keeps the migration safe to re-run after policy changes.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'payments', 'payment_claims')
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end $$;

create or replace function public.can_update_profile(profile_id uuid, next_has_paid boolean)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() = profile_id
    and next_has_paid = coalesce((select p.has_paid from public.profiles p where p.id = profile_id), false);
$$;
revoke all on function public.can_update_profile(uuid, boolean) from public;
grant execute on function public.can_update_profile(uuid, boolean) to authenticated;

create policy "Members read their own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Members create their own profile" on public.profiles
  for insert with check (auth.uid() = id and has_paid = false);
create policy "Members update editable profile fields" on public.profiles
  for update using (auth.uid() = id)
  with check (public.can_update_profile(id, has_paid));
create policy "Members delete their own profile" on public.profiles
  for delete using (auth.uid() = id);
create policy "Members read their own payments" on public.payments
  for select using (auth.uid() = user_id);
-- Payment inserts and has_paid changes are server-authoritative after Flutterwave verification.
-- The service-role payment verifier bypasses RLS; browser clients receive no insert policy.

create or replace view public.public_profiles as
  select id, full_name, age, relationship_status, looking_for, bio, image_url_1, image_url_2, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create or replace function public.get_paid_profiles()
returns table (id uuid, full_name text, age integer, relationship_status text, looking_for text, bio text, whatsapp_number text, image_url_1 text, image_url_2 text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select p.id, p.full_name, p.age, p.relationship_status, p.looking_for, p.bio, p.whatsapp_number, p.image_url_1, p.image_url_2, p.created_at
  from public.profiles p
  where exists (select 1 from public.profiles me where me.id = auth.uid() and me.has_paid = true);
$$;

grant execute on function public.get_paid_profiles() to authenticated;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

create policy "Public can read profile images" on storage.objects
  for select using (bucket_id = 'profile-images');
create policy "Members upload profile images" on storage.objects
  for insert with check (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1]);
