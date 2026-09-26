-- OWNER: P1. Run in Supabase SQL editor.
create table if not exists mandates (
  id text primary key,
  owner text not null,
  weekly_budget numeric not null,
  per_order_cap numeric not null,
  ask_above numeric not null,
  allowed_categories text[] not null,
  allowed_vendors text[],
  max_qty_per_item int not null default 10,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  mandate_id text references mandates(id),
  cart jsonb not null,
  total numeric not null,
  decision text not null check (decision in ('APPROVE','ASK_HUMAN','BLOCK')),
  reasons text[] not null,
  order_id text,
  created_at timestamptz default now()
);

insert into mandates (id, owner, weekly_budget, per_order_cap, ask_above, allowed_categories, max_qty_per_item, expires_at)
values ('demo', 'Sara — Hackney Vintage', 500, 300, 200, '{denim,outerwear}', 10, '2026-12-31T23:59:59Z')
on conflict (id) do nothing;
