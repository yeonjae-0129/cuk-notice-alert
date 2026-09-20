create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  keywords text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sent_notifications (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  article_id text not null,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, article_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.sent_notifications enable row level security;

comment on table public.push_subscriptions is 'Server-only browser push subscriptions and interest keywords';
comment on table public.sent_notifications is 'Deduplication log for delivered or baseline notices';
