'use server'

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// ==============================================================================
// HELPER: FETCH SEGURO COM TIMEOUT (API CARTOLA)
// ==============================================================================
async function fetchCartola(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://ge.globo.com/'
      },
      next: { revalidate: 0 } // Garante dados frescos sempre
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
        return null;
    }
    return await res.json();
  } catch (error) {
    return null;
  }
}

// ==============================================================================
// 1. FUNÇÕES BÁSICAS
// ==============================================================================

export async function buscarTimeCartola(termo: string) {
  return await fetchCartola(`https://api.cartola.globo.com/times?q=${termo}`) || []
}

export async function salvarTime(time: any) {
  const { error } = await supabase.from('times').insert([{
    nome: time.nome,
    nome_cartola: time.nome_cartola,
    escudo: time.url_escudo_png,
    slug: time.slug,
    time_id_cartola: time.time_id
  }])
  
  if (!error) {
    revalidatePath('/admin/times')
    revalidatePath('/ranking')
  }

  return { success: !error, msg: error ? error.message : 'Salvo!' }
}

export async function criarCampeonato(nome: string, ano: number, tipo: string) {
  const { error } = await supabase.from('campeonatos').insert([{ nome, ano, tipo, ativo: true, final_unica: false }])
  
  if (!error) {
    revalidatePath('/admin/ligas')
    revalidatePath('/campeonatos')
  }
  
  return { success: !error, msg: error ? error.message : 'Criado!' }
}

export async function atualizarConfiguracaoLiga(campeonatoId: number, finalUnica: boolean) {
  await supabase.from('campeonatos').update({ final_unica: finalUnica }).eq('id', campeonatoId)
  revalidatePath(`/campeonatos/${campeonatoId}`)
  revalidatePath(`/admin/ligas/${campeonatoId}`)
  return { success: true }
}

export async function listarCampeonatos() {
  const { data } = await supabase.from('campeonatos').select('*').order('id', { ascending: false })
  return data || []
}

// ==============================================================================
// 2. GERENCIAMENTO DE TIMES
// ==============================================================================

export async function listarIdsTimesSalvos() {
  const { data } = await supabase.from('times').select('time_id_cartola')
  return data?.map((t: any) => t.time_id_cartola) || []
}

export async function adicionarTimeAoCampeonato(campeonatoId: number, timeId: number) {
  const { data: existe } = await supabase.from('classificacao').select('id').eq('campeonato_id', campeonatoId).eq('time_id', timeId).single();
  
  if (!existe) {
    const { error } = await supabase.from('classificacao').insert([{ 
        campeonato_id: campeonatoId, 
        time_id: timeId,
        pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 
    }])
    if (error) return { success: false, msg: error.message }
  }
  
  await recalcularTabelaPontosCorridos(campeonatoId);
  revalidatePath(`/campeonatos/${campeonatoId}`)
  revalidatePath(`/admin/ligas/${campeonatoId}`)
  
  return { success: true }
}

export async function removerTimeDaLiga(campeonatoId: number, timeId: number) {
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).or(`time_casa.eq.${timeId},time_visitante.eq.${timeId}`)
  await supabase.from('classificacao').delete().eq('campeonato_id', campeonatoId).eq('time_id', timeId)
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  revalidatePath(`/admin/ligas/${campeonatoId}`)
  
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

export async function removerTime(timeIdCartola: number) {
  const { data: time } = await supabase.from('times').select('id').eq('time_id_cartola', timeIdCartola).single()
  if (!time) return { success: false, msg: "Time não encontrado." }
  
  // Limpeza em cascata manual (caso o banco não tenha cascade)
  await supabase.from('classificacao').delete().eq('time_id', time.id)
  await supabase.from('partidas').delete().eq('time_casa', time.id)
  await supabase.from('partidas').delete().eq('time_visitante', time.id)
  await supabase.from('times').delete().eq('id', time.id)
  
  revalidatePath('/admin/times')
  return { success: true }
}

// ==============================================================================
// 3. JOGOS E ATUALIZAÇÕES GERAIS
// ==============================================================================

export async function listarPartidas(campeonatoId: number) {
  const { data } = await supabase.from('partidas')
    .select(`*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)`)
    .eq('campeonato_id', campeonatoId)
    .order('rodada', { ascending: true })
    .order('id', { ascending: true })
  return data || []
}

export async function zerarJogos(campeonatoId: number) {
  // ATENÇÃO: Limpa jogos E reinicia stats.
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId)
  await supabase.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, grupo: null }).eq('campeonato_id', campeonatoId);
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  revalidatePath(`/admin/ligas/${campeonatoId}`)
  return { success: true }
}

async function atualizarJogoIndividual(jogo: any, rodadaCartola: number) {
    if (!rodadaCartola || rodadaCartola <= 0) return;
    try {
        const [resCasa, resVis] = await Promise.all([
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`),
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`)
        ]);

        const ptsCasa = resCasa?.pontos || 0;
        const ptsVis = resVis?.pontos || 0;

        await supabase.from('partidas').update({
            pontos_reais_casa: ptsCasa, placar_casa: Math.floor(ptsCasa),
            pontos_reais_visitante: ptsVis, placar_visitante: Math.floor(ptsVis), status: 'finalizado'
        }).eq('id', jogo.id);
    } catch (e) { console.error("Erro ao atualizar jogo individual", e); }
}

export async function atualizarPlacarManual(partidaId: number, casa: number, visitante: number) {
  const { data } = await supabase.from('partidas')
    .update({ placar_casa: casa, placar_visitante: visitante, status: 'finalizado' })
    .eq('id', partidaId).select('campeonato_id, rodada, campeonato:campeonatos(tipo)').single()
  
  if (!data) return { success: false }

  const tipo = data.campeonato.tipo;

  if (tipo === 'pontos_corridos' || (tipo === 'copa' && data.rodada <= 20)) {
      await recalcularTabelaPontosCorridos(data.campeonato_id)
  }
  
  if (tipo === 'mata_mata' || (tipo === 'copa' && data.rodada > 20)) {
      await verificarEAvancarFase(data.campeonato_id, data.rodada);
  }

  revalidatePath(`/campeonatos/${data.campeonato_id}`)
  return { success: true }
}

// ==============================================================================
// 4. MÓDULO: PONTOS CORRIDOS
// ==============================================================================

async function sincronizarTimesClassificacao(campeonatoId: number, timesIds: number[]) {
    const { data: existentes } = await supabase.from('classificacao').select('time_id').eq('campeonato_id', campeonatoId)
    const existentesIds = existentes?.map(e => e.time_id) || []
    const faltantes = timesIds.filter(id => !existentesIds.includes(id))
    
    if (faltantes.length > 0) {
        const inserts = faltantes.map(id => ({
            campeonato_id: campeonatoId, time_id: id, pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 
        }))
        await supabase.from('classificacao').insert(inserts)
    }
}

export async function gerarJogosPontosCorridos(campeonatoId: number) {
    await zerarJogos(campeonatoId);
    const times = await listarTimesDoCampeonato(campeonatoId);
    const ids = times.map(t => t.time_id);
    
    if (ids.length < 2) return { success: false, msg: "Precisa de pelo menos 2 times." };

    await sincronizarTimesClassificacao(campeonatoId, ids);

    // Algoritmo Round-robin
    if (ids.length % 2 !== 0) ids.push(-1); 
    const numTimes = ids.length;
    const numRodadas = numTimes - 1;
    const metade = numTimes / 2;
    const partidas = [];

    for (let rodada = 0; rodada < numRodadas; rodada++) {
        for (let i = 0; i < metade; i++) {
            const t1 = ids[i];
            const t2 = ids[numTimes - 1 - i];
            if (t1 !== -1 && t2 !== -1) {
                if (rodada % 2 === 0) partidas.push({ campeonato_id: campeonatoId, rodada: rodada + 1, time_casa: t1, time_visitante: t2, status: 'agendado' });
                else partidas.push({ campeonato_id: campeonatoId, rodada: rodada + 1, time_casa: t2, time_visitante: t1, status: 'agendado' });
            }
        }
        // Rotaciona o array, mantendo o primeiro fixo
        ids.splice(1, 0, ids.pop()!);
    }

    const partidasReturno = partidas.map(p => ({ ...p, rodada: p.rodada + numRodadas, time_casa: p.time_visitante, time_visitante: p.time_casa }));
    await supabase.from('partidas').insert([...partidas, ...partidasReturno]);
    await recalcularTabelaPontosCorridos(campeonatoId);

    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Tabela de Pontos Corridos gerada!" };
}

export async function atualizarRodadaPontosCorridos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
    const { data: partidas } = await supabase.from('partidas')
      .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
      .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

    if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta rodada." };

    for (const jogo of partidas) {
        await atualizarJogoIndividual(jogo, rodadaCartola);
    }

    await recalcularTabelaPontosCorridos(campeonatoId);
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Rodada atualizada!" };
}

export async function recalcularTabelaPontosCorridos(campeonatoId: number) {
    // Reseta stats mas mantém os grupos
    await supabase.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }).eq('campeonato_id', campeonatoId);
    
    const { data: jogos } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).eq('status', 'finalizado');
    const { data: times } = await supabase.from('classificacao').select('time_id').eq('campeonato_id', campeonatoId);
    
    if (!times) return;

    const stats: any = {};
    times.forEach((t: any) => { stats[t.time_id] = { pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }; });

    if (jogos) {
        jogos.forEach((j: any) => {
            const c = stats[j.time_casa]; const v = stats[j.time_visitante];
            if (c && v) {
                c.pj++; v.pj++;
                // PP = Pontos Pró, PC = Pontos Contra, SP = Saldo de Pontos
                c.pp += j.placar_casa; c.pc += j.placar_visitante;
                v.pp += j.placar_visitante; v.pc += j.placar_casa;
                c.sp = c.pp - c.pc; v.sp = v.pp - v.pc;

                // Compatibilidade com campos de futebol (Gols Pro, Gols Contra, Saldo Gols)
                c.gp = c.pp; c.gc = c.pc; c.sg = c.sp;
                v.gp = v.pp; v.gc = v.pc; v.sg = v.sp;

                if (j.placar_casa > j.placar_visitante) { c.pts += 3; c.v++; v.d++; }
                else if (j.placar_visitante > j.placar_casa) { v.pts += 3; v.v++; c.d++; }
                else { c.pts += 1; v.pts += 1; c.e++; v.e++; }
            }
        });
    }

    for (const tId in stats) {
        await supabase.from('classificacao').update(stats[tId]).eq('campeonato_id', campeonatoId).eq('time_id', tId);
    }
}

export async function buscarTabelaPontosCorridos(campeonatoId: number) {
    const { data } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId)
      .order('pts', { ascending: false }).order('v', { ascending: false }).order('sp', { ascending: false }).order('pp', { ascending: false });
    return data || [];
}

// ==============================================================================
// 5. MÓDULO: MATA-MATA GERAL
// ==============================================================================

function getBracketOrder(n: number): number[] {
  if (n === 2) return [1, 2];
  const previous = getBracketOrder(n / 2);
  const result = [];
  for (let i = 0; i < previous.length; i++) {
      result.push(previous[i]);
      result.push(n + 1 - previous[i]);
  }
  return result;
}

export async function gerarMataMataInteligente(campeonatoId: number, idsOrdenados: number[] = [], aleatorio: boolean = false) {
  const timesNoBanco = await listarTimesDoCampeonato(campeonatoId);
  if (timesNoBanco.length < 2) return { success: false, msg: "Mínimo de 2 times." };

  let rankingInicial: any[] = [];

  if (aleatorio) {
    rankingInicial = [...timesNoBanco].sort(() => Math.random() - 0.5).map(t => t.time_id);
  } else if (idsOrdenados.length > 0) {
    rankingInicial = idsOrdenados;
    const faltantes = timesNoBanco.filter(t => !idsOrdenados.includes(t.time_id)).map(t => t.time_id);
    rankingInicial = [...rankingInicial, ...faltantes];
  } else {
    rankingInicial = timesNoBanco.map(t => t.time_id);
  }

  const numTimes = rankingInicial.length;
  const tamanhoChave = Math.pow(2, Math.ceil(Math.log2(numTimes)));
  
  const slots = new Array(tamanhoChave).fill(null);
  for (let i = 0; i < numTimes; i++) {
      slots[i] = rankingInicial[i];
  }

  const bracketOrder = getBracketOrder(tamanhoChave).map(x => x - 1);
  const partidasParaSalvar = [];

  await zerarJogos(campeonatoId);

  for (let i = 0; i < bracketOrder.length; i += 2) {
    const seedA = bracketOrder[i];
    const seedB = bracketOrder[i+1];
    
    const timeA = slots[seedA]; 
    const timeB = slots[seedB]; 

    if (!timeA && !timeB) continue;

    if (timeA && !timeB) {
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeA, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else if (!timeA && timeB) {
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeB, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else {
      // Ida e Volta
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
      partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 2, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
    }
  }

  const { error } = await supabase.from('partidas').insert(partidasParaSalvar);
  if (error) return { success: false, msg: error.message };

  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: `Mata-Mata gerado com ${numTimes} times!` };
}

export async function atualizarRodadaMataMata(campeonatoId: number, fase: number, rodadaIda: number, rodadaVolta: number) {
  const { data: partidas } = await supabase.from('partidas')
    .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId)
    .in('rodada', [fase, fase + 1]) 
    .neq('status', 'bye')
    .order('id', { ascending: true });

  if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta fase." };
  
  for (const jogo of partidas) {
      let r = 0;
      if (jogo.rodada === fase) r = rodadaIda;
      else if (jogo.rodada === fase + 1) r = rodadaVolta;

      if (r > 0) await atualizarJogoIndividual(jogo, r); 
  }

  await verificarEAvancarFase(campeonatoId, fase);
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: `Pontos atualizados!` };
}

async function verificarEAvancarFase(campeonatoId: number, rodadaAtual: number) {
  const ehIda = rodadaAtual % 2 !== 0; 
  const rodadaIda = ehIda ? rodadaAtual : rodadaAtual - 1;
  const rodadaVolta = rodadaIda + 1;

  const { data: jogosFase } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).in('rodada', [rodadaIda, rodadaVolta]);
  if (!jogosFase || jogosFase.length === 0) return;

  // Verifica se todos os jogos "não-bye" estão finalizados
  const pendentes = jogosFase.filter((j: any) => j.status !== 'finalizado' && j.status !== 'bye');
  if (pendentes.length > 0) return; 

  const proximaRodada = rodadaIda + 2;
  const { data: existe } = await supabase.from('partidas').select('id').eq('campeonato_id', campeonatoId).eq('rodada', proximaRodada).limit(1);
  if (existe && existe.length > 0) return; // Próxima fase já gerada

  const classificados: number[] = [];
  const jogosIdaList = jogosFase.filter((j: any) => j.rodada === rodadaIda).sort((a, b) => a.id - b.id);

  for (const jogo of jogosIdaList) {
    if (jogo.status === 'bye') {
      classificados.push(jogo.time_casa);
      continue;
    }
    const volta = jogosFase.find((j:any) => j.rodada === rodadaVolta && (j.time_casa === jogo.time_visitante || j.time_casa === jogo.time_casa));
    
    let pA = jogo.placar_casa || 0; 
    let pB = jogo.placar_visitante || 0;

    if (volta) {
       // Soma placares agregados
       if (volta.time_casa === jogo.time_visitante) { pA += (volta.placar_visitante || 0); pB += (volta.placar_casa || 0); }
       else { pA += (volta.placar_casa || 0); pB += (volta.placar_visitante || 0); }
    }

    // Critério de Desempate (Simplificado: quem tem mais pontos/gols. Pênaltis não implementado auto)
    if (pA > pB) classificados.push(jogo.time_casa);
    else if (pB > pA) classificados.push(jogo.time_visitante);
    else classificados.push(jogo.time_casa); // Empate (TODO: Implementar lógica de melhor campanha ou sorteio)
  }

  if (classificados.length < 2) return;

  const { data: camp } = await supabase.from('campeonatos').select('final_unica').eq('id', campeonatoId).single();
  const ehFinal = classificados.length === 2;
  const criarJogoUnico = ehFinal && (camp?.final_unica === true);

  const novasPartidas = [];
  for (let i = 0; i < classificados.length; i += 2) {
    const timeA = classificados[i];
    const timeB = classificados[i+1]; 
    if (!timeB) {
      novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
    } else {
      if (criarJogoUnico) {
          novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
      } else {
          novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
          novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada + 1, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
      }
    }
  }
  await supabase.from('partidas').insert(novasPartidas);
}

export async function avancarFaseMataMata(campeonatoId: number, faseAtual: number) {
  await verificarEAvancarFase(campeonatoId, faseAtual);
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: "Verificação concluída." };
}

// ==============================================================================
// 6. MÓDULO: COPA (GRUPOS E CHAVEAMENTO)
// ==============================================================================

export async function sortearGrupos(campeonatoId: number, numGrupos: number, potes: number[][]) {
  if (potes.length === 0 || potes[0].length === 0) return { success: false, msg: "Potes vazios." };
  
  await supabase.from('classificacao').update({ grupo: null, fase_atual: 'fase_grupos' }).eq('campeonato_id', campeonatoId);
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).lte('rodada', 20); 

  const letras = ['A','B','C','D','E','F','G','H'];
  
  for (let i = 0; i < potes.length; i++) {
    const pote = potes[i].sort(() => Math.random() - 0.5);
    for (let g = 0; g < numGrupos; g++) {
      if (pote[g]) {
          await supabase.from('classificacao').update({ grupo: letras[g] }).eq('campeonato_id', campeonatoId).eq('time_id', pote[g]);
      }
    }
  }
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: "Grupos sorteados!" };
}

export async function gerarJogosFaseGrupos(campeonatoId: number) {
  // Limpa apenas partidas, mantém grupos
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId);
  await supabase.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }).eq('campeonato_id', campeonatoId);

  const times = await listarTimesDoCampeonato(campeonatoId);
  const letras = ['A','B','C','D','E','F','G','H'];
  const partidas = [];

  for (const letra of letras) {
    const grupo = times.filter((t:any) => t.grupo === letra).map((t:any) => t.time_id);
    if (grupo.length < 2) continue;
    
    // Algoritmo Round-Robin para grupos
    if (grupo.length % 2 !== 0) grupo.push(-1);
    const n = grupo.length;
    const rounds = n - 1;
    const half = n / 2;

    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < half; i++) {
            const t1 = grupo[i];
            const t2 = grupo[n - 1 - i];
            if (t1 !== -1 && t2 !== -1) {
                // Ida
                partidas.push({ campeonato_id: campeonatoId, rodada: r + 1, time_casa: t1, time_visitante: t2, status: 'agendado' });
                // Volta (adiciona ao final das rodadas de ida)
                partidas.push({ campeonato_id: campeonatoId, rodada: r + 1 + rounds, time_casa: t2, time_visitante: t1, status: 'agendado' });
            }
        }
        grupo.splice(1, 0, grupo.pop()!);
    }
  }
  const { error } = await supabase.from('partidas').insert(partidas);
  if (error) return { success: false, msg: error.message };
  
  await recalcularTabelaPontosCorridos(campeonatoId);
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: "Jogos da fase de grupos gerados!" };
}

export async function atualizarRodadaGrupos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  const { data: partidas } = await supabase.from('partidas')
    .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

  if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos." };

  for (const jogo of partidas) {
      await atualizarJogoIndividual(jogo, rodadaCartola);
  }
  await recalcularTabelaPontosCorridos(campeonatoId);
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: "Rodada atualizada!" };
}

export async function buscarTabelaGrupos(campeonatoId: number) {
  const { data: times } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId).not('grupo', 'is', null);
  const { data: jogos } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).not('placar_casa', 'is', null); 
  if (!times) return {};

  const stats: any = {};
  times.forEach((t: any) => { stats[t.time_id] = { ...t, pts: 0, pj: 0, v: 0, e: 0, d: 0, pp: 0, pc: 0, sp: 0 }; });

  jogos?.forEach((jogo: any) => {
    if (jogo.rodada > 20) return; // Ignora jogos de mata-mata (rodadas altas)
    const c = stats[jogo.time_casa]; const v = stats[jogo.time_visitante];
    if (c && v) {
      c.pj++; v.pj++;
      c.pp += jogo.placar_casa; c.pc += jogo.placar_visitante;
      v.pp += jogo.placar_visitante; v.pc += jogo.placar_casa;
      c.sp = c.pp - c.pc; v.sp = v.pp - v.pc;
      if (jogo.placar_casa > jogo.placar_visitante) { c.pts += 3; c.v++; v.d++; }
      else if (jogo.placar_visitante > jogo.placar_casa) { v.pts += 3; v.v++; c.d++; }
      else { c.pts += 1; v.pts += 1; c.e++; v.e++; }
    }
  });

  const grupos: any = {};
  Object.values(stats).forEach((time: any) => {
    if (!grupos[time.grupo]) grupos[time.grupo] = [];
    grupos[time.grupo].push(time);
  });
  // Ordenação
  for (const l in grupos) {
    grupos[l].sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
  }
  return grupos;
}

export async function excluirMataMata(campeonatoId: number, rodadaInicio: number) {
    const { error } = await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).gte('rodada', rodadaInicio);
    if (error) return { success: false, msg: error.message };
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Mata-mata limpo." };
}

// --------------------------------------------------------------------------------
// GERAÇÃO DE MATA-MATA (LÓGICA AVANÇADA DE SORTEIO DIRIGIDO)
// --------------------------------------------------------------------------------
export async function gerarMataMataCopa(campeonatoId: number) {
  // 1. Descobrir rodada inicial do mata-mata
  const { data: jogos } = await supabase.from('partidas').select('rodada').eq('campeonato_id', campeonatoId);
  const rodadas = jogos?.map(j => j.rodada).filter(r => r <= 20) || [];
  const maxRodadaGrupos = rodadas.length > 0 ? Math.max(...rodadas) : 6;
  const inicioMataMata = maxRodadaGrupos + 1;

  // Limpa mata-mata anterior
  await excluirMataMata(campeonatoId, inicioMataMata);

  // 2. Buscar Classificação e separar Potes
  const grupos = await buscarTabelaGrupos(campeonatoId);
  const letras = Object.keys(grupos).sort();
  
  if (letras.length === 0) return { success: false, msg: "Fase de grupos vazia." };

  const pot1: any[] = []; // Primeiros colocados
  const pot2: any[] = []; // Segundos colocados

  letras.forEach(l => {
      if (grupos[l][0]) pot1.push({ ...grupos[l][0], gp_origem: l });
      if (grupos[l][1]) pot2.push({ ...grupos[l][1], gp_origem: l });
  });

  if (pot1.length < 2) return { success: false, msg: "Times insuficientes." };

  // 3. Ordenar Pote 1 para definir seeds (Melhor e Segunda Melhor Campanha)
  pot1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);

  const numConfrontos = pot1.length; 
  const metadeBracket = Math.floor(numConfrontos / 2);

  // Array que representará os Mandantes (Cabeças de Chave do Pote 1)
  const mandantes = new Array(numConfrontos).fill(null);

  // 4. TRAVA DE CHAVEAMENTO:
  // Coloca o 1º Melhor no topo da chave e o 2º Melhor na metade oposta.
  const seed1 = pot1[0]; 
  const seed2 = pot1[1]; 
  const outrosCabecas = pot1.slice(2);

  mandantes[0] = seed1;               // Chave Superior
  mandantes[metadeBracket] = seed2;   // Chave Inferior

  // Preencher os outros espaços com o restante do Pote 1 aleatoriamente
  outrosCabecas.sort(() => Math.random() - 0.5);
  let idxOutros = 0;
  for (let i = 0; i < numConfrontos; i++) {
      if (mandantes[i] === null) {
          mandantes[i] = outrosCabecas[idxOutros];
          idxOutros++;
      }
  }

  // 5. SORTEIO DO POTE 2 (ADVERSÁRIOS)
  // Regra: Não pode enfrentar time do mesmo grupo de origem
  let oponentes: any[] = [];
  let sucesso = false;
  let tentativas = 0;

  while (!sucesso && tentativas < 1000) {
      tentativas++;
      const pool = [...pot2].sort(() => Math.random() - 0.5);
      const tempOponentes = [];
      let valido = true;

      for (let i = 0; i < numConfrontos; i++) {
          const mandante = mandantes[i];
          const matchIndex = pool.findIndex(p => p.gp_origem !== mandante.gp_origem);
          
          if (matchIndex === -1) {
              valido = false;
              break; 
          }
          
          tempOponentes[i] = pool[matchIndex];
          pool.splice(matchIndex, 1);
      }

      if (valido) {
          oponentes = tempOponentes;
          sucesso = true;
      }
  }

  if (!sucesso) {
      return { success: false, msg: "Não foi possível gerar confrontos válidos (conflito de grupos)." };
  }

  // 6. Salvar Partidas (Ida e Volta)
  const partidasNovas: any[] = [];
  
  for (let i = 0; i < numConfrontos; i++) {
      const mandante = mandantes[i];  // Pote 1
      const visitante = oponentes[i]; // Pote 2

      // Jogo de IDA: Pote 2 manda o jogo
      partidasNovas.push({ 
          campeonato_id: campeonatoId, 
          rodada: inicioMataMata, 
          time_casa: visitante.time_id, 
          time_visitante: mandante.time_id, 
          status: 'agendado' 
      });

      // Jogo de VOLTA: Pote 1 manda o jogo (decide em casa)
      partidasNovas.push({ 
          campeonato_id: campeonatoId, 
          rodada: inicioMataMata + 1, 
          time_casa: mandante.time_id, 
          time_visitante: visitante.time_id, 
          status: 'agendado' 
      });
  }

  const { error } = await supabase.from('partidas').insert(partidasNovas);
  if (error) return { success: false, msg: error.message };
  
  revalidatePath(`/campeonatos/${campeonatoId}`)
  return { success: true, msg: "Mata-mata sorteado com sucesso!" };
}

// ==============================================================================
// 7. FUNÇÕES PARA HOME E RANKING
// ==============================================================================

export async function buscarRankingCompleto() {
  // 1. Busca apenas campeonatos de PONTOS CORRIDOS e ATIVOS
  const { data: ligas } = await supabase
    .from('campeonatos')
    .select('id')
    .eq('tipo', 'pontos_corridos')
    .eq('ativo', true)

  if (!ligas || ligas.length === 0) return []

  const idsLigas = ligas.map(l => l.id)

  // 2. Busca os times que estão nessas ligas
  const { data: participantes } = await supabase
    .from('classificacao')
    .select('time_id')
    .in('campeonato_id', idsLigas)

  if (!participantes || participantes.length === 0) return []

  // Remove duplicados (caso o time esteja em mais de uma liga)
  const idsTimesUnicos = [...new Set(participantes.map(p => p.time_id))]

  // 3. Busca os dados apenas desses times
  const { data: meusTimes } = await supabase
    .from('times')
    .select('*')
    .in('id', idsTimesUnicos)

  if (!meusTimes || meusTimes.length === 0) return []

  const resultados = [];
  const chunkSize = 5;
  
  for (let i = 0; i < meusTimes.length; i += chunkSize) {
      const chunk = meusTimes.slice(i, i + chunkSize);
      const promessas = chunk.map(async (time) => {
          try {
              const dados = await fetchCartola(`https://api.cartola.globo.com/time/id/${time.time_id_cartola}`);
              if (!dados) return null;
              
              return {
                  id: time.id, // Importante: ID do banco para salvar depois
                  pos: 0, 
                  time: dados.time.nome, 
                  cartoleiro: dados.time.nome_cartola,
                  pontos: dados.pontos_campeonato || 0, 
                  escudo: dados.time.url_escudo_png
              }
          } catch { return null }
      });
      
      const chunkRes = await Promise.all(promessas);
      resultados.push(...chunkRes);
  }

  return resultados
    .filter(i => i !== null)
    .sort((a: any, b: any) => b.pontos - a.pontos)
    .map((i: any, idx) => ({ ...i, pos: idx + 1 }))
}

// ==============================================================================
// 9. HISTÓRICO DE TEMPORADAS E RECORDES (CORRIGIDO)
// ==============================================================================

export async function listarAnosHistorico(tipo: 'ranking' | 'recordes' = 'ranking') {
  
  if (tipo === 'recordes') {
      const { data } = await supabase
        .from('historico_recordes')
        .select('ano, data_salvamento, titulo')
        .order('ano', { ascending: false });
      return data || [];
  }

  // Padrão: Ranking de Temporadas
  const { data } = await supabase
    .from('historico_temporadas')
    .select('ano, data_salvamento')
    .order('ano', { ascending: false });
  
  return data || [];
}

// *** CORREÇÃO IMPORTANTE: ORDEM DOS PARÂMETROS ***
// Deve corresponder à ordem que o BotaoSalvarRanking envia: (DADOS, ANO, TIPO, TÍTULO)
export async function salvarHistorico(dados: any[], ano: number, tipo: 'ranking' | 'recordes', titulo: string) {
  
  // 1. RECORDES (Tabela separada: historico_recordes)
  if (tipo === 'recordes') {
      const { data: existe } = await supabase
          .from('historico_recordes')
          .select('id')
          .eq('ano', ano)
          .single();

      if (existe) {
          const { error } = await supabase
              .from('historico_recordes')
              .update({ 
                  dados: dados, 
                  titulo: titulo,
                  data_salvamento: new Date() 
              })
              .eq('id', existe.id);
          
          if (error) return { success: false, msg: 'Erro ao atualizar recordes.' };
          return { success: true, msg: `Recordes de ${ano} atualizados!` };
      } else {
          const { error } = await supabase
              .from('historico_recordes')
              .insert([{ 
                  ano: ano, 
                  titulo: titulo,
                  dados: dados 
              }]);
          
          if (error) return { success: false, msg: 'Erro ao salvar recordes.' };
          return { success: true, msg: `Recordes de ${ano} salvos!` };
      }
  }
  
  // 2. RANKING DE LIGAS (Tabela padrão: historico_temporadas)
  else {
      const { data: existe } = await supabase
          .from('historico_temporadas')
          .select('id')
          .eq('ano', ano)
          .single();

      if (existe) {
          await supabase
              .from('historico_temporadas')
              .update({ ranking_json: dados, data_salvamento: new Date() })
              .eq('id', existe.id);
          return { success: true, msg: `Ranking de ${ano} atualizado!` };
      }

      const { error } = await supabase
          .from('historico_temporadas')
          .insert([{ 
              ano: ano, 
              ranking_json: dados 
          }]);

      if (error) return { success: false, msg: error.message };

      // Salva troféu do campeão se for ranking
      if (dados.length > 0) {
          const campeao = dados[0];
          await salvarTituloCampeao(campeao.id, campeao.time, ano);
      }
      
      return { success: true, msg: `Ranking de ${ano} salvo com sucesso!` };
  }
}

// Função genérica de busca: seleciona a tabela correta baseada no 'tipo'
export async function buscarHistoricoPorAno(ano: number, tipo: string = 'ranking') {
  
  if (tipo === 'recordes') {
    const { data } = await supabase
      .from('historico_recordes')
      .select('*')
      .eq('ano', ano)
      .single();
    return data;
  }
  
  // Default: Ranking
  const { data } = await supabase
    .from('historico_temporadas')
    .select('*')
    .eq('ano', ano)
    .single();
  return data;
}

// Mantida para compatibilidade - AGORA CHAMA COM A ORDEM CORRETA
export async function salvarHistoricoTemporada(rankingCompleto: any[], anoPersonalizado?: number) {
    const anoSalvar = anoPersonalizado || new Date().getFullYear();
    // Ordem: dados, ano, tipo, titulo
    return await salvarHistorico(rankingCompleto, anoSalvar, "ranking", "Ranking Geral");
}

// Mantida para compatibilidade - AGORA CHAMA COM A ORDEM CORRETA
export async function salvarHistoricoRecordes(recordes: any[], anoPersonalizado?: number) {
    const anoSalvar = anoPersonalizado || new Date().getFullYear();
    // Ordem: dados, ano, tipo, titulo
    return await salvarHistorico(recordes, anoSalvar, "recordes", "Recordes Gerais");
}

// Função auxiliar para salvar o troféu do campeão (para aparecer na Galeria)
async function salvarTituloCampeao(timeId: number, nomeTime: string, ano: number) {
    // Verifica se já tem o título para não duplicar
    const { data } = await supabase.from('titulos_manuais').select('id').eq('time_id', timeId).eq('ano', ano).eq('nome_campeonato', 'Campeão Geral').single();
    
    if (!data) {
        await supabase.from('titulos_manuais').insert([{
            time_id: timeId,
            nome_campeonato: 'Campeão Geral',
            ano: ano
        }]);
        revalidatePath('/campeoes');
    }
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
  const parciaisGerais = await fetchCartola('https://api.cartola.globo.com/atletas/pontuados');
  const atletasPontuados = parciaisGerais?.atletas || {};

  const jogosComParcial = await Promise.all(jogos.map(async (jogo) => {
    
    const calcularTime = async (timeId: number) => {
      const dataTime = await fetchCartola(`https://api.cartola.globo.com/time/id/${timeId}`);
      if (!dataTime || !dataTime.atletas) return 0;

      let soma = 0;
      dataTime.atletas.forEach((atleta: any) => {
          const pt = atletasPontuados[atleta.atleta_id]?.pontuacao || 0;
          soma += (atleta.atleta_id === dataTime.capitao_id) ? pt * 1.5 : pt;
      });
      return Math.floor(soma);
    }

    const [pc, pv] = await Promise.all([
        calcularTime(jogo.casa.time_id_cartola),
        calcularTime(jogo.visitante.time_id_cartola)
    ]);

    return { ...jogo, placar_casa: pc, placar_visitante: pv, is_parcial: true }
  }))
  
  return { success: true, jogos: jogosComParcial }
}

export async function recalcularTabela(id: number) { await recalcularTabelaPontosCorridos(id); return { success: true } }
export async function buscarTabela(id: number) { return buscarTabelaPontosCorridos(id) }

export async function buscarTodosRecordes() {
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

  // Retorna Top 50 ordenado
  return lista.sort((a, b) => b.pontos - a.pontos).slice(0, 50)
}

// ==============================================================================
// 8. GALERIA DE CAMPEÕES (ATUALIZADA) & TÍTULOS MANUAIS
// ==============================================================================

export async function adicionarTituloManual(timeId: number, nome: string, ano: number) {
  const { error } = await supabase.from('titulos_manuais').insert([{ time_id: timeId, nome_campeonato: nome, ano }]);
  if (!error) {
    revalidatePath('/campeoes');
    revalidatePath('/admin/titulos');
  }
  return { success: !error, msg: error ? error.message : 'Título adicionado!' };
}

export async function removerTituloManual(id: number) {
  const { error } = await supabase.from('titulos_manuais').delete().eq('id', id);
  if (!error) {
    revalidatePath('/campeoes');
    revalidatePath('/admin/titulos');
  }
  return { success: !error };
}

export async function listarTitulosManuais() {
  const { data } = await supabase.from('titulos_manuais').select('*, times(nome, escudo)').order('ano', { ascending: false });
  return data || [];
}

export async function buscarGaleriaDeTrofeus() {
  const titulosPorTime: Record<number, { nome: string, escudo: string, titulos: string[] }> = {};

  // 1. Títulos Automáticos (do Sistema)
  // MUDANÇA AQUI: Adicionado .eq('ativo', false) para pegar SÓ os finalizados
  const { data: campeonatos } = await supabase
    .from('campeonatos')
    .select('*')
    .eq('ativo', false);

  if (campeonatos) {
      for (const camp of campeonatos) {
        let campeaoId = null;
        let timeInfo = null;

        if (camp.tipo === 'pontos_corridos' || camp.tipo === 'grupos') {
            const { data: lider } = await supabase
                .from('classificacao').select('*, times(*)')
                .eq('campeonato_id', camp.id).order('pts', { ascending: false })
                .order('v', { ascending: false }).order('sg', { ascending: false })
                .limit(1).single();
            if (lider) { campeaoId = lider.time_id; timeInfo = lider.times; }
        } 
        else if (camp.tipo === 'mata_mata' || camp.tipo === 'copa') {
            // Pega o último jogo finalizado (a Final)
            const { data: ult } = await supabase
                .from('partidas').select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
                .eq('campeonato_id', camp.id).eq('status', 'finalizado').order('rodada', { ascending: false }).limit(1).single();
            if (ult) {
                 const pC = ult.placar_casa || 0; const pV = ult.placar_visitante || 0;
                 if (pC > pV) { campeaoId = ult.time_casa; timeInfo = ult.casa; }
                 else if (pV > pC) { campeaoId = ult.time_visitante; timeInfo = ult.visitante; }
            }
        }

        if (campeaoId && timeInfo) {
            if (!titulosPorTime[campeaoId]) {
                titulosPorTime[campeaoId] = { nome: timeInfo.nome, escudo: timeInfo.escudo || timeInfo.url_escudo_png, titulos: [] };
            }
            titulosPorTime[campeaoId].titulos.push(camp.nome);
        }
      }
  }

  // 2. Títulos Manuais (Externos)
  const { data: manuais } = await supabase.from('titulos_manuais').select('*, times(*)');
  if (manuais) {
    manuais.forEach((m: any) => {
        const tId = m.time_id;
        if (!m.times) return; // Segurança

        if (!titulosPorTime[tId]) {
             titulosPorTime[tId] = { 
                 nome: m.times.nome, 
                 escudo: m.times.escudo || m.times.url_escudo_png, 
                 titulos: [] 
             };
        }
        // Adiciona o título com o ano (Ex: "Libertadores (2011)")
        titulosPorTime[tId].titulos.push(`${m.nome_campeonato} (${m.ano})`);
    });
  }

  return Object.values(titulosPorTime).sort((a, b) => b.titulos.length - a.titulos.length);
}

export async function excluirCampeonato(id: number) {
  // Limpeza em cascata manual (Partidas -> Classificação -> Campeonato)
  await supabase.from('partidas').delete().eq('campeonato_id', id)
  await supabase.from('classificacao').delete().eq('campeonato_id', id)
  const { error } = await supabase.from('campeonatos').delete().eq('id', id)

  if (!error) {
    revalidatePath('/admin/ligas')
    revalidatePath('/campeonatos')
    revalidatePath('/campeoes')
  }
  return { success: !error, msg: error ? error.message : 'Liga excluída!' }
}

export async function finalizarCampeonato(id: number) {
  const supabase = createClient(); // Garanta que createClient está importado/disponível

  // 1. Busca informações do campeonato
  const { data: camp } = await supabase.from('campeonatos').select('*').eq('id', id).single();
  if (!camp) return { success: false, msg: "Campeonato não encontrado." };

  let podium: any[] = [];

  // 2. Define o Pódio baseado no tipo
  if (camp.tipo === 'pontos_corridos' || camp.tipo === 'grupos') {
      // Busca os 3 primeiros da tabela
      const { data } = await supabase.from('classificacao')
          .select('*, times(*)')
          .eq('campeonato_id', id)
          .order('pts', { ascending: false })
          .order('v', { ascending: false })
          .order('sg', { ascending: false })
          .limit(3);
      
      if (data) podium = data.map(d => d.times);
  } 
  else if (camp.tipo === 'mata_mata' || camp.tipo === 'copa') {
      // Pega o último jogo finalizado (a Grande Final)
      const { data: ult } = await supabase.from('partidas')
          .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
          .eq('campeonato_id', id)
          .eq('status', 'finalizado')
          .order('rodada', { ascending: false }) // A última rodada é a final
          .limit(1)
          .single();
      
      if (ult) {
          const pC = ult.placar_casa || 0;
          const pV = ult.placar_visitante || 0;
          // Define 1º e 2º
          if (pC > pV) { podium = [ult.casa, ult.visitante]; }
          else { podium = [ult.visitante, ult.casa]; }
      }
  }

  // 3. Marca como inativo (Finalizado)
  const { error } = await supabase.from('campeonatos').update({ ativo: false }).eq('id', id);
  
  if (!error) {
    // 4. Salva o título na Galeria automaticamente
    if (podium.length > 0 && podium[0]) {
        // Verifica se já tem o título
        const { data: temTitulo } = await supabase.from('titulos_manuais')
            .select('id')
            .eq('time_id', podium[0].id)
            .eq('nome_campeonato', camp.nome)
            .eq('ano', camp.ano)
            .single();

        if (!temTitulo) {
            await supabase.from('titulos_manuais').insert([{
                time_id: podium[0].id,
                nome_campeonato: camp.nome,
                ano: camp.ano
            }]);
        }
    }

    revalidatePath('/admin/ligas');
    revalidatePath(`/campeonatos/${id}`);
    revalidatePath('/campeoes');
    
    // Retorna o pódio para o frontend exibir a festa
    return { success: true, msg: 'Campeonato encerrado com sucesso!', podium };
  }

  return { success: !error, msg: error ? error.message : 'Erro ao finalizar.' };
}

// ==============================================================================
// 10. EXCLUSÃO DE HISTÓRICO
// ==============================================================================

export async function excluirHistorico(ano: number, tipo: 'ranking' | 'recordes') {
  let tabela = 'historico_temporadas'; // Padrão
  
  if (tipo === 'recordes') {
    tabela = 'historico_recordes';
  }

  const { error } = await supabase
    .from(tabela)
    .delete()
    .eq('ano', ano);

  if (error) {
    console.error('Erro ao excluir:', error);
    return { success: false, msg: 'Erro ao excluir histórico.' };
  }

  revalidatePath('/historico');
  revalidatePath(`/historico/${ano}`);
  
  return { success: true, msg: `${tipo === 'recordes' ? 'Recordes' : 'Ranking'} de ${ano} excluído!` };
}