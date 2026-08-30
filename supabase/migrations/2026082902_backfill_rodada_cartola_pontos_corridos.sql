-- Nas ligas de pontos corridos, a rodada da tabela sempre representa a mesma
-- rodada do Cartola. Preenche partidas criadas antes da coluna existir.
update public.partidas as partida
set rodada_cartola = partida.rodada
from public.campeonatos as campeonato
where campeonato.id = partida.campeonato_id
  and campeonato.tipo = 'pontos_corridos'
  and partida.rodada_cartola is null;
