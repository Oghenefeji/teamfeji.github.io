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
  amount numeric(12,2) not null default 1500,
  status text not null default 'successful',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.payments enable row level security;

create policy "Members read their own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Members create their own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Members update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Members delete their own profile" on public.profiles
  for delete using (auth.uid() = id);
create policy "Members read their own payments" on public.payments
  for select using (auth.uid() = user_id);
create policy "Members record their own successful payment" on public.payments
  for insert with check (auth.uid() = user_id);

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
