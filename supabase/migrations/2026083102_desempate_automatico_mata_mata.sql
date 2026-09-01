-- Registra a rodada do Cartola que efetivamente decidiu um confronto empatado.
alter table public.partidas
  add column if not exists rodada_desempate integer;

alter table public.partidas
  drop constraint if exists partidas_rodada_desempate_valida;

alter table public.partidas
  add constraint partidas_rodada_desempate_valida
  check (rodada_desempate is null or rodada_desempate between 1 and 38);

comment on column public.partidas.rodada_desempate is
  'Rodada do Cartola usada pelo desempate automático do confronto.';

create index if not exists partidas_rodada_desempate_idx
  on public.partidas (campeonato_id, rodada_desempate)
  where rodada_desempate is not null;
