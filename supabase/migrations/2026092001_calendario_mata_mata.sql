-- Calendário por fase (chave = rodada interna da ida; valores = rodadas do Cartola).
alter table public.campeonatos
  add column if not exists calendario_mata_mata jsonb not null default '{}'::jsonb;

comment on column public.campeonatos.calendario_mata_mata is
  'Rodadas de ida, volta e desempate configuradas pelo administrador para cada fase eliminatória.';
