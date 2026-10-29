-- Rode este arquivo uma vez no Supabase: menu "SQL Editor" > "New query" > colar > "Run".

create table if not exists artesas (
  id uuid primary key,
  nome text not null,
  atelie text not null default '',
  whatsapp text not null default '',
  token text not null unique,
  status text not null default 'nao_comecou'
    check (status in ('nao_comecou', 'enviando', 'terminou', 'em_producao', 'entregue')),
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  terminou_em timestamptz
);

-- Ninguém acessa a tabela direto pelo navegador: só o servidor do sistema, com a chave secreta.
alter table artesas enable row level security;

-- Pasta privada para as fotos.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;
