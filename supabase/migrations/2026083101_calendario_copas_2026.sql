-- Vincula as fases das copas de 2026 às rodadas oficiais do Cartola.
-- O trigger também cobre partidas de fases futuras, criadas depois deste backfill.
create or replace function public.inferir_rodada_cartola_copas_2026()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  campeonato_nome text;
  campeonato_ano integer;
begin
  if new.rodada_cartola is not null or new.status = 'bye' then
    return new;
  end if;

  select nome, ano
    into campeonato_nome, campeonato_ano
  from public.campeonatos
  where id = new.campeonato_id;

  if campeonato_ano <> 2026 then
    return new;
  end if;

  if campeonato_nome ilike 'Copa Libertadores%' then
    new.rodada_cartola := case new.rodada
      when 1 then 14 when 2 then 16 when 3 then 18 when 4 then 20
      when 5 then 22 when 6 then 24 when 7 then 26 when 8 then 28
      when 9 then 30 when 10 then 32 when 11 then 34 when 12 then 36
      when 13 then 38 else null end;
  elsif campeonato_nome ilike 'Copa do Brasil%' then
    new.rodada_cartola := case new.rodada
      when 1 then 17 when 2 then 19 when 3 then 21 when 4 then 23
      when 5 then 25 when 6 then 27 when 7 then 29 when 8 then 31
      when 9 then 33 when 10 then 35 when 11 then 37 else null end;
  elsif campeonato_nome ilike 'Copa Sulamericana%' then
    new.rodada_cartola := case new.rodada
      when 1 then 26 when 2 then 28 when 3 then 30 when 4 then 32
      when 5 then 34 when 6 then 36 when 7 then 38 else null end;
  elsif campeonato_nome ilike 'Recopa%' then
    new.rodada_cartola := case new.rodada when 1 then 1 when 2 then 3 else null end;
  elsif campeonato_nome ilike 'Supercopa%' then
    new.rodada_cartola := 2;
  end if;

  return new;
end;
$$;

drop trigger if exists preencher_rodada_cartola_copas_2026 on public.partidas;
create trigger preencher_rodada_cartola_copas_2026
before insert or update of campeonato_id, rodada, status, rodada_cartola
on public.partidas
for each row
execute function public.inferir_rodada_cartola_copas_2026();

-- Dispara o vínculo para os jogos já existentes sem substituir valores salvos.
update public.partidas as partida
set rodada_cartola = null
from public.campeonatos as campeonato
where campeonato.id = partida.campeonato_id
  and campeonato.ano = 2026
  and partida.rodada_cartola is null
  and partida.status <> 'bye'
  and (
    campeonato.nome ilike 'Copa Libertadores%'
    or campeonato.nome ilike 'Copa do Brasil%'
    or campeonato.nome ilike 'Copa Sulamericana%'
    or campeonato.nome ilike 'Recopa%'
    or campeonato.nome ilike 'Supercopa%'
  );
