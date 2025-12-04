'use server'

import { supabase } from "@/lib/supabase"

// ==============================================================================
// 1. FUNÇÕES BÁSICAS (CRUD E API)
// ==============================================================================

// Buscar time na API do Cartola
export async function buscarTimeCartola(termo: string) {
  const res = await fetch(`https://api.cartola.globo.com/times?q=${termo}`)
  const data = await res.json()
  return data
}

// Salvar time no banco
export async function salvarTime(time: any) {
  const { error } = await supabase.from('times').insert([{
    nome: time.nome,
    nome_cartola: time.nome_cartola,
    escudo: time.url_escudo_png,
    slug: time.slug,
    time_id_cartola: time.time_id
  }])

  if (error) return { success: false, msg: error.message }
  return { success: true, msg: 'Time salvo com sucesso!' }
}

// Criar Campeonato
export async function criarCampeonato(nome: string, ano: number, tipo: string) {
  const { error } = await supabase.from('campeonatos').insert([{ nome, ano, tipo, ativo: true }])
  if (error) return { success: false, msg: error.message }
  return { success: true, msg: 'Campeonato criado!' }
}

// Listar Campeonatos
export async function listarCampeonatos() {
  const { data } = await supabase.from('campeonatos').select('*').order('id', { ascending: false })
  return data || []
}

// Adicionar time na liga
export async function adicionarTimeAoCampeonato(campeonatoId: number, timeId: number) {
  const { error } = await supabase.from('classificacao').insert([{ campeonato_id: campeonatoId, time_id: timeId }])
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// Listar times da liga
export async function listarTimesDoCampeonato(campeonatoId: number) {
  const { data } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId)
  return data || []
}

// Listar todos os times cadastrados
export async function listarTodosTimes() {
  const { data } = await supabase.from('times').select('*').order('nome', { ascending: true })
  return data || []
}

// Listar partidas
export async function listarPartidas(campeonatoId: number) {
  const { data } = await supabase.from('partidas')
    .select(`*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)`)
    .eq('campeonato_id', campeonatoId)
    .order('rodada', { ascending: true })
    .order('id', { ascending: true })
  return data || []
}

// Remover time da liga
export async function removerTimeDaLiga(campeonatoId: number, timeId: number) {
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_casa', timeId)
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_visitante', timeId)
  const { error } = await supabase.from('classificacao').delete().eq('campeonato_id', campeonatoId).eq('time_id', timeId)
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// Remover time geral (do sistema)
export async function removerTime(timeIdCartola: number) {
  const { data: time } = await supabase.from('times').select('id').eq('time_id_cartola', timeIdCartola).single()
  if (!time) return { success: false, msg: "Time não encontrado." }
  await supabase.from('classificacao').delete().eq('time_id', time.id)
  await supabase.from('partidas').delete().eq('time_casa', time.id)
  await supabase.from('partidas').delete().eq('time_visitante', time.id)
  await supabase.from('times').delete().eq('id', time.id)
  return { success: true }
}

// Zerar jogos (Reset)
export async function zerarJogos(campeonatoId: number) {
  const { error } = await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId)
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// Listar IDs salvos
export async function listarIdsTimesSalvos() {
  const { data } = await supabase.from('times').select('time_id_cartola')
  return data?.map((t: any) => t.time_id_cartola) || []
}

// Atualizar Placar Manualmente
export async function atualizarPlacarManual(partidaId: number, casa: number, visitante: number) {
  const { data, error } = await supabase.from('partidas').update({
      placar_casa: casa, placar_visitante: visitante, status: 'finalizado'
    }).eq('id', partidaId).select('campeonato_id').single()
  
  if (error) return { success: false, msg: error.message }
  
  // Recalcula tabela se necessário (pontos corridos)
  await recalcularTabela(data.campeonato_id)
  return { success: true }
}

// ==============================================================================
// 2. FUNÇÕES PARA ÁREA PÚBLICA (TABELAS, RANKING, AO VIVO)
// ==============================================================================

// Buscar Tabela (Pontos Corridos)
export async function buscarTabela(campeonatoId: number) {
  const { data } = await supabase.from('classificacao').select('*, times(*)')
    .eq('campeonato_id', campeonatoId)
    .order('pts', { ascending: false })
    .order('v', { ascending: false })
    .order('sp', { ascending: false })
    .order('pp', { ascending: false })
  return data || []
}

// Recalcular Tabela (RPC do Banco)
export async function recalcularTabela(campeonatoId: number) {
  await supabase.rpc('calcular_classificacao', { liga_id: campeonatoId })
  return { success: true }
}

// Buscar Ranking Completo
export async function buscarRankingCompleto() {
  const { data: meusTimes } = await supabase.from('times').select('*')
  if (!meusTimes || meusTimes.length === 0) return []
  
  const promessas = meusTimes.map(async (time) => {
    try {
      const res = await fetch(`https://api.cartola.globo.com/time/id/${time.time_id_cartola}`, { next: { revalidate: 60 } })
      if (!res.ok) return null
      const dados = await res.json()
      return {
        pos: 0, time: dados.time.nome, cartoleiro: dados.time.nome_cartola,
        pontos: dados.pontos_campeonato || 0, escudo: dados.time.url_escudo_png
      }
    } catch { return null }
  })
  
  const resultados = await Promise.all(promessas)
  return resultados.filter(i => i !== null).sort((a:any, b:any) => b.pontos - a.pontos).map((i:any, idx) => ({ ...i, pos: idx + 1 }))
}

// Buscar Liga Oficial
export async function buscarLigaOficial() {
  const ranking = await buscarRankingCompleto();
  return ranking.slice(0, 5);
}

// Buscar Maiores Pontuadores
export async function buscarMaioresPontuadores() {
  const { data: partidas } = await supabase.from('partidas').select(`
      rodada, pontos_reais_casa, pontos_reais_visitante,
      casa:times!partidas_time_casa_fkey(nome, escudo), visitante:times!partidas_time_visitante_fkey(nome, escudo), liga:campeonatos(nome)
    `).eq('status', 'finalizado')
  
  if (!partidas) return []
  let lista: any[] = []
  partidas.forEach((j: any) => {
    if (j.pontos_reais_casa) lista.push({ time: j.casa.nome, escudo: j.casa.escudo, pontos: j.pontos_reais_casa, rodada: j.rodada, liga: j.liga?.nome })
    if (j.pontos_reais_visitante) lista.push({ time: j.visitante.nome, escudo: j.visitante.escudo, pontos: j.pontos_reais_visitante, rodada: j.rodada, liga: j.liga?.nome })
  })
  return lista.sort((a, b) => b.pontos - a.pontos).slice(0, 5)
}

// Buscar Parciais Ao Vivo
export async function buscarParciaisAoVivo(jogos: any[]) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' }
  let atletasPontuados: any = {}
  
  try {
    const res = await fetch('https://api.cartola.globo.com/atletas/pontuados', { headers, next: { revalidate: 0 } })
    if (res.ok) {
      const data = await res.json()
      atletasPontuados = data.atletas || {}
    }
  } catch (e) { console.error("Erro parciais:", e) }

  const jogosComParcial = await Promise.all(jogos.map(async (jogo) => {
    const calcularTime = async (timeId: number) => {
      try {
        const resTime = await fetch(`https://api.cartola.globo.com/time/id/${timeId}`, { headers, next: { revalidate: 0 } })
        if (!resTime.ok) return 0
        const dataTime = await resTime.json()
        let soma = 0
        if (dataTime.atletas) {
            dataTime.atletas.forEach((atleta: any) => {
                const pt = atletasPontuados[atleta.atleta_id]?.pontuacao || 0
                soma += (atleta.atleta_id === dataTime.capitao_id) ? pt * 1.5 : pt
            })
        }
        return Math.floor(soma)
      } catch { return 0 }
    }
    const [pc, pv] = await Promise.all([calcularTime(jogo.casa.time_id_cartola), calcularTime(jogo.visitante.time_id_cartola)])
    return { ...jogo, placar_casa: pc, placar_visitante: pv, is_parcial: true }
  }))
  return { success: true, jogos: jogosComParcial }
}

// Buscar Histórico Confronto Direto
export async function buscarHistoricoConfrontoDireto(campeonatoId: number, timeIds: number[]) {
  const { data: jogos } = await supabase.from('partidas')
    .select('time_casa, time_visitante, placar_casa, placar_visitante')
    .eq('campeonato_id', campeonatoId)
    .in('time_casa', timeIds)
    .in('time_visitante', timeIds)
    .not('placar_casa', 'is', null)
  return jogos || []
}

// ==============================================================================
// 3. LÓGICA DE MATA-MATA (OLÍMPICO + SEEDS + BYES)
// ==============================================================================

// ALGORITMO PARA ORDENAR BRACKET (1-16, 8-9, etc)
function getBracketOrder(numCompetidores: number) {
  let rounds = Math.log2(numCompetidores);
  let order = [1, 2];

  for (let i = 0; i < rounds - 1; i++) {
    let next = [];
    for (let j = 0; j < order.length; j++) {
      next.push(order[j]);
      next.push((Math.pow(2, i + 2) + 1) - order[j]);
    }
    order = next;
  }
  return order.map(n => n - 1);
}

// GERAÇÃO INTELIGENTE (ATUALIZADA PARA LÓGICA OLÍMPICA)
export async function gerarMataMataInteligente(campeonatoId: number, idsOrdenados: number[] = [], aleatorio: boolean = false) {
  const timesNoBanco = await listarTimesDoCampeonato(campeonatoId);
  if (timesNoBanco.length < 2) return { success: false, msg: "Mínimo de 2 times." };

  let rankingInicial: any[] = [];

  // 1. Definir o Ranking (Seeds)
  if (aleatorio) {
    rankingInicial = [...timesNoBanco].sort(() => Math.random() - 0.5);
  } 
  else if (idsOrdenados.length > 0) {
    rankingInicial = idsOrdenados
      .map(id => timesNoBanco.find(t => t.time_id === id))
      .filter(t => t !== undefined);
    
    const faltantes = timesNoBanco.filter(t => !idsOrdenados.includes(t.time_id));
    rankingInicial = [...rankingInicial, ...faltantes];
  } 
  else {
    rankingInicial = [...timesNoBanco];
  }

  const numTimes = rankingInicial.length;
  
  // 2. Calcular tamanho da chave (Potência de 2)
  let tamanhoChave = 2;
  while (tamanhoChave < numTimes) tamanhoChave *= 2;

  // 3. Preencher com "Byes" (Times fantasmas) até completar a chave
  const seedsCompletos = [...rankingInicial];
  while (seedsCompletos.length < tamanhoChave) {
    seedsCompletos.push(null); 
  }

  // 4. Ordenar no padrão Olímpico (1 vs 16, 2 vs 15...)
  const ordemConfrontos = getBracketOrder(tamanhoChave);
  const timesOrdenados = ordemConfrontos.map(i => seedsCompletos[i]);

  await zerarJogos(campeonatoId);
  const partidasParaSalvar = [];

  // 5. Criar os confrontos (Pares lado a lado)
  for (let i = 0; i < timesOrdenados.length; i += 2) {
    const timeA = timesOrdenados[i];
    const timeB = timesOrdenados[i+1];

    if (!timeA && !timeB) continue; 

    // Cenário 1: Time A existe, Time B é Bye (null) -> Time A avança direto
    if (timeA && !timeB) {
      partidasParaSalvar.push({
        campeonato_id: campeonatoId,
        rodada: 1,
        time_casa: timeA.time_id,
        time_visitante: null,
        placar_casa: 1, placar_visitante: 0, status: 'bye'
      });
    }
    // Cenário 2: Time A é Bye, Time B existe (Raro se ordenado certo)
    else if (!timeA && timeB) {
      partidasParaSalvar.push({
        campeonato_id: campeonatoId,
        rodada: 1,
        time_casa: timeB.time_id,
        time_visitante: null,
        placar_casa: 1, placar_visitante: 0, status: 'bye'
      });
    }
    // Cenário 3: Jogo Normal
    else if (timeA && timeB) {
      // Ida
      partidasParaSalvar.push({
        campeonato_id: campeonatoId, rodada: 1,
        time_casa: timeA.time_id, time_visitante: timeB.time_id, status: 'agendado'
      });
      // Volta
      partidasParaSalvar.push({
        campeonato_id: campeonatoId, rodada: 1,
        time_casa: timeB.time_id, time_visitante: timeA.time_id, status: 'agendado'
      });
    }
  }

  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };
  
  return { success: true, msg: `Chaveamento Olímpico gerado! (Chave de ${tamanhoChave})` };
}

// AVANÇAR FASE (COM SUPORTE A BYES)
export async function avancarFaseMataMata(campeonatoId: number, faseAtual: number) {
  const { data: jogos } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).eq('rodada', faseAtual).order('id', { ascending: true });
  if (!jogos || jogos.length === 0) return { success: false, msg: "Fase não encontrada." };

  const pendentes = jogos.filter((j:any) => j.status !== 'finalizado' && j.status !== 'bye');
  if (pendentes.length > 0) return { success: false, msg: "Jogos pendentes nesta fase." };

  const classificados: number[] = [];
  const confrontosProcessados = new Set(); 

  for (const jogo of jogos) {
    if (jogo.status === 'bye') {
      classificados.push(jogo.time_casa);
      continue;
    }
    const key = [jogo.time_casa, jogo.time_visitante].sort((a,b)=>a-b).join('-');
    if (confrontosProcessados.has(key)) continue; 
    confrontosProcessados.add(key);

    const volta = jogos.find((j:any) => j.id !== jogo.id && ((j.time_casa === jogo.time_visitante && j.time_visitante === jogo.time_casa) || (j.time_casa === jogo.time_casa && j.time_visitante === jogo.time_visitante)));
    if (!volta) return { success: false, msg: `Erro: Jogo ID ${jogo.id} sem volta.` };

    const golsTimeA = (jogo.placar_casa || 0) + (volta.placar_visitante || 0); 
    const golsTimeB = (jogo.placar_visitante || 0) + (volta.placar_casa || 0); 

    if (golsTimeA > golsTimeB) classificados.push(jogo.time_casa);
    else if (golsTimeB > golsTimeA) classificados.push(jogo.time_visitante);
    else classificados.push(jogo.time_casa); 
  }

  if (classificados.length < 2) return { success: false, msg: "Campeão definido!" };

  const novasPartidas = [];
  const proximaRodada = faseAtual + 1;

  for (let i = 0; i < classificados.length; i += 2) {
    const timeA = classificados[i];
    const timeB = classificados[i+1]; 
    if (!timeB) {
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else {
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
    }
  }

  const { error } = await supabase.from('partidas').insert(novasPartidas);
  if (error) return { success: false, msg: error.message };
  return { success: true, msg: `Fase ${proximaRodada} gerada!` };
}

// ATUALIZAR RODADA (COM AUTOMAÇÃO)
export async function atualizarRodadaMataMata(campeonatoId: number, fase: number, rodadaIda: number, rodadaVolta: number) {
  // ADICIONADO: .order('id', { ascending: true })
  const { data: partidas } = await supabase.from('partidas')
    .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId)
    .eq('rodada', fase)
    .neq('status', 'bye')
    .order('id', { ascending: true });

  if (!partidas) return { success: false, msg: "Sem jogos." };

  const headersGlobo = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' };
  const confrontos = new Map();
  partidas.forEach((p:any) => {
      const key = [p.time_casa, p.time_visitante].sort((a:any, b:any) => a - b).join('-');
      if (!confrontos.has(key)) confrontos.set(key, []);
      confrontos.get(key).push(p);
  });

  for (const [key, jogos] of confrontos) {
      const jogoIda = jogos[0]; const jogoVolta = jogos[1];
      if (jogoIda) await atualizarJogoIndividual(jogoIda, rodadaIda, headersGlobo);
      if (jogoVolta) await atualizarJogoIndividual(jogoVolta, rodadaVolta, headersGlobo);
  }

  const { data: pendentes } = await supabase.from('partidas').select('id').eq('campeonato_id', campeonatoId).eq('rodada', fase).neq('status', 'finalizado').neq('status', 'bye');
  let msgExtra = "";
  if (!pendentes || pendentes.length === 0) {
    const { data: prox } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).eq('rodada', fase + 1);
    if (!prox || prox.length === 0) {
        await avancarFaseMataMata(campeonatoId, fase);
        msgExtra = " E PRÓXIMA FASE GERADA! 🚀";
    }
  }
  return { success: true, msg: `Pontos atualizados!${msgExtra}` };
}

async function atualizarJogoIndividual(jogo: any, rodadaCartola: number, headers: any) {
    if (!rodadaCartola || rodadaCartola <= 0) return;
    try {
        const resCasa = await fetch(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`, { headers });
        const dadosCasa = await resCasa.json();
        const ptsCasa = dadosCasa.pontos || 0;
        const resVis = await fetch(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`, { headers });
        const dadosVis = await resVis.json();
        const ptsVis = dadosVis.pontos || 0;
        await supabase.from('partidas').update({
            pontos_reais_casa: ptsCasa, placar_casa: Math.floor(ptsCasa),
            pontos_reais_visitante: ptsVis, placar_visitante: Math.floor(ptsVis), status: 'finalizado'
        }).eq('id', jogo.id);
    } catch (e) { console.error("Erro ao atualizar jogo", e); }
}

// ==============================================================================
// 4. LÓGICA DE COPA (GRUPOS + MATA-MATA)
// ==============================================================================

// 1. SORTEIO DE GRUPOS
export async function gerarFaseGrupos(campeonatoId: number, numGrupos: number, potes: number[][]) {
  if (potes.length === 0 || potes[0].length === 0) return { success: false, msg: "Potes vazios." };
  
  await zerarJogos(campeonatoId);
  await supabase.from('classificacao').update({ grupo: null, fase_atual: 'fase_grupos' }).eq('campeonato_id', campeonatoId);

  const letrasGrupos = ['A','B','C','D','E','F','G','H'];
  const partidasParaSalvar = [];

  // Sorteio
  for (let i = 0; i < potes.length; i++) {
    const poteAtual = potes[i].sort(() => Math.random() - 0.5);
    for (let g = 0; g < numGrupos; g++) {
      const timeId = poteAtual[g];
      if (timeId) {
        await supabase.from('classificacao').update({ grupo: letrasGrupos[g] }).eq('campeonato_id', campeonatoId).eq('time_id', timeId);
      }
    }
  }

  // Gerar Jogos (Round Robin)
  const timesClassificados = await listarTimesDoCampeonato(campeonatoId);
  
  for (let g = 0; g < numGrupos; g++) {
    const grupoLetra = letrasGrupos[g];
    const timesDoGrupo = timesClassificados.filter((t:any) => t.grupo === grupoLetra);
    const idsNoGrupo = timesDoGrupo.map((t:any) => t.time_id);
    const numTimesGrupo = idsNoGrupo.length;

    if (numTimesGrupo < 2) continue;

    for (let i = 0; i < numTimesGrupo; i++) {
      for (let j = i + 1; j < numTimesGrupo; j++) {
        partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: idsNoGrupo[i], time_visitante: idsNoGrupo[j], status: 'agendado' });
        partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 2, time_casa: idsNoGrupo[j], time_visitante: idsNoGrupo[i], status: 'agendado' });
      }
    }
  }

  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };
  return { success: true, msg: "Grupos sorteados e jogos gerados!" };
}

// 2. BUSCAR TABELA POR GRUPO (Recuperada)
export async function buscarTabelaGrupos(campeonatoId: number) {
  const { data } = await supabase.from('classificacao').select('*, times(*)')
    .eq('campeonato_id', campeonatoId).not('grupo', 'is', null)
    .order('grupo', { ascending: true }).order('pts', { ascending: false }).order('v', { ascending: false }).order('sp', { ascending: false });

  const grupos: any = {};
  data?.forEach((time: any) => {
    if (!grupos[time.grupo]) grupos[time.grupo] = [];
    grupos[time.grupo].push(time);
  });
  return grupos;
}