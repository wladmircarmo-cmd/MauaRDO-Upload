-- Tabela: uploads
-- Salva metadados do upload no Supabase Storage

create extension if not exists "pgcrypto";

create table if not exists public.uploads (
  id uuid primary key,
  user_id uuid,
  user_email text,
  tarefa text not null,
  supabase_path text not null,
  description text,
  created_at timestamp with time zone not null default now()
);

create index if not exists uploads_user_id_idx on public.uploads(user_id);
create index if not exists uploads_created_at_idx on public.uploads(created_at desc);

-- (Opcional) RLS recomendado para leitura do próprio usuário
alter table public.uploads enable row level security;

create policy "uploads_select_own"
on public.uploads
for select
to authenticated
using (auth.uid() = user_id);

-- Inserts são feitos via service role no backend (API route)

