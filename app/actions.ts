'use server'

import { supabase } from "@/lib/supabase"

// ==============================================================================
// 1. FUNÇÕES BÁSICAS (CRUD E API)
// ==============================================================================

export async function buscarTimeCartola(termo: string) {
  const res = await fetch(`https://api.cartola.globo.com/times?q=${termo}`)
  const data = await res.json()
  return data
}

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

export async function criarCampeonato(nome: string, ano: number, tipo: string) {
  const { error } = await supabase.from('campeonatos').insert([{ nome, ano, tipo, ativo: true }])
  if (error) return { success: false, msg: error.message }
  return { success: true, msg: 'Campeonato criado!' }
}

export async function listarCampeonatos() {
  const { data } = await supabase.from('campeonatos').select('*').order('id', { ascending: false })
  return data || []
}

export async function adicionarTimeAoCampeonato(campeonatoId: number, timeId: number) {
  const { error } = await supabase.from('classificacao').insert([{ campeonato_id: campeonatoId, time_id: timeId }])
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

export async function listarTimesDoCampeonato(campeonatoId: number) {
  const { data } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId)
  return data || []
}

export async function listarTodosTimes() {
  const { data } = await supabase.from('times').select('*').order('nome', { ascending: true })
  return data || []
}

export async function listarPartidas(campeonatoId: number) {
  const { data } = await supabase.from('partidas')
    .select(`*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)`)
    .eq('campeonato_id', campeonatoId)
    .order('rodada', { ascending: true })
    .order('id', { ascending: true })
  return data || []
}

export async function removerTimeDaLiga(campeonatoId: number, timeId: number) {
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_casa', timeId)
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_visitante', timeId)
  const { error } = await supabase.from('classificacao').delete().eq('campeonato_id', campeonatoId).eq('time_id', timeId)
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

export async function removerTime(timeIdCartola: number) {
  const { data: time } = await supabase.from('times').select('id').eq('time_id_cartola', timeIdCartola).single()
  if (!time) return { success: false, msg: "Time não encontrado." }
  await supabase.from('classificacao').delete().eq('time_id', time.id)
  await supabase.from('partidas').delete().eq('time_casa', time.id)
  await supabase.from('partidas').delete().eq('time_visitante', time.id)
  await supabase.from('times').delete().eq('id', time.id)
  return { success: true }
}

export async function zerarJogos(campeonatoId: number) {
  const { error } = await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId)
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

export async function listarIdsTimesSalvos() {
  const { data } = await supabase.from('times').select('time_id_cartola')
  return data?.map((t: any) => t.time_id_cartola) || []
}

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

export async function buscarTabela(campeonatoId: number) {
  const { data } = await supabase.from('classificacao').select('*, times(*)')
    .eq('campeonato_id', campeonatoId)
    .order('pts', { ascending: false })
    .order('v', { ascending: false })
    .order('sp', { ascending: false })
    .order('pp', { ascending: false })
  return data || []
}

export async function recalcularTabela(campeonatoId: number) {
  await supabase.rpc('calcular_classificacao', { liga_id: campeonatoId })
  return { success: true }
}

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

export async function buscarLigaOficial() {
  const ranking = await buscarRankingCompleto();
  return ranking.slice(0, 5);
}

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

export async function buscarHistoricoConfrontoDireto(campeonatoId: number, timeIds: number[]) {
  const { data: jogos } = await supabase.from('partidas')
    .select('time_casa, time_visitante, placar_casa, placar_visitante')
    .eq('campeonato_id', campeonatoId)
    .in('time_casa', timeIds)
    .in('time_visitante', timeIds)
    .not('placar_casa', 'is', null)
  return jogos || []
}

// HELPER: ATUALIZAR JOGO INDIVIDUAL
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
// 3. LÓGICA DE MATA-MATA (TORNEIO PURO)
// ==============================================================================

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

export async function gerarMataMataInteligente(campeonatoId: number, idsOrdenados: number[] = [], aleatorio: boolean = false) {
  const timesNoBanco = await listarTimesDoCampeonato(campeonatoId);
  if (timesNoBanco.length < 2) return { success: false, msg: "Mínimo de 2 times." };

  let rankingInicial: any[] = [];
  if (aleatorio) {
    rankingInicial = [...timesNoBanco].sort(() => Math.random() - 0.5);
  } else if (idsOrdenados.length > 0) {
    rankingInicial = idsOrdenados.map(id => timesNoBanco.find(t => t.time_id === id)).filter(t => t !== undefined);
    const faltantes = timesNoBanco.filter(t => !idsOrdenados.includes(t.time_id));
    rankingInicial = [...rankingInicial, ...faltantes];
  } else {
    rankingInicial = [...timesNoBanco];
  }

  const numTimes = rankingInicial.length;
  let tamanhoChave = 2;
  while (tamanhoChave < numTimes) tamanhoChave *= 2;

  const seedsCompletos = [...rankingInicial];
  while (seedsCompletos.length < tamanhoChave) {
    seedsCompletos.push(null); 
  }

  const ordemConfrontos = getBracketOrder(tamanhoChave);
  const timesOrdenados = ordemConfrontos.map(i => seedsCompletos[i]);

  await zerarJogos(campeonatoId);
  const partidasParaSalvar = [];

  for (let i = 0; i < timesOrdenados.length; i += 2) {
    const timeA = timesOrdenados[i];
    const timeB = timesOrdenados[i+1];
    if (!timeA && !timeB) continue; 

    if (timeA && !timeB) {
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeA.time_id, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else if (!timeA && timeB) {
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeB.time_id, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else if (timeA && timeB) {
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeA.time_id, time_visitante: timeB.time_id, status: 'agendado' });
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeB.time_id, time_visitante: timeA.time_id, status: 'agendado' });
    }
  }

  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };
  return { success: true, msg: `Chaveamento Olímpico gerado! (Chave de ${tamanhoChave})` };
}

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
    
    // Lógica de soma dos placares Ida + Volta
    const golsTimeA = (jogo.placar_casa || 0) + (volta?.placar_visitante || 0); 
    const golsTimeB = (jogo.placar_visitante || 0) + (volta?.placar_casa || 0); 

    // Se for só jogo único, volta é undefined, soma é direta
    if (!volta) {
        if ((jogo.placar_casa||0) > (jogo.placar_visitante||0)) classificados.push(jogo.time_casa);
        else classificados.push(jogo.time_visitante);
    } else {
        if (golsTimeA > golsTimeB) classificados.push(jogo.time_casa);
        else if (golsTimeB > golsTimeA) classificados.push(jogo.time_visitante);
        else classificados.push(jogo.time_casa); // Critério desempate padrão: time da ida casa (melhor campanha)
    }
  }

  if (classificados.length < 2) return { success: false, msg: "Campeão definido!" };

  const novasPartidas = [];
  // Se tem ida e volta, a próxima fase pula 2 números (Ex: 7 e 8 -> 9 e 10)
  // Se for jogo único, pula 1.
  // Vamos assumir Ida e Volta como padrão da Copa
  const proximaRodada = faseAtual + 2; 

  for (let i = 0; i < classificados.length; i += 2) {
    const timeA = classificados[i];
    const timeB = classificados[i+1]; 
    if (!timeB) {
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else {
      // Ida
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
      // Volta
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada + 1, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
    }
  }

  const { error } = await supabase.from('partidas').insert(novasPartidas);
  if (error) return { success: false, msg: error.message };
  return { success: true, msg: `Fase ${proximaRodada} gerada!` };
}

export async function atualizarRodadaMataMata(campeonatoId: number, fase: number, rodadaIda: number, rodadaVolta: number) {
  const { data: partidas } = await supabase.from('partidas')
    .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId).eq('rodada', fase).neq('status', 'bye').order('id', { ascending: true });

  if (!partidas) return { success: false, msg: "Sem jogos." };
  const headersGlobo = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  
  for (const jogo of partidas) {
      await atualizarJogoIndividual(jogo, rodadaIda, headersGlobo); 
  }
  return { success: true, msg: `Pontos atualizados!` };
}

// ==============================================================================
// 4. LÓGICA DE COPA (GRUPOS + MATA-MATA)
// ==============================================================================

// 1. SORTEIO DE GRUPOS
export async function sortearGrupos(campeonatoId: number, numGrupos: number, potes: number[][]) {
  if (potes.length === 0 || potes[0].length === 0) return { success: false, msg: "Potes vazios." };
  await supabase.from('classificacao').update({ grupo: null, fase_atual: 'fase_grupos' }).eq('campeonato_id', campeonatoId);
  const letrasGrupos = ['A','B','C','D','E','F','G','H'];
  for (let i = 0; i < potes.length; i++) {
    const poteAtual = potes[i].sort(() => Math.random() - 0.5);
    for (let g = 0; g < numGrupos; g++) {
      const timeId = poteAtual[g];
      if (timeId) await supabase.from('classificacao').update({ grupo: letrasGrupos[g] }).eq('campeonato_id', campeonatoId).eq('time_id', timeId);
    }
  }
  return { success: true, msg: "Grupos sorteados! Agora gere as rodadas." };
}

// 2. GERAR JOGOS DA FASE DE GRUPOS
export async function gerarJogosFaseGrupos(campeonatoId: number) {
  await zerarJogos(campeonatoId);
  const timesClassificados = await listarTimesDoCampeonato(campeonatoId);
  const letrasGrupos = ['A','B','C','D','E','F','G','H'];
  const partidasParaSalvar = [];

  for (const grupoLetra of letrasGrupos) {
    const timesDoGrupo = timesClassificados.filter((t:any) => t.grupo === grupoLetra);
    const idsNoGrupo = timesDoGrupo.map((t:any) => t.time_id);
    const numTimes = idsNoGrupo.length;

    if (numTimes < 2) continue;

    const teams = [...idsNoGrupo];
    if (numTimes % 2 !== 0) teams.push(-1); 
    const n = teams.length;
    const numRounds = n - 1;
    const half = n / 2;

    for (let r = 0; r < numRounds; r++) {
        for (let i = 0; i < half; i++) {
            const t1 = teams[i];
            const t2 = teams[n - 1 - i];
            if (t1 !== -1 && t2 !== -1) {
                partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: r + 1, time_casa: t1, time_visitante: t2, status: 'agendado' });
                partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: (r + 1) + numRounds, time_casa: t2, time_visitante: t1, status: 'agendado' });
            }
        }
        const last = teams.pop();
        if (last) teams.splice(1, 0, last);
    }
  }

  if (partidasParaSalvar.length === 0) return { success: false, msg: "Nenhum grupo definido." };
  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };
  return { success: true, msg: "Rodadas de ida e volta geradas com sucesso!" };
}

// 3. BUSCAR TABELA DE GRUPOS
export async function buscarTabelaGrupos(campeonatoId: number) {
  const { data: times } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId).not('grupo', 'is', null);
  const { data: jogos } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).not('placar_casa', 'is', null); 
  if (!times) return {};

  const stats: any = {};
  times.forEach((t: any) => { stats[t.time_id] = { ...t, pts: 0, pj: 0, v: 0, e: 0, d: 0, pp: 0, pc: 0, sp: 0 }; });

  jogos?.forEach((jogo: any) => {
    // Conta apenas jogos da fase de grupos (rodadas baixas)
    // Assumindo que fase de grupos vai ate rodada 20 (seguro)
    if (jogo.rodada > 20) return;

    const casa = stats[jogo.time_casa];
    const visit = stats[jogo.time_visitante];
    if (casa && visit) {
      casa.pj++; visit.pj++;
      casa.pp += jogo.placar_casa; casa.pc += jogo.placar_visitante;
      visit.pp += jogo.placar_visitante; visit.pc += jogo.placar_casa;
      casa.sp = casa.pp - casa.pc; visit.sp = visit.pp - visit.pc;
      if (jogo.placar_casa > jogo.placar_visitante) { casa.pts += 3; casa.v++; visit.d++; }
      else if (jogo.placar_visitante > jogo.placar_casa) { visit.pts += 3; visit.v++; casa.d++; }
      else { casa.pts += 1; visit.pts += 1; casa.e++; visit.e++; }
    }
  });

  const grupos: any = {};
  Object.values(stats).forEach((time: any) => {
    if (!grupos[time.grupo]) grupos[time.grupo] = [];
    grupos[time.grupo].push(time);
  });
  for (const letra in grupos) {
    grupos[letra].sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
  }
  return grupos;
}

// 4. ATUALIZAR RODADA
export async function atualizarRodadaGrupos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  const { data: partidas } = await supabase.from('partidas').select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id', { ascending: true });
  if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta rodada." };
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  for (const jogo of partidas) { await atualizarJogoIndividual(jogo, rodadaCartola, headers); }
  return { success: true, msg: `Rodada ${rodadaLiga} atualizada!` };
}

// 5. GERAR MATA-MATA COPA (CORRIGIDO)
async function zerarMataMata(campeonatoId: number, rodadaInicio: number) {
    await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).gte('rodada', rodadaInicio);
}

export async function excluirMataMata(campeonatoId: number, rodadaInicio: number) {
    const { error } = await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).gte('rodada', rodadaInicio);
    if (error) return { success: false, msg: error.message };
    return { success: true, msg: "Mata-mata excluído com sucesso!" };
}

function getSeedingIndices(n: number) {
    if (n === 4) return [0, 3, 2, 1]; // 1º, 4º, 3º, 2º
    if (n === 8) return [0, 7, 4, 3, 2, 5, 6, 1]; // 1º..8º
    return Array.from({length: n}, (_, i) => i);
}

export async function gerarMataMataCopa(campeonatoId: number) {
  const { data: jogosGrupos } = await supabase.from('partidas').select('rodada').eq('campeonato_id', campeonatoId);
  const rodadasGrupos = jogosGrupos?.map(j => j.rodada).filter(r => r < 20) || [];
  const maxRodadaGrupo = rodadasGrupos.length > 0 ? Math.max(...rodadasGrupos) : 0;
  
  if (maxRodadaGrupo === 0) return { success: false, msg: "Gere a fase de grupos primeiro." };
  
  const rodadaIda = maxRodadaGrupo + 1;
  const rodadaVolta = maxRodadaGrupo + 2;

  await zerarMataMata(campeonatoId, rodadaIda);

  const grupos = await buscarTabelaGrupos(campeonatoId);
  const letras = Object.keys(grupos).sort();
  if (letras.length === 0) return { success: false, msg: "Grupos vazios." };

  const pote1: any[] = [];
  const pote2: any[] = [];

  letras.forEach(letra => {
      const times = grupos[letra];
      if (times.length >= 1) pote1.push({ ...times[0], grupoOrigem: letra });
      if (times.length >= 2) pote2.push({ ...times[1], grupoOrigem: letra });
  });

  if (pote1.length < 2) return { success: false, msg: "Times insuficientes." };

  pote1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
  pote2.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);

  const numConfrontos = pote1.length;
  const confrontos = new Array(numConfrontos).fill(null);
  const seedingOrder = getSeedingIndices(numConfrontos);

  seedingOrder.forEach((seedIndex, slotIndex) => {
      if (pote1[seedIndex]) {
          confrontos[slotIndex] = { casa: pote1[seedIndex], visitante: null };
      }
  });

  const pote2Disponivel = [...pote2];

  for (let i = 0; i < numConfrontos; i++) {
      const mandante = confrontos[i]?.casa;
      if (!mandante) continue;

      let oponenteIndex = -1;
      for (let j = pote2Disponivel.length - 1; j >= 0; j--) {
          if (pote2Disponivel[j].grupoOrigem !== mandante.grupoOrigem) {
              oponenteIndex = j;
              break;
          }
      }

      if (oponenteIndex === -1) oponenteIndex = pote2Disponivel.length - 1;

      if (oponenteIndex >= 0) {
          confrontos[i].visitante = pote2Disponivel[oponenteIndex];
          pote2Disponivel.splice(oponenteIndex, 1);
      }
  }

  const partidasParaSalvar = [];

  confrontos.forEach((conf) => {
      if (conf && conf.casa && conf.visitante) {
          partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: rodadaIda, time_casa: conf.visitante.time_id, time_visitante: conf.casa.time_id, status: 'agendado' });
          partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: rodadaVolta, time_casa: conf.casa.time_id, time_visitante: conf.visitante.time_id, status: 'agendado' });
      }
  });

  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };

  return { success: true, msg: "Mata-mata sorteado com sucesso!" };
}