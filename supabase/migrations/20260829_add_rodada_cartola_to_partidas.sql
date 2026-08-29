-- Vincula cada partida à rodada real usada nas consultas da API do Cartola.
-- O campo fica nulo até o administrador confirmar a atualização da rodada.
alter table public.partidas
  add column if not exists rodada_cartola integer;

alter table public.partidas
  drop constraint if exists partidas_rodada_cartola_positiva;

alter table public.partidas
  add constraint partidas_rodada_cartola_positiva
  check (rodada_cartola is null or rodada_cartola > 0);

comment on column public.partidas.rodada_cartola is
  'Rodada real do Cartola usada para escalações, pontuações e parciais ao vivo.';

create index if not exists partidas_campeonato_rodada_cartola_idx
  on public.partidas (campeonato_id, rodada_cartola);
