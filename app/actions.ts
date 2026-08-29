'use server'

import { supabase, supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// ==============================================================================
// SEGURANÇA E BANCO DE DADOS
// ==============================================================================

// 1. Instância com superpoderes (Ignora o RLS para mutações no backend)
function getDb() {
  if (!supabaseAdmin) throw new Error("ERRO CRÍTICO: Chave de Serviço (SUPABASE_SERVICE_ROLE_KEY) não configurada.");
  return supabaseAdmin;
}

// 2. Trava de Segurança Pública (Impede que hackers chamem suas funções)
async function verificarAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session || error) {
    // console.warn("⚠️ TENTATIVA DE INVASÃO/AÇÃO NÃO AUTORIZADA: Função administrativa chamada sem sessão válida.");
    
    // NOTA: Se o seu fluxo de login não usar o padrão de sessão do Supabase,
    // adapte esta checagem para a sua lógica de autenticação. 
    // Em produção, você DEVE descomentar a linha abaixo para bloquear a execução:
    // throw new Error("Acesso negado: Administrador não autenticado.");
  }
}

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
      cache: 'no-store' 
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
        console.error(`🚨 Erro na API do Cartola (${res.status}) para a URL: ${url}`);
        return null;
    }

    // 1. Extrai a resposta como TEXTO bruto para evitar o erro de 'Unexpected end of JSON input'
    const text = await res.text();

    // 2. Se a resposta for vazia (comportamento padrão do Cartola sem parciais no momento), encerra suavemente
    if (!text || text.trim() === "") {
        return null;
    }

    // 3. Se tiver conteúdo, faz o parse com segurança
    return JSON.parse(text);

  } catch (error) {
    console.error(`🚨 Falha Crítica no fetchCartola para a URL ${url}:`, error);
    return null;
  }
}

// ==============================================================================
// 1. FUNÇÕES BÁSICAS (CRUD E STATUS)
// ==============================================================================

export async function checarStatusLiga(id: number) {
  try {
    const { data } = await supabase.from('campeonatos').select('ativo').eq('id', id).single()
    return data?.ativo ?? true
  } catch {
    return true;
  }
}

export async function buscarTimeCartola(termo: string) {
  return await fetchCartola(`https://api.cartola.globo.com/times?q=${termo}`) || []
}

export async function salvarTime(prevState: { success: boolean, msg: string }, formData: FormData) {
  try {
    await verificarAdmin();
    const db = getDb();
    
    const termo = formData.get('termo') as string;
    if (!termo) return { success: false, msg: 'O campo de busca não pode estar vazio.' };

    const resultados = await buscarTimeCartola(termo);
    if (resultados.length === 0) return { success: false, msg: `Nenhum time encontrado para o termo: "${termo}"` };

    const timeToSave = resultados[0];
    
    const { data: existe } = await db.from('times').select('id').eq('time_id_cartola', timeToSave.time_id).single();
    
    if (existe) {
      const { error } = await db.from('times').update({
          nome: timeToSave.nome,
          nome_cartola: timeToSave.nome_cartola,
          escudo: timeToSave.url_escudo_png,
          slug: timeToSave.slug
      }).eq('id', existe.id);

      if (!error) {
          revalidatePath('/admin/times');
          revalidatePath('/ranking');
          return { success: true, msg: `Dados do "${timeToSave.nome}" atualizados com sucesso!` };
      }
      return { success: false, msg: error.message };
    }
    
    const { error } = await db.from('times').insert([{
        nome: timeToSave.nome,
        nome_cartola: timeToSave.nome_cartola,
        escudo: timeToSave.url_escudo_png,
        slug: timeToSave.slug,
        time_id_cartola: timeToSave.time_id
    }]);
    
    if (!error) {
        revalidatePath('/admin/times');
        revalidatePath('/ranking');
    }
    return { success: !error, msg: error ? error.message : `Time "${timeToSave.nome}" salvo com sucesso!` };
  } catch (error: any) {
    console.error("Erro em salvarTime:", error);
    return { success: false, msg: error.message || "Erro interno ao salvar time." };
  }
}

export async function criarCampeonato(nome: string, ano: number, tipo: string, isPaga: boolean, usarDecimais: boolean) {
  try {
    await verificarAdmin();
    const db = getDb();
    
    const { error } = await db.from('campeonatos').insert([{ 
        nome, 
        ano, 
        tipo, 
        ativo: true, 
        final_unica: false, 
        is_paga: isPaga,
        usar_decimais: usarDecimais 
    }])
    
    if (!error) {
      revalidatePath('/admin/ligas')
      revalidatePath('/campeonatos')
    }
    return { success: !error, msg: error ? error.message : 'Criado!' }
  } catch (error: any) {
    console.error("Erro em criarCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function atualizarCampeonato(
  id: number, 
  nome: string, 
  ano: number, 
  tipo: string, 
  isPaga: boolean, 
  usarDecimais: boolean,
  qtdClassificados?: number,
  qtdSulamericana?: number,
  mensagemAtualizacao?: string,
  configZonas?: any // <--- AGORA O BACK-END SABE QUE ISSO EXISTE
) {
  try {
    await verificarAdmin();
    const db = getDb();

    // Monta o objeto base
    const updateData: any = { 
        nome, 
        ano, 
        tipo, 
        is_paga: isPaga,
        usar_decimais: usarDecimais 
    };

    // Só adiciona na query se eles foram enviados pelo front-end
    if (qtdClassificados !== undefined) updateData.qtd_classificados = qtdClassificados;
    if (qtdSulamericana !== undefined) updateData.qtd_sulamericana = qtdSulamericana;
    if (mensagemAtualizacao !== undefined) updateData.mensagem_atualizacao = mensagemAtualizacao;
    if (configZonas !== undefined) updateData.config_zonas = configZonas; // <--- SALVA AS CORES AQUI

    const { error } = await db.from('campeonatos').update(updateData).eq('id', id)
    
    if (!error) {
      revalidatePath('/admin/ligas')
      revalidatePath('/campeonatos')
      revalidatePath(`/campeonatos/${id}`)
    }
    return { success: !error, msg: error ? error.message : 'Campeonato atualizado!' }
  } catch (error: any) {
    console.error("Erro em atualizarCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function reabrirCampeonato(id: number) {
  try {
    await verificarAdmin();
    const db = getDb();
    
    const { error } = await db.from('campeonatos').update({ ativo: true, data_fim: null }).eq('id', id)
    if (!error) {
      revalidatePath('/admin/ligas')
      revalidatePath('/campeonatos')
      revalidatePath(`/campeonatos/${id}`)
    }
    return { success: !error, msg: error ? error.message : 'Campeonato reaberto!' }
  } catch (error: any) {
    console.error("Erro em reabrirCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function atualizarConfiguracaoLiga(campeonatoId: number, finalUnica: boolean) {
  try {
    await verificarAdmin();
    const db = getDb();
    await db.from('campeonatos').update({ final_unica: finalUnica }).eq('id', campeonatoId)
    revalidatePath(`/campeonatos/${campeonatoId}`)
    revalidatePath(`/admin/ligas/${campeonatoId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Erro em atualizarConfiguracaoLiga:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
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
  try {
    await verificarAdmin();
    const db = getDb();
    
    const { data: existe } = await db.from('classificacao').select('id').eq('campeonato_id', campeonatoId).eq('time_id', timeId).single();
    
    if (!existe) {
      const { error } = await db.from('classificacao').insert([{ 
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
  } catch (error: any) {
    console.error("Erro em adicionarTimeAoCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function removerTimeDaLiga(campeonatoId: number, timeId: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { error: erroPartidas } = await db.from('partidas')
      .delete()
      .eq('campeonato_id', campeonatoId)
      .or(`time_casa.eq.${timeId},time_visitante.eq.${timeId}`)
    
    if (erroPartidas) return { success: false, msg: erroPartidas.message }

    const { error: erroClass } = await db.from('classificacao')
      .delete()
      .eq('campeonato_id', campeonatoId)
      .eq('time_id', timeId)

    if (erroClass) return { success: false, msg: erroClass.message }
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    revalidatePath(`/admin/ligas/${campeonatoId}`)
    
    return { success: true, msg: "Time removido com sucesso!" }
  } catch (error: any) {
    console.error("Erro em removerTimeDaLiga:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function substituirTimeNaLiga(campeonatoId: number, timeAntigoId: number, timeNovoId: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    // 1. Verifica se o time novo já está na liga para evitar duplicações
    const { data: existe } = await db.from('classificacao')
      .select('id')
      .eq('campeonato_id', campeonatoId)
      .eq('time_id', timeNovoId)
      .single();
      
    if (existe) return { success: false, msg: "O time substituto já está nesta liga." };

    // 2. Transfere a vaga na classificação (Herda os pontos)
    const { error: errClass } = await db.from('classificacao')
      .update({ time_id: timeNovoId })
      .eq('campeonato_id', campeonatoId)
      .eq('time_id', timeAntigoId);
      
    if (errClass) return { success: false, msg: errClass.message };

    // 3. Transfere todas as partidas onde o time era Mandante
    await db.from('partidas')
      .update({ time_casa: timeNovoId })
      .eq('campeonato_id', campeonatoId)
      .eq('time_casa', timeAntigoId);

    // 4. Transfere todas as partidas onde o time era Visitante
    await db.from('partidas')
      .update({ time_visitante: timeNovoId })
      .eq('campeonato_id', campeonatoId)
      .eq('time_visitante', timeAntigoId);

    // 5. Recalcula a tabela para processar os novos dados
    await recalcularTabelaPontosCorridos(campeonatoId);
    
    revalidatePath(`/campeonatos/${campeonatoId}`);
    revalidatePath(`/admin/ligas/${campeonatoId}`);
    
    return { success: true, msg: "Time substituído! O novo time assumiu a vaga." };
  } catch (error: any) {
    console.error("Erro em substituirTime:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
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
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: time } = await db.from('times').select('id').eq('time_id_cartola', timeIdCartola).single()
    if (!time) return { success: false, msg: "Time não encontrado." }
    
    await db.from('classificacao').delete().eq('time_id', time.id)
    await db.from('partidas').delete().eq('time_casa', time.id)
    await db.from('partidas').delete().eq('time_visitante', time.id)
    await db.from('times').delete().eq('id', time.id)
    
    revalidatePath('/admin/times')
    return { success: true, msg: "Time excluído com sucesso!" }
  } catch (error: any) {
    console.error("Erro em removerTime:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
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
  try {
    await verificarAdmin();
    const db = getDb();

    await db.from('partidas').delete().eq('campeonato_id', campeonatoId)
    await db.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, grupo: null }).eq('campeonato_id', campeonatoId);
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    revalidatePath(`/admin/ligas/${campeonatoId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Erro em zerarJogos:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

async function atualizarJogoIndividual(jogo: any, rodadaCartola: number, usarDecimais: boolean = false) {
    if (!rodadaCartola || rodadaCartola <= 0) return;
    try {
        const db = getDb();
        const [resCasa, resVis] = await Promise.all([
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`),
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`)
        ]);

        const ptsCasa = resCasa?.pontos || 0;
        const ptsVis = resVis?.pontos || 0;

        const placarC = usarDecimais ? ptsCasa : Math.floor(ptsCasa);
        const placarV = usarDecimais ? ptsVis : Math.floor(ptsVis);

        await db.from('partidas').update({
            pontos_reais_casa: ptsCasa, 
            placar_casa: placarC,
            pontos_reais_visitante: ptsVis, 
            placar_visitante: placarV,
            status: 'finalizado'
        }).eq('id', jogo.id);
    } catch (e) { 
        console.error("Erro ao atualizar jogo individual", e); 
    }
}

export async function atualizarPlacarManual(
  partidaId: number, 
  casa: number, 
  visitante: number,
  desempateCasa?: number,
  desempateVisitante?: number
) {
  try {
    await verificarAdmin();
    const db = getDb();

    const updates: any = { 
        placar_casa: casa, 
        placar_visitante: visitante, 
        status: 'finalizado' 
    };

    if (desempateCasa !== undefined) updates.desempate_casa = desempateCasa;
    if (desempateVisitante !== undefined) updates.desempate_visitante = desempateVisitante;

    const { error } = await db.from('partidas').update(updates).eq('id', partidaId);
    if (error) return { success: false, msg: error.message };

    const { data } = await db.from('partidas')
      .select('campeonato_id, rodada, campeonato:campeonatos(tipo)')
      .eq('id', partidaId)
      .single()
    
    if (!data) return { success: true, msg: "Placar salvo (Recálculo pendente)" }

    const camp: any = data.campeonato;
    const tipo = Array.isArray(camp) ? camp[0]?.tipo : camp?.tipo;

    if (tipo === 'pontos_corridos' || (tipo === 'copa' && data.rodada <= 20)) {
        await recalcularTabelaPontosCorridos(data.campeonato_id)
    }
    
    if (tipo === 'mata-mata' || tipo === 'mata_mata' || (tipo === 'copa' && data.rodada > 20)) {
        await verificarEAvancarFase(data.campeonato_id, data.rodada);
    }

    if (tipo === 'grid') {
        await recalcularTabelaGrid(data.campeonato_id);
    }

    revalidatePath(`/campeonatos/${data.campeonato_id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Erro em atualizarPlacarManual:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

// ==============================================================================
// 4. MÓDULO: PONTOS CORRIDOS
// ==============================================================================

async function sincronizarTimesClassificacao(campeonatoId: number, timesIds: number[]) {
    try {
      const db = getDb();
      const { data: existentes } = await db.from('classificacao').select('time_id').eq('campeonato_id', campeonatoId)
      const existentesIds = existentes?.map(e => e.time_id) || []
      const faltantes = timesIds.filter(id => !existentesIds.includes(id))
      
      if (faltantes.length > 0) {
          const inserts = faltantes.map(id => ({
              campeonato_id: campeonatoId, time_id: id, pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 
          }))
          await db.from('classificacao').insert(inserts)
      }
    } catch (e) {
      console.error("Erro em sincronizarTimesClassificacao", e);
    }
}

export async function gerarJogosPontosCorridos(campeonatoId: number) {
    try {
      await verificarAdmin();
      const db = getDb();

      await zerarJogos(campeonatoId);
      const times = await listarTimesDoCampeonato(campeonatoId);
      const ids = times.map(t => t.time_id);
      
      if (ids.length < 2) return { success: false, msg: "Precisa de pelo menos 2 times." };

      await sincronizarTimesClassificacao(campeonatoId, ids);

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
          ids.splice(1, 0, ids.pop()!);
      }

      const partidasReturno = partidas.map(p => ({ ...p, rodada: p.rodada + numRodadas, time_casa: p.time_visitante, time_visitante: p.time_casa }));
      await db.from('partidas').insert([...partidas, ...partidasReturno]);
      await recalcularTabelaPontosCorridos(campeonatoId);

      revalidatePath(`/campeonatos/${campeonatoId}`)
      return { success: true, msg: "Tabela de Pontos Corridos gerada!" };
    } catch (error: any) {
      console.error("Erro em gerarJogosPontosCorridos:", error);
      return { success: false, msg: error.message || "Erro interno." };
    }
}

export async function atualizarRodadaPontosCorridos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
    try {
      await verificarAdmin();
      const db = getDb();

      const { data: partidas, error } = await db.from('partidas')
        .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*), campeonato:campeonatos(usar_decimais)')
        .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

      if (error) throw error;
      if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta rodada." };

      const p = partidas as any[];
      const usarDecimais = partidas[0].campeonato?.usar_decimais === true;

      for (const jogo of partidas) {
          await atualizarJogoIndividual(jogo, rodadaCartola, usarDecimais);
      }

      await recalcularTabelaPontosCorridos(campeonatoId);
      
      revalidatePath(`/campeonatos/${campeonatoId}`)
      return { success: true, msg: "Rodada atualizada!" };
    } catch (error: any) {
      console.error("Erro em atualizarRodadaPontosCorridos:", error);
      return { success: false, msg: error.message || "Erro interno." };
    }
}

export async function recalcularTabelaPontosCorridos(campeonatoId: number) {
  try {
    const db = getDb();
    
    await db.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }).eq('campeonato_id', campeonatoId);
    
    const { data: jogos } = await db.from('partidas').select('*').eq('campeonato_id', campeonatoId).eq('status', 'finalizado');
    const { data: times } = await db.from('classificacao').select('time_id').eq('campeonato_id', campeonatoId);
    
    if (!times) return;

    const stats: any = {};
    times.forEach((t: any) => { stats[t.time_id] = { pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }; });

    if (jogos) {
        jogos.forEach((j: any) => {
            const c = stats[j.time_casa]; const v = stats[j.time_visitante];
            
            if (c && v) {
                const pCasa = parseFloat((j.placar_casa || 0).toFixed(2));
                const pVis = parseFloat((j.placar_visitante || 0).toFixed(2));

                c.pj++; v.pj++;
                c.pp += pCasa; c.pc += pVis;
                v.pp += pVis; v.pc += pCasa;
                
                c.sp = parseFloat((c.pp - c.pc).toFixed(2)); 
                v.sp = parseFloat((v.pp - v.pc).toFixed(2));

                c.gp = c.pp; c.gc = c.pc; c.sg = c.sp;
                v.gp = v.pp; v.gc = v.pc; v.sg = v.sp;

                if (pCasa > pVis) { c.pts += 3; c.v++; v.d++; }
                else if (pVis > pCasa) { v.pts += 3; v.v++; c.d++; }
                else { c.pts += 1; v.pts += 1; c.e++; v.e++; }
            }
        });
    }

    for (const tId in stats) {
        await db.from('classificacao').update(stats[tId]).eq('campeonato_id', campeonatoId).eq('time_id', tId);
    }
  } catch (e) {
    console.error("Erro no recálculo da tabela:", e);
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

export async function gerarMataMataInteligente(campeonatoId: number, idsOrdenados: number[] = [], aleatorio: boolean = false, potes: number[][] = [], manterOrdemPotes: boolean = false) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { count } = await db
        .from('partidas')
        .select('id', { count: 'exact', head: true })
        .eq('campeonato_id', campeonatoId);
    
    if (count && count > 0) {
        return { 
            success: false, 
            msg: "Já existem partidas criadas! Use o botão 'Resetar Liga' se quiser recomeçar do zero." 
        };
    }

    const timesNoBanco = await listarTimesDoCampeonato(campeonatoId);
    if (timesNoBanco.length < 2) return { success: false, msg: "Mínimo de 2 times." };

    if (potes.length > 0) {
      if (potes.length !== 2 || potes.some(pote => pote.length === 0)) {
        return { success: false, msg: "O sorteio mata-mata precisa de dois potes preenchidos." };
      }

      const idsValidos = new Set(timesNoBanco.map(t => t.time_id));
      const todosIds = potes.flat();
      const idsUnicos = new Set(todosIds);
      if (
        idsUnicos.size !== todosIds.length ||
        todosIds.length !== timesNoBanco.length ||
        todosIds.some(id => !idsValidos.has(id)) ||
        Math.abs(potes[0].length - potes[1].length) > 1
      ) {
        return { success: false, msg: "Os potes devem conter todos os times, sem repetições, e ter tamanhos equivalentes." };
      }

      const embaralhar = (ids: number[]) => {
        const copia = [...ids];
        for (let i = copia.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
      };

      const poteA = manterOrdemPotes ? [...potes[0]] : embaralhar(potes[0]);
      const poteB = manterOrdemPotes ? [...potes[1]] : embaralhar(potes[1]);
      const partidasParaSalvar = [];
      const totalConfrontos = Math.max(poteA.length, poteB.length);

      for (let i = 0; i < totalConfrontos; i++) {
        const timeA = poteA[i] ?? null;
        const timeB = poteB[i] ?? null;
        if (timeA && timeB) {
          partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
          partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 2, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
        } else {
          const timeBye = timeA ?? timeB;
          partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeBye, time_visitante: null, placar_casa: 1, placar_visitante: 0, status: 'bye' });
        }
      }

      const { error } = await db.from('partidas').insert(partidasParaSalvar);
      if (error) return { success: false, msg: error.message };

      revalidatePath(`/campeonatos/${campeonatoId}`);
      return { success: true, msg: `Mata-Mata sorteado por potes com ${todosIds.length} times!` };
    }

    let rankingInicial: any[] = [];

    if (aleatorio) {
      rankingInicial = [...timesNoBanco].sort(() => Math.random() - 0.5).map(t => t.time_id);
    } else if (idsOrdenados.length > 0) {
      const idsValidos = new Set(timesNoBanco.map(t => t.time_id));
      const idsUnicos = new Set(idsOrdenados);
      if (idsUnicos.size !== idsOrdenados.length || idsOrdenados.some(id => !idsValidos.has(id))) {
        return { success: false, msg: "A lista do sorteio contém times inválidos ou repetidos." };
      }

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
        partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 1, time_casa: timeB, time_visitante: timeA, status: 'agendado' });
        partidasParaSalvar.push({ campeonato_id: campeonatoId, rodada: 2, time_casa: timeA, time_visitante: timeB, status: 'agendado' });
      }
    }

    const { error } = await db.from('partidas').insert(partidasParaSalvar);
    if (error) return { success: false, msg: error.message };

    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: `Mata-Mata gerado com ${numTimes} times!` };
  } catch (error: any) {
    console.error("Erro em gerarMataMataInteligente:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function atualizarRodadaMataMata(campeonatoId: number, fase: number, rodadaIda: number, rodadaVolta: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: partidas, error } = await db.from('partidas')
      .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*), campeonato:campeonatos(usar_decimais)')
      .eq('campeonato_id', campeonatoId)
      .in('rodada', [fase, fase + 1]) 
      .neq('status', 'bye')
      .order('id', { ascending: true });

    if (error) throw error;
    if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta fase." };
    
    const p = partidas as any[];
    const usarDecimais = partidas[0].campeonato?.usar_decimais === true;

    for (const jogo of partidas) {
        let r = 0;
        if (jogo.rodada === fase) r = rodadaIda;
        else if (jogo.rodada === fase + 1) r = rodadaVolta;

        if (r > 0) await atualizarJogoIndividual(jogo, r, usarDecimais); 
    }

    await verificarEAvancarFase(campeonatoId, fase);
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: `Pontos atualizados!` };
  } catch (error: any) {
    console.error("Erro em atualizarRodadaMataMata:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

async function verificarEAvancarFase(campeonatoId: number, rodadaAtual: number) {
  try {
    const db = getDb();

    const ehIda = rodadaAtual % 2 !== 0; 
    const rodadaIda = ehIda ? rodadaAtual : rodadaAtual - 1;
    const rodadaVolta = rodadaIda + 1;

    const { data: jogosFase } = await db.from('partidas')
      .select('*')
      .eq('campeonato_id', campeonatoId)
      .in('rodada', [rodadaIda, rodadaVolta]);

    if (!jogosFase || jogosFase.length === 0) return;

    const pendentes = jogosFase.filter((j: any) => j.status !== 'finalizado' && j.status !== 'bye');
    if (pendentes.length > 0) return; 

    const proximaRodada = rodadaIda + 2;
    const { data: existe } = await db.from('partidas').select('id').eq('campeonato_id', campeonatoId).eq('rodada', proximaRodada).limit(1);
    if (existe && existe.length > 0) return; 

    const classificados: number[] = [];
    const eliminados: number[] = [];

    const jogosIdaList = jogosFase.filter((j: any) => j.rodada === rodadaIda).sort((a, b) => a.id - b.id);

    for (const jogo of jogosIdaList) {
      if (jogo.status === 'bye') {
        classificados.push(jogo.time_casa);
        continue;
      }
      
      const volta = jogosFase.find((j:any) => j.rodada === rodadaVolta && (j.time_casa === jogo.time_visitante || j.time_casa === jogo.time_casa));
      
      let pA = parseFloat((jogo.placar_casa || 0).toFixed(2)); 
      let pB = parseFloat((jogo.placar_visitante || 0).toFixed(2));

      if (volta) {
         if (volta.time_casa === jogo.time_visitante) { 
             pA += (volta.placar_visitante || 0); 
             pB += (volta.placar_casa || 0); 
         } else { 
             pA += (volta.placar_casa || 0); 
             pB += (volta.placar_visitante || 0); 
         }
         pA = parseFloat(pA.toFixed(2));
         pB = parseFloat(pB.toFixed(2));
      }

      let vencedorId = null;
      let perdedorId = null;

      if (pA > pB) {
          vencedorId = jogo.time_casa;
          perdedorId = jogo.time_visitante;
      } else if (pB > pA) {
          vencedorId = jogo.time_visitante;
          perdedorId = jogo.time_casa;
      } else {
          const jogoDecisivo = volta || jogo;
          const dC = jogoDecisivo.desempate_casa;
          const dV = jogoDecisivo.desempate_visitante;

          if (dC === null || dC === undefined || dV === null || dV === undefined) {
               return; 
          }

          let penaltisA = dC; 
          let penaltisB = dV; 

          if (volta && volta.time_casa === jogo.time_visitante) {
              penaltisB = dC; 
              penaltisA = dV; 
          } else {
              penaltisA = dC;
              penaltisB = dV;
          }

          if (penaltisA > penaltisB) {
               vencedorId = jogo.time_casa;
               perdedorId = jogo.time_visitante;
          } else if (penaltisB > penaltisA) {
               vencedorId = jogo.time_visitante;
               perdedorId = jogo.time_casa;
          } else {
               return; 
          }
      }

      if (vencedorId) classificados.push(vencedorId);
      if (perdedorId) eliminados.push(perdedorId);
    }

    if (classificados.length < 2) return;

    const { data: camp } = await db.from('campeonatos').select('final_unica').eq('id', campeonatoId).single();
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

    if (ehFinal && eliminados.length === 2) {
        const time3A = eliminados[0];
        const time3B = eliminados[1];
        if (criarJogoUnico) {
            novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: time3A, time_visitante: time3B, status: 'agendado' });
        } else {
            novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada, time_casa: time3A, time_visitante: time3B, status: 'agendado' });
            novasPartidas.push({ campeonato_id: campeonatoId, rodada: proximaRodada + 1, time_casa: time3B, time_visitante: time3A, status: 'agendado' });
        }
    }

    await db.from('partidas').insert(novasPartidas);
  } catch (e) {
    console.error("Erro interno em verificarEAvancarFase:", e);
  }
}

export async function avancarFaseMataMata(campeonatoId: number, faseAtual: number) {
  try {
    await verificarAdmin();
    await verificarEAvancarFase(campeonatoId, faseAtual);
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Verificação concluída." };
  } catch (error: any) {
    console.error("Erro em avancarFaseMataMata:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

// ==============================================================================
// 6. MÓDULO: COPA
// ==============================================================================

export async function sortearGrupos(campeonatoId: number, numGrupos: number, potes: number[][], manterOrdemPotes: boolean = false) {
  try {
    await verificarAdmin();
    const db = getDb();

    if (potes.length === 0 || potes[0].length === 0) return { success: false, msg: "Potes vazios." };
    
    await db.from('classificacao').update({ grupo: null, fase_atual: 'fase_grupos' }).eq('campeonato_id', campeonatoId);
    await db.from('partidas').delete().eq('campeonato_id', campeonatoId).lte('rodada', 20); 

    const letras = ['A','B','C','D','E','F','G','H'];
    
    for (let i = 0; i < potes.length; i++) {
      const pote = manterOrdemPotes ? [...potes[i]] : [...potes[i]].sort(() => Math.random() - 0.5);
      for (let g = 0; g < numGrupos; g++) {
        if (pote[g]) {
            await db.from('classificacao').update({ grupo: letras[g] }).eq('campeonato_id', campeonatoId).eq('time_id', pote[g]);
        }
      }
    }
    
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Grupos sorteados!" };
  } catch (error: any) {
    console.error("Erro em sortearGrupos:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function gerarJogosFaseGrupos(campeonatoId: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    await db.from('partidas').delete().eq('campeonato_id', campeonatoId);
    await db.from('classificacao').update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pp: 0, pc: 0, sp: 0 }).eq('campeonato_id', campeonatoId);

    const times = await listarTimesDoCampeonato(campeonatoId);
    const letras = ['A','B','C','D','E','F','G','H'];
    const partidas = [];

    for (const letra of letras) {
      const grupo = times.filter((t:any) => t.grupo === letra).map((t:any) => t.time_id);
      if (grupo.length < 2) continue;
      
      if (grupo.length % 2 !== 0) grupo.push(-1);
      const n = grupo.length;
      const rounds = n - 1;
      const half = n / 2;

      for (let r = 0; r < rounds; r++) {
          for (let i = 0; i < half; i++) {
              const t1 = grupo[i];
              const t2 = grupo[n - 1 - i];
              if (t1 !== -1 && t2 !== -1) {
                  partidas.push({ campeonato_id: campeonatoId, rodada: r + 1, time_casa: t1, time_visitante: t2, status: 'agendado' });
                  partidas.push({ campeonato_id: campeonatoId, rodada: r + 1 + rounds, time_casa: t2, time_visitante: t1, status: 'agendado' });
              }
          }
          grupo.splice(1, 0, grupo.pop()!);
      }
    }
    const { error } = await db.from('partidas').insert(partidas);
    if (error) return { success: false, msg: error.message };
    
    await recalcularTabelaPontosCorridos(campeonatoId);
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Jogos da fase de grupos gerados!" };
  } catch (error: any) {
    console.error("Erro em gerarJogosFaseGrupos:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarPreviaRodadaGrupos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: partidas, error } = await db.from('partidas')
      .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*), campeonato:campeonatos(usar_decimais)')
      .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

    if (error) throw error;
    if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta rodada." };

    const p = partidas as any[];
    const campInfo: any = p[0].campeonato;
    const usarDecimais = Array.isArray(campInfo) ? campInfo[0]?.usar_decimais === true : campInfo?.usar_decimais === true;

    const pendentes: Record<number, { casa: string, visitante: string }> = {};

    for (const jogo of p) {
        const [resCasa, resVis] = await Promise.all([
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`),
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`)
        ]);

        const ptsCasa = resCasa?.pontos || 0;
        const ptsVis = resVis?.pontos || 0;

        const placarC = usarDecimais ? ptsCasa : Math.floor(ptsCasa);
        const placarV = usarDecimais ? ptsVis : Math.floor(ptsVis);

        pendentes[jogo.id] = { 
            casa: String(placarC), 
            visitante: String(placarV) 
        };
    }

    return { success: true, pendentes };
  } catch (error: any) {
    console.error("Erro em buscarPreviaRodadaGrupos:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function atualizarRodadaGrupos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: partidas, error } = await db.from('partidas')
      .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*), campeonato:campeonatos(usar_decimais)')
      .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

    if (error) throw error;
    if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos." };

    const p = partidas as any[];
    const usarDecimais = partidas[0].campeonato?.usar_decimais === true;

    for (const jogo of partidas) {
        await atualizarJogoIndividual(jogo, rodadaCartola, usarDecimais);
    }
    await recalcularTabelaPontosCorridos(campeonatoId);
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Rodada atualizada!" };
  } catch (error: any) {
    console.error("Erro em atualizarRodadaGrupos:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarTabelaGrupos(campeonatoId: number) {
  const { data: times } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId).not('grupo', 'is', null);
  const { data: jogos } = await supabase.from('partidas').select('*').eq('campeonato_id', campeonatoId).not('placar_casa', 'is', null); 
  if (!times) return {};

  const stats: any = {};
  times.forEach((t: any) => { stats[t.time_id] = { ...t, pts: 0, pj: 0, v: 0, e: 0, d: 0, pp: 0, pc: 0, sp: 0 }; });

  jogos?.forEach((jogo: any) => {
    if (jogo.rodada > 20) return; 
    const c = stats[jogo.time_casa]; const v = stats[jogo.time_visitante];
    if (c && v) {
      const pCasa = parseFloat((jogo.placar_casa || 0).toFixed(2));
      const pVis = parseFloat((jogo.placar_visitante || 0).toFixed(2));

      c.pj++; v.pj++;
      c.pp += pCasa; c.pc += pVis;
      v.pp += pVis; v.pc += pCasa;
      
      c.sp = parseFloat((c.pp - c.pc).toFixed(2)); 
      v.sp = parseFloat((v.pp - v.pc).toFixed(2));

      if (pCasa > pVis) { c.pts += 3; c.v++; v.d++; }
      else if (pVis > pCasa) { v.pts += 3; v.v++; c.d++; }
      else { c.pts += 1; v.pts += 1; c.e++; v.e++; }
    }
  });

  const grupos: any = {};
  Object.values(stats).forEach((time: any) => {
    if (!grupos[time.grupo]) grupos[time.grupo] = [];
    grupos[time.grupo].push(time);
  });
  
  for (const l in grupos) {
    grupos[l].sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
  }
  return grupos;
}

export async function excluirMataMata(campeonatoId: number, rodadaInicio: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { error } = await db.from('partidas').delete().eq('campeonato_id', campeonatoId).gte('rodada', rodadaInicio);
    if (error) return { success: false, msg: error.message };
    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Mata-mata limpo." };
  } catch (error: any) {
    console.error("Erro em excluirMataMata:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function gerarMataMataCopa(campeonatoId: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: jogos } = await db.from('partidas').select('rodada').eq('campeonato_id', campeonatoId);
    const rodadas = jogos?.map(j => j.rodada).filter(r => r <= 20) || [];
    const maxRodadaGrupos = rodadas.length > 0 ? Math.max(...rodadas) : 6;
    const inicioMataMata = maxRodadaGrupos + 1;

    const { count } = await db
      .from('partidas')
      .select('id', { count: 'exact', head: true })
      .eq('campeonato_id', campeonatoId)
      .gte('rodada', inicioMataMata);

    if (count && count > 0) {
      return { 
        success: false, 
        msg: "A Fase Final já foi gerada! Para recriar, use o botão de 'Limpar Mata-Mata' ou 'Resetar Liga' antes." 
      };
    }

    const grupos = await buscarTabelaGrupos(campeonatoId);
    const letras = Object.keys(grupos).sort();
    if (letras.length === 0) return { success: false, msg: "Fase de grupos vazia." };

    const pot1: any[] = []; 
    const pot2: any[] = []; 

    letras.forEach(l => {
        if (grupos[l][0]) pot1.push({ ...grupos[l][0], gp_origem: l });
        if (grupos[l][1]) pot2.push({ ...grupos[l][1], gp_origem: l });
    });

    if (pot1.length < 2) return { success: false, msg: "Times insuficientes." };

    pot1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);

    const numConfrontos = pot1.length; 
    const metadeBracket = Math.floor(numConfrontos / 2);

    const mandantes = new Array(numConfrontos).fill(null);
    const seed1 = pot1[0]; 
    const seed2 = pot1[1]; 
    const outrosCabecas = pot1.slice(2);

    mandantes[0] = seed1;                
    mandantes[metadeBracket] = seed2;   

    outrosCabecas.sort(() => Math.random() - 0.5);
    let idxOutros = 0;
    for (let i = 0; i < numConfrontos; i++) {
        if (mandantes[i] === null) {
            mandantes[i] = outrosCabecas[idxOutros];
            idxOutros++;
        }
    }

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

    if (!sucesso) return { success: false, msg: "Não foi possível gerar confrontos válidos (trava de grupos)." };

    const partidasNovas: any[] = [];
    for (let i = 0; i < numConfrontos; i++) {
        const mandante = mandantes[i];  
        const visitante = oponentes[i]; 

        partidasNovas.push({ 
            campeonato_id: campeonatoId, 
            rodada: inicioMataMata, 
            time_casa: visitante.time_id, 
            time_visitante: mandante.time_id, 
            status: 'agendado' 
        });

        partidasNovas.push({ 
            campeonato_id: campeonatoId, 
            rodada: inicioMataMata + 1, 
            time_casa: mandante.time_id, 
            time_visitante: visitante.time_id, 
            status: 'agendado' 
        });
    }

    const { error } = await db.from('partidas').insert(partidasNovas);
    if (error) return { success: false, msg: error.message };

    revalidatePath(`/campeonatos/${campeonatoId}`)
    return { success: true, msg: "Mata-mata sorteado com sucesso!" };
  } catch (error: any) {
    console.error("Erro em gerarMataMataCopa:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

// ==============================================================================
// 7. FUNÇÕES PARA HOME E RANKING
// ==============================================================================

export async function buscarRankingCompleto() {
  const { data: ligas } = await supabase.from('campeonatos').select('id').eq('tipo', 'pontos_corridos').eq('ativo', true).eq('is_paga', false)
  if (!ligas || ligas.length === 0) return []

  const idsLigas = ligas.map(l => l.id)
  const { data: participantes } = await supabase.from('classificacao').select('time_id').in('campeonato_id', idsLigas)
  if (!participantes || participantes.length === 0) return []

  const idsTimesUnicos = [...new Set(participantes.map(p => p.time_id))]
  const { data: meusTimes } = await supabase.from('times').select('*').in('id', idsTimesUnicos)
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
                  id: time.id, 
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

export async function listarAnosHistorico(tipo: 'ranking' | 'recordes' = 'ranking') {
  if (tipo === 'recordes') {
      const { data } = await supabase.from('historico_recordes').select('ano, data_salvamento, titulo').order('ano', { ascending: false });
      return data || [];
  }
  const { data } = await supabase.from('historico_temporadas').select('ano, data_salvamento').order('ano', { ascending: false });
  return data || [];
}

export async function salvarHistorico(dados: any[], ano: number, tipo: 'ranking' | 'recordes', titulo: string) {
  try {
    const db = getDb();

    if (tipo === 'recordes') {
        const { data: existe } = await db.from('historico_recordes').select('id').eq('ano', ano).single();
        if (existe) {
            await db.from('historico_recordes').update({ dados: dados, titulo: titulo, data_salvamento: new Date() }).eq('id', existe.id);
            return { success: true, msg: `Recordes de ${ano} atualizados!` };
        } else {
            await db.from('historico_recordes').insert([{ ano: ano, titulo: titulo, dados: dados }]);
            return { success: true, msg: `Recordes de ${ano} salvos!` };
        }
    } else {
        const { data: existe } = await db.from('historico_temporadas').select('id').eq('ano', ano).single();
        if (existe) {
            await db.from('historico_temporadas').update({ ranking_json: dados, data_salvamento: new Date() }).eq('id', existe.id);
            return { success: true, msg: `Ranking de ${ano} atualizado!` };
        }
        await db.from('historico_temporadas').insert([{ ano: ano, ranking_json: dados }]);
        if (dados.length > 0) {
            const campeao = dados[0];
            await salvarTituloCampeao(campeao.id, campeao.time, ano);
        }
        return { success: true, msg: `Ranking de ${ano} salvo com sucesso!` };
    }
  } catch (error: any) {
    console.error("Erro em salvarHistorico:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarHistoricoPorAno(ano: number, tipo: string = 'ranking') {
  if (tipo === 'recordes') {
    const { data } = await supabase.from('historico_recordes').select('*').eq('ano', ano).single();
    return data;
  }
  const { data } = await supabase.from('historico_temporadas').select('*').eq('ano', ano).single();
  return data;
}

export async function salvarHistoricoTemporada(rankingCompleto: any[], anoPersonalizado?: number) {
  try {
    await verificarAdmin();
    const anoSalvar = anoPersonalizado || new Date().getFullYear();
    return await salvarHistorico(rankingCompleto, anoSalvar, "ranking", "Ranking Geral");
  } catch (error: any) {
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function salvarHistoricoRecordes(recordes: any[], anoPersonalizado?: number, titulo?: string) {
  try {
    await verificarAdmin();
    const anoSalvar = anoPersonalizado || new Date().getFullYear();
    const tituloFinal = titulo || "Recordes Gerais"; 
    return await salvarHistorico(recordes, anoSalvar, "recordes", tituloFinal);
  } catch (error: any) {
    return { success: false, msg: error.message || "Erro interno." };
  }
}

async function salvarTituloCampeao(timeId: number, nomeTime: string, ano: number) {
  try {
    const db = getDb();
    const { data } = await db.from('titulos_manuais').select('id').eq('time_id', timeId).eq('nome_campeonato', 'Campeão Geral').single();
    if (!data) {
        await db.from('titulos_manuais').insert([{ time_id: timeId, nome_campeonato: 'Campeão Geral', ano: ano }]);
        revalidatePath('/campeoes');
    }
  } catch (e) { console.error("Erro interno em salvarTituloCampeao:", e); }
}

export async function buscarLigaOficial() {
  const ranking = await buscarRankingCompleto();
  return ranking.slice(0, 5);
}

export async function buscarMaioresPontuadores() {
  const { data: partidas } = await supabase.from('partidas').select(`
      rodada, pontos_reais_casa, pontos_reais_visitante,
      casa:times!partidas_time_casa_fkey(nome, escudo), visitante:times!partidas_time_visitante_fkey(nome, escudo), liga:campeonatos(nome, is_paga)
    `).eq('status', 'finalizado')

  if (!partidas) return []
  let lista: any[] = []
  partidas.forEach((j: any) => {
    if (j.liga?.is_paga) return;
    if (j.pontos_reais_casa) lista.push({ time: j.casa.nome, escudo: j.casa.escudo, pontos: j.pontos_reais_casa, rodada: j.rodada, liga: j.liga?.nome })
    if (j.pontos_reais_visitante) lista.push({ time: j.visitante.nome, escudo: j.visitante.escudo, pontos: j.pontos_reais_visitante, rodada: j.rodada, liga: j.liga?.nome })
  })
  return lista.sort((a, b) => b.pontos - a.pontos).slice(0, 5)
}

// OTIMIZADO - SEM MEMORY LEAK E SEM RATE LIMIT
export async function buscarParciaisAoVivo(jogos: any[]) {
  const ts = Date.now();
  
  // 1. Busca pontuações parciais e status dos jogos (Uma única chamada)
  const [parciaisGerais, partidasCartola] = await Promise.all([
      fetchCartola(`https://api.cartola.globo.com/atletas/pontuados?_=${ts}`),
      fetchCartola(`https://api.cartola.globo.com/partidas?_=${ts}`)
  ]);
  
  const atletasPontuados: Record<string, any> = {};
  if (parciaisGerais?.atletas) {
    Object.keys(parciaisGerais.atletas).forEach((id) => {
      atletasPontuados[String(id)] = parciaisGerais.atletas[id];
    });
  }

  const statusClubes: Record<number, number> = {};
  if (partidasCartola?.partidas) {
      partidasCartola.partidas.forEach((p: any) => {
          const status = p.status_transmissao_tr?.id || 1;
          statusClubes[p.clube_casa_id] = status;
          statusClubes[p.clube_visitante_id] = status;
      });
  }

  const jogoComecou = (clubeId: number) => {
      const status = statusClubes[clubeId];
      return status !== undefined ? status !== 1 : true; 
  };

  // 2. FUNÇÃO PURA
  const calcularTime = (dataTime: any) => {
      if (!dataTime || !dataTime.atletas) return 0;

      let luxoIdOficial = "0";

      if (dataTime.reserva_luxo_id) luxoIdOficial = String(dataTime.reserva_luxo_id);
      else if (dataTime.id_reserva_luxo) luxoIdOficial = String(dataTime.id_reserva_luxo);
      else if (dataTime.time?.reserva_luxo_id) luxoIdOficial = String(dataTime.time.reserva_luxo_id);
      else if (dataTime.reservas) {
          const reservaLuxoEncontrado = dataTime.reservas.find((r: any) => r.luxo === true || r.is_luxo === true || r.reserva_luxo === true);
          if (reservaLuxoEncontrado) {
              luxoIdOficial = String(reservaLuxoEncontrado.atleta_id);
          }
      }

      let capitaoId = String(dataTime.capitao_id || dataTime.time?.capitao_id || "0");
      
      const titulares = dataTime.atletas || [];
      const reservas = dataTime.reservas || [];

      const getPontos = (id: string) => {
          const dados = atletasPontuados[id];
          return dados ? parseFloat(dados.pontuacao) : 0.0;
      };

      const checarJogou = (id: string) => {
          return !!atletasPontuados[id];
      };

      const titularesPorPosicao: Record<number, any[]> = {};
      const reservasPorPosicao: Record<number, any[]> = {};
      
      let escalacaoFinal: any[] = [];
      let trocaLuxoRealizada = false;

      titulares.forEach((at: any) => {
        if (!titularesPorPosicao[at.posicao_id]) titularesPorPosicao[at.posicao_id] = [];
        titularesPorPosicao[at.posicao_id].push({ ...at, idStr: String(at.atleta_id) });
      });

      reservas.forEach((at: any) => {
        if (!reservasPorPosicao[at.posicao_id]) reservasPorPosicao[at.posicao_id] = [];
        reservasPorPosicao[at.posicao_id].push({ ...at, idStr: String(at.atleta_id) });
      });

      for (const posId in titularesPorPosicao) {
          let tits = titularesPorPosicao[posId];
          let res = reservasPorPosicao[posId] || [];

          res = res.map((r: any) => ({ ...r, pts: getPontos(r.idStr), jogou: checarJogou(r.idStr) }));
          res.sort((a: any, b: any) => b.pts - a.pts); 

          let houveSubstituicaoNormal = false;
          let titularesDestaPosicao = [];

          for (let i = 0; i < tits.length; i++) {
              let titular = tits[i];
              const jogou = checarJogou(titular.idStr);
              
              if (!jogou) {
                  const comecou = jogoComecou(titular.clube_id);
                  if (comecou) {
                      const reservaDisponivel = res.find((r: any) => r.jogou && !r.usado);
                      if (reservaDisponivel) {
                          reservaDisponivel.usado = true;
                          if (titular.idStr === capitaoId) capitaoId = reservaDisponivel.idStr; 
                          titularesDestaPosicao.push({ ...reservaDisponivel, ehReserva: true });
                          houveSubstituicaoNormal = true;
                      } else {
                          titularesDestaPosicao.push({ ...titular, pts: 0, jogou: false }); 
                      }
                  } else {
                      titularesDestaPosicao.push({ ...titular, pts: 0, jogou: false });
                  }
              } else {
                  titularesDestaPosicao.push({ ...titular, pts: getPontos(titular.idStr), jogou: true });
              }
          }

          // B. Reserva de Luxo AGRESSIVO
          if (!houveSubstituicaoNormal && !trocaLuxoRealizada && luxoIdOficial !== "0") {
              const reservaLuxo = res.find((r: any) => r.idStr === luxoIdOficial);

              if (reservaLuxo && reservaLuxo.jogou && !reservaLuxo.usado) {
                  // Pega APENAS os titulares que já começaram a jogar
                  const titsQueJaComecaram = titularesDestaPosicao.filter((tit: any) => jogoComecou(tit.clube_id));

                  if (titsQueJaComecaram.length > 0) {
                      const piorTitular = titsQueJaComecaram.reduce((min:any, curr:any) => curr.pts < min.pts ? curr : min, titsQueJaComecaram[0]);

                      // O Reserva tem mais pontos que o pior titular ativo?
                      if (reservaLuxo.pts > piorTitular.pts) {
                          titularesDestaPosicao = titularesDestaPosicao.map(t => {
                              if (t.idStr === piorTitular.idStr) {
                                  if (t.idStr === capitaoId) capitaoId = reservaLuxo.idStr; 
                                  return { ...reservaLuxo, ehReservaLuxo: true };
                              }
                              return t;
                          });
                          trocaLuxoRealizada = true;
                      }
                  }
              }
          }

          escalacaoFinal.push(...titularesDestaPosicao);
      }

      let somaTotal = 0;
      escalacaoFinal.forEach(at => {
          let p = at.pts || 0;
          if (at.idStr === capitaoId) {
              p = p * 1.5;
          }
          somaTotal += p;
      });

      return parseFloat(somaTotal.toFixed(2));
  };

  // 3. OTIMIZAÇÃO DE PERFORMANCE
  const mapTimes = new Map<number, number>(); 
  jogos.forEach(jogo => {
    if (jogo.casa?.time_id_cartola) mapTimes.set(jogo.casa.time_id_cartola, jogo.rodada);
    if (jogo.visitante?.time_id_cartola) mapTimes.set(jogo.visitante.time_id_cartola, jogo.rodada);
  });

  // 4. Buscar as escalações
  const escalacoesCache: Record<number, any> = {};
  await Promise.all(Array.from(mapTimes.entries()).map(async ([timeId, rodada]) => {
      let dataTime = await fetchCartola(`https://api.cartola.globo.com/time/id/${timeId}/${rodada}?_=${ts}`);
      
      if (!dataTime || !dataTime.atletas || dataTime.atletas.length === 0) {
         dataTime = await fetchCartola(`https://api.cartola.globo.com/time/id/${timeId}?_=${ts}`);
      }
      escalacoesCache[timeId] = dataTime;
  }));

  // 5. Mapear os jogos finais
  const jogosComParcial = jogos.map((jogo) => {
    const pc = calcularTime(escalacoesCache[jogo.casa.time_id_cartola]);
    const pv = calcularTime(escalacoesCache[jogo.visitante.time_id_cartola]);

    return { ...jogo, placar_casa: pc, placar_visitante: pv, is_parcial: true };
  });

  return { success: true, jogos: jogosComParcial }
}

export async function recalcularTabela(id: number) { 
  try {
    await verificarAdmin(); 
    await recalcularTabelaPontosCorridos(id); 
    return { success: true } 
  } catch (error: any) {
    console.error("Erro em recalcularTabela:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarTabela(id: number) { 
  return buscarTabelaPontosCorridos(id) 
}

export async function buscarTodosRecordes() {
  const { data: partidas } = await supabase.from('partidas').select(`
      rodada, pontos_reais_casa, pontos_reais_visitante,
      casa:times!partidas_time_casa_fkey(nome, escudo), 
      visitante:times!partidas_time_visitante_fkey(nome, escudo), 
      liga:campeonatos(nome, ativo, tipo, is_paga)
    `).eq('status', 'finalizado')

  if (!partidas) return []

  let lista: any[] = []
  
  partidas.forEach((j: any) => {
    if (j.liga?.ativo === true && j.liga?.tipo === 'pontos_corridos' && j.liga?.is_paga === false) {
        if (j.pontos_reais_casa) lista.push({ 
            time: j.casa.nome, 
            escudo: j.casa.escudo, 
            pontos: j.pontos_reais_casa, 
            rodada: j.rodada, 
            liga: j.liga?.nome 
        })
        if (j.pontos_reais_visitante) lista.push({ 
            time: j.visitante.nome, 
            escudo: j.visitante.escudo, 
            pontos: j.pontos_reais_visitante, 
            rodada: j.rodada, 
            liga: j.liga?.nome 
        })
    }
  })

  return lista.sort((a, b) => b.pontos - a.pontos).slice(0, 50)
}

export async function adicionarTituloManual(timeId: number, nome: string, ano: number) {
  try {
    await verificarAdmin();
    const db = getDb();
    
    const { error } = await db.from('titulos_manuais').insert([{ time_id: timeId, nome_campeonato: nome, ano }]);
    if (!error) { revalidatePath('/campeoes'); revalidatePath('/admin/titulos'); }
    return { success: !error, msg: error ? error.message : 'Título adicionado!' };
  } catch (error: any) {
    console.error("Erro em adicionarTituloManual:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function removerTituloManual(id: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { error } = await db.from('titulos_manuais').delete().eq('id', id);
    if (!error) { revalidatePath('/campeoes'); revalidatePath('/admin/titulos'); }
    return { success: !error };
  } catch (error: any) {
    console.error("Erro em removerTituloManual:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function listarTitulosManuais() {
  const { data } = await supabase.from('titulos_manuais').select('*, times(nome, escudo)').order('ano', { ascending: false });
  return data || [];
}

// ==============================================================================
// 8. BUSCAR GALERIA E PODIUM (CORRIGIDO PARA AGREGADOS E TIPOS MISTOS)
// ==============================================================================

export async function buscarGaleriaDeTrofeus() {
  const titulosPorTime: Record<number, { nome: string, escudo: string, titulos: string[] }> = {};
  
  // 1. PRIMEIRO: Busca títulos manuais (Fonte da Verdade)
  const { data: manuais } = await supabase.from('titulos_manuais').select('*, times(*)');
  if (manuais) {
    manuais.forEach((m: any) => {
        if (!m.times) return;
        if (!titulosPorTime[m.time_id]) titulosPorTime[m.time_id] = { nome: m.times.nome, escudo: m.times.escudo || m.times.url_escudo_png, titulos: [] };
        titulosPorTime[m.time_id].titulos.push(`${m.nome_campeonato} (${m.ano})`);
    });
  }

  // 2. SEGUNDO: Tenta calcular automático apenas para o que não é manual
  const { data: campeonatos } = await supabase.from('campeonatos').select('*').eq('ativo', false);
  
  if (campeonatos) {
      for (const camp of campeonatos) {
        // Pula se já existir título manual para este campeonato/ano
        const jaTem = manuais?.some((m:any) => m.nome_campeonato === camp.nome && m.ano === camp.ano);
        if (jaTem) continue;

        let campeaoId = null;
        let timeInfo = null;

        if (camp.tipo === 'pontos_corridos' || camp.tipo === 'grupos') {
            const { data: lider } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', camp.id).order('pts', { ascending: false }).order('v', { ascending: false }).order('sg', { ascending: false }).limit(1).single();
            if (lider) { campeaoId = lider.time_id; timeInfo = lider.times; }
        } 
        else if (camp.tipo === 'mata-mata' || camp.tipo === 'mata_mata' || camp.tipo === 'copa') {
            const podium = await buscarPodium(camp.id);
            if (podium && podium.length > 0 && podium[0]) {
                campeaoId = podium[0].id;
                timeInfo = podium[0];
            }
        }

        if (campeaoId && timeInfo) {
            if (!titulosPorTime[campeaoId]) titulosPorTime[campeaoId] = { nome: timeInfo.nome, escudo: timeInfo.escudo || timeInfo.url_escudo_png, titulos: [] };
            titulosPorTime[campeaoId].titulos.push(`${camp.nome} (${camp.ano})`);
        }
      }
  }

  return Object.values(titulosPorTime).sort((a, b) => b.titulos.length - a.titulos.length);
}

export async function excluirCampeonato(id: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    await db.from('partidas').delete().eq('campeonato_id', id)
    await db.from('classificacao').delete().eq('campeonato_id', id)
    const { error } = await db.from('campeonatos').delete().eq('id', id)
    if (!error) { revalidatePath('/admin/ligas'); revalidatePath('/campeonatos'); revalidatePath('/campeoes'); }
    return { success: !error, msg: error ? error.message : 'Liga excluída!' }
  } catch (error: any) {
    console.error("Erro em excluirCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarPodium(campeonatoId: number) {
  const { data: camp } = await supabase.from('campeonatos').select('tipo').eq('id', campeonatoId).single();
  if (!camp) return [];

  let podium: any[] = [];

  if (camp.tipo === 'pontos_corridos' || camp.tipo === 'grupos') {
      const { data } = await supabase.from('classificacao').select('*, times(*)').eq('campeonato_id', campeonatoId).order('pts', { ascending: false }).order('v', { ascending: false }).order('sg', { ascending: false }).limit(3);
      if (data) podium = data.map(d => d.times);
  } 
  else if (camp.tipo === 'mata-mata' || camp.tipo === 'mata_mata' || camp.tipo === 'copa') {
      // Busca TODOS os jogos finalizados, ordenados pela última rodada
      const { data: jogos } = await supabase.from('partidas')
          .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
          .eq('campeonato_id', campeonatoId)
          .eq('status', 'finalizado')
          .order('rodada', { ascending: false }); // Última rodada primeiro

      if (jogos && jogos.length > 0) {
          const maxRodada = jogos[0].rodada;
          const jogosFinalissimos = jogos.filter((j: any) => j.rodada === maxRodada);
          
          if (jogosFinalissimos.length > 0) {
              const jogoFinal = jogosFinalissimos[0];
              
              const jogoIda = jogos.find((j: any) => 
                  j.rodada === maxRodada - 1 && 
                  (j.time_casa === jogoFinal.time_visitante || j.time_casa === jogoFinal.time_casa)
              );

              // Calcula Agregado
              let pA = parseFloat((jogoFinal.placar_casa || 0).toFixed(2));
              let pB = parseFloat((jogoFinal.placar_visitante || 0).toFixed(2));

              if (jogoIda) {
                  if (jogoIda.time_casa === jogoFinal.time_visitante) {
                      pA += (jogoIda.placar_visitante || 0);
                      pB += (jogoIda.placar_casa || 0);
                  } else {
                      pA += (jogoIda.placar_casa || 0);
                      pB += (jogoIda.placar_visitante || 0);
                  }
              }

              let vencedor = null;
              let perdedor = null;

              if (pA > pB) {
                  vencedor = jogoFinal.casa;
                  perdedor = jogoFinal.visitante;
              } else if (pB > pA) {
                  vencedor = jogoFinal.visitante;
                  perdedor = jogoFinal.casa;
              } else {
                  // Empate no Agregado -> Checa Desempate (Pênaltis)
                  const dC = jogoFinal.desempate_casa;
                  const dV = jogoFinal.desempate_visitante;

                  if (dC !== null && dV !== null) {
                      if (dC > dV) {
                          vencedor = jogoFinal.casa;
                          perdedor = jogoFinal.visitante;
                      } else {
                          vencedor = jogoFinal.visitante;
                          perdedor = jogoFinal.casa;
                      }
                  } else {
                      vencedor = jogoFinal.casa; 
                      perdedor = jogoFinal.visitante;
                  }
              }

              podium = [vencedor, perdedor];
              
              if (jogosFinalissimos.length > 1) {
                   const jogoDisp3 = jogosFinalissimos[1];
                   // Lógica simplificada para 3º lugar
                   let p3A = jogoDisp3.placar_casa || 0;
                   let p3B = jogoDisp3.placar_visitante || 0;
                   if (p3A > p3B) podium[2] = jogoDisp3.casa;
                   else podium[2] = jogoDisp3.visitante;
              }
          }
      }
  }
  return podium;
}

export async function finalizarCampeonato(id: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: camp } = await db.from('campeonatos').select('*').eq('id', id).single();
    if (!camp) return { success: false, msg: "Campeonato não encontrado." };

    const podium = await buscarPodium(id);

    const { error } = await db.from('campeonatos').update({ ativo: false, data_fim: new Date().toISOString() }).eq('id', id);
    
    if (!error) {
      if (podium && podium.length > 0 && podium[0]) {
          // Verifica se já tem título para não duplicar
          const { data: temTitulo } = await db.from('titulos_manuais')
              .select('id')
              .eq('time_id', podium[0].id)
              .eq('nome_campeonato', camp.nome)
              .eq('ano', camp.ano)
              .single();
              
          if (!temTitulo) {
              await db.from('titulos_manuais').insert([{ 
                  time_id: podium[0].id, 
                  nome_campeonato: camp.nome, 
                  ano: camp.ano 
              }]);
          }
      }
      revalidatePath('/admin/ligas'); revalidatePath(`/campeonatos/${id}`); revalidatePath('/campeoes');
      return { success: true, msg: 'Campeonato encerrado com sucesso!', podium };
    }
    return { success: !error, msg: error ? error.message : 'Erro ao finalizar.' };
  } catch (error: any) {
    console.error("Erro em finalizarCampeonato:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function excluirHistorico(ano: number, tipo: 'ranking' | 'recordes') {
  try {
    await verificarAdmin();
    const db = getDb();

    let tabela = 'historico_temporadas';
    if (tipo === 'recordes') tabela = 'historico_recordes';
    const { error } = await db.from(tabela).delete().eq('ano', ano);
    if (error) return { success: false, msg: 'Erro ao excluir histórico.' };
    revalidatePath('/historico'); revalidatePath(`/historico/${ano}`);
    return { success: true, msg: `${tipo === 'recordes' ? 'Recordes' : 'Ranking'} de ${ano} excluído!` };
  } catch (error: any) {
    console.error("Erro em excluirHistorico:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function salvarRecordes(ano: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const ranking = await buscarRankingCompleto();
    const maiorPontuador = ranking.length > 0 ? ranking[0] : null;

    const recordesRodada = await buscarTodosRecordes();
    const mitoRodada = recordesRodada.length > 0 ? recordesRodada[0] : null;

    if (!maiorPontuador && !mitoRodada) {
        return { success: false, msg: 'Nenhum dado encontrado para salvar.' };
    }

    const recordesParaSalvar = [];

    if (maiorPontuador) {
        recordesParaSalvar.push({
            ano: ano,
            titulo: 'Maior Pontuador',
            time_nome: maiorPontuador.time,
            valor: maiorPontuador.pontos,
            tipo: 'pontuacao'
        });
    }

    if (mitoRodada) {
        recordesParaSalvar.push({
            ano: ano,
            titulo: 'Mito da Rodada',
            time_nome: mitoRodada.time,
            valor: mitoRodada.pontos,
            tipo: 'rodada',
            detalhe: `Rodada ${mitoRodada.rodada}`
        });
    }

    const { error } = await db
      .from('historico_recordes')
      .upsert(recordesParaSalvar, { onConflict: 'ano, titulo' });

    if (error) throw error;

    revalidatePath('/recordes');
    revalidatePath('/historico');
    
    return { success: true, msg: 'Recordes salvos com sucesso!' };

  } catch (error: any) {
    console.error(error);
    return { success: false, msg: 'Erro ao salvar: ' + error.message };
  }
}

export async function salvarRankingAtual(ano: number) {
    try {
        await verificarAdmin();
        const ranking = await buscarRankingCompleto();
        
        if (!ranking || ranking.length === 0) {
            return { success: false, msg: "Erro: O ranking está vazio ou não pôde ser carregado." };
        }

        return await salvarHistorico(ranking, ano, "ranking", "Ranking Geral");

    } catch (error: any) {
        console.error("Erro ao salvar ranking:", error);
        return { success: false, msg: error.message || "Falha interna ao salvar ranking." };
    }
}

export async function atualizarTodosDadosTimes() {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: times } = await db.from('times').select('id, time_id_cartola, nome');
    
    if (!times || times.length === 0) {
      return { success: false, msg: "Nenhum time encontrado no banco de dados." };
    }

    let sucesso = 0;
    let falha = 0;

    for (const time of times) {
      try {
        const respostaApi = await fetchCartola(`https://api.cartola.globo.com/time/id/${time.time_id_cartola}`);
        const dadosReais = respostaApi?.time; 

        if (dadosReais && dadosReais.time_id) {
          await db.from('times').update({
            nome: dadosReais.nome,
            nome_cartola: dadosReais.nome_cartola,
            escudo: dadosReais.url_escudo_png,
            slug: dadosReais.slug 
          }).eq('id', time.id);
          
          sucesso++;
        } else {
          falha++;
        }
      } catch (error) {
        falha++;
      }
    }

    revalidatePath('/admin/times');
    revalidatePath('/ranking');

    return { 
      success: true, 
      msg: `Atualização concluída! ${sucesso} times atualizados, ${falha} falhas.` 
    };
  } catch (error: any) {
    console.error("Erro em atualizarTodosDadosTimes:", error);
    return { success: false, msg: error.message || "Erro interno ao atualizar times." };
  }
}

export async function salvarTimePorId(timeId: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const dados = await fetchCartola(`https://api.cartola.globo.com/time/id/${timeId}`);
    const timeToSave = dados?.time;

    if (!timeToSave) return { success: false, msg: 'Erro: Time não encontrado na API do Cartola.' };

    const { data: existe } = await db.from('times').select('id').eq('time_id_cartola', timeToSave.time_id).single();

    let timeSalvo;

    if (existe) {
        const { data, error } = await db.from('times').update({
            nome: timeToSave.nome,
            nome_cartola: timeToSave.nome_cartola,
            escudo: timeToSave.url_escudo_png,
            slug: timeToSave.slug
        }).eq('id', existe.id).select().single();

        if (error) return { success: false, msg: error.message };
        timeSalvo = data;
    } else {
        const { data, error } = await db.from('times').insert([{
            nome: timeToSave.nome,
            nome_cartola: timeToSave.nome_cartola,
            escudo: timeToSave.url_escudo_png,
            slug: timeToSave.slug,
            time_id_cartola: timeToSave.time_id
        }]).select().single();

        if (error) return { success: false, msg: error.message };
        timeSalvo = data;
    }

    revalidatePath('/admin/times');
    revalidatePath('/ranking');
    
    return { success: true, msg: `Time "${timeToSave.nome}" salvo com sucesso!`, time: timeSalvo };

  } catch (error: any) {
    console.error("Erro em salvarTimePorId:", error);
    return { success: false, msg: "Erro interno: " + error.message };
  }
}

// ==============================================================================
// 9. MÓDULO: GRID (RANKING GERAL)
// ==============================================================================

export async function atualizarRodadaGrid(campeonatoId: number, rodadaCartola: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const times = await listarTimesDoCampeonato(campeonatoId);
    if (!times || times.length === 0) return { success: false, msg: "Nenhum time na liga." };

    const { data: camp } = await db.from('campeonatos').select('usar_decimais').eq('id', campeonatoId).single();
    const usarDecimais = camp?.usar_decimais === true;

    for (const t of times) {
        try {
            const dados = await fetchCartola(`https://api.cartola.globo.com/time/id/${t.times.time_id_cartola}/${rodadaCartola}`);
            const pontosReais = dados?.pontos || 0;
            const pontosSalvar = usarDecimais ? pontosReais : Math.floor(pontosReais);

            const { data: existente } = await db.from('partidas')
                .select('id')
                .eq('campeonato_id', campeonatoId)
                .eq('rodada', rodadaCartola)
                .eq('time_casa', t.time_id)
                .single();

            if (existente) {
                await db.from('partidas').update({
                    placar_casa: pontosSalvar,
                    pontos_reais_casa: pontosReais,
                    status: 'finalizado'
                }).eq('id', existente.id);
            } else {
                await db.from('partidas').insert([{
                    campeonato_id: campeonatoId,
                    rodada: rodadaCartola,
                    time_casa: t.time_id,
                    time_visitante: null,
                    placar_casa: pontosSalvar,
                    pontos_reais_casa: pontosReais,
                    status: 'finalizado'
                }]);
            }
        } catch (e) {
            console.error(`Erro ao atualizar time ${t.times.nome}`, e);
        }
    }

    await recalcularTabelaGrid(campeonatoId);
    revalidatePath(`/campeonatos/${campeonatoId}`);
    return { success: true, msg: "Grid atualizado com sucesso!" };
  } catch (error: any) {
    console.error("Erro em atualizarRodadaGrid:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function recalcularTabelaGrid(campeonatoId: number) {
  try {
    const db = getDb();

    // 1. Zera a pontuação atual de todos os times da liga
    await db.from('classificacao')
        .update({ pts: 0, pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 })
        .eq('campeonato_id', campeonatoId);

    // 2. Busca todas as pontuações de partidas já realizadas
    const { data: registros } = await db.from('partidas')
        .select('time_casa, placar_casa')
        .eq('campeonato_id', campeonatoId)
        .not('placar_casa', 'is', null); // Garante que não pega nulos

    if (!registros || registros.length === 0) return;

    const stats: any = {};

    // 3. Soma os pontos rodada a rodada com precisão decimal
    registros.forEach((reg: any) => {
        if (!stats[reg.time_casa]) {
            stats[reg.time_casa] = { pts: 0, pj: 0 }; 
        }
        
        // Garante que a string ou número vire float com 2 casas
        const pRodada = parseFloat(Number(reg.placar_casa).toFixed(2));
        
        // Soma acumulativa
        const somaAtual = stats[reg.time_casa].pts + pRodada;
        
        // Salva com 2 casas fixas para evitar 30.000000004
        stats[reg.time_casa].pts = parseFloat(somaAtual.toFixed(2)); 
        stats[reg.time_casa].pj += 1; 
    });

    // 4. Salva o total calculado na tabela de classificação
    for (const timeId in stats) {
        await db.from('classificacao')
            .update({ 
                pts: stats[timeId].pts, 
                pj: stats[timeId].pj    
            })
            .eq('campeonato_id', campeonatoId)
            .eq('time_id', timeId);
    }
  } catch (e) {
    console.error("Erro interno em recalcularTabelaGrid:", e);
  }
}

export async function buscarTabelaGrid(campeonatoId: number) {
    const { data: ranking } = await supabase.from('classificacao')
        .select('*, times(*)')
        .eq('campeonato_id', campeonatoId)
        .order('pts', { ascending: false });

    if (!ranking) return { ranking: [], rodadas: [] };

    const { data: historico } = await supabase.from('partidas')
        .select('rodada, time_casa, placar_casa')
        .eq('campeonato_id', campeonatoId)
        .eq('status', 'finalizado')
        .order('rodada', { ascending: true });

    const rodadasSet = new Set<number>();
    const pontuacoesPorTime: any = {};

    historico?.forEach((h: any) => {
        rodadasSet.add(h.rodada);
        if (!pontuacoesPorTime[h.time_casa]) pontuacoesPorTime[h.time_casa] = {};
        pontuacoesPorTime[h.time_casa][h.rodada] = h.placar_casa;
    });

    const rodadasOrdenadas = Array.from(rodadasSet).sort((a, b) => a - b);

    const rankingCompleto = ranking.map((item: any) => ({
        ...item,
        historico: pontuacoesPorTime[item.time_id] || {}
    }));

    return { ranking: rankingCompleto, rodadas: rodadasOrdenadas };
}

// ==============================================================================
// 10. MÓDULO: PARCIAIS GRID (OTIMIZADO - SEM MEMORY LEAK E SEM RATE LIMIT)
// ==============================================================================

export async function buscarParciaisGrid(campeonatoId: number) {
  const times = await listarTimesDoCampeonato(campeonatoId);
  if (!times || times.length === 0) return { success: false, msg: "Nenhum time na liga." };

  const ts = Date.now();
  
  const [parciaisGerais, partidasCartola] = await Promise.all([
      fetchCartola(`https://api.cartola.globo.com/atletas/pontuados?_=${ts}`),
      fetchCartola(`https://api.cartola.globo.com/partidas?_=${ts}`)
  ]);

  const atletasPontuados: Record<string, any> = {};
  if (parciaisGerais?.atletas) {
    Object.keys(parciaisGerais.atletas).forEach((id) => {
      atletasPontuados[String(id)] = parciaisGerais.atletas[id];
    });
  }

  const statusClubes: Record<number, number> = {};
  if (partidasCartola?.partidas) {
      partidasCartola.partidas.forEach((p: any) => {
          const status = p.status_transmissao_tr?.id || 1;
          statusClubes[p.clube_casa_id] = status;
          statusClubes[p.clube_visitante_id] = status;
      });
  }

  const jogoComecou = (clubeId: number) => {
      const status = statusClubes[clubeId];
      return status !== undefined ? status !== 1 : true;
  };

  // FUNÇÃO PURA: Fora do loop para evitar recriação na memória.
  const calcularTime = (dataTime: any) => {
      if (!dataTime || !dataTime.atletas) return 0;

      let luxoIdOficial = "0";
      if (dataTime.reserva_luxo_id) luxoIdOficial = String(dataTime.reserva_luxo_id);
      else if (dataTime.time?.reserva_luxo_id) luxoIdOficial = String(dataTime.time.reserva_luxo_id);

      let capitaoId = String(dataTime.capitao_id || dataTime.time?.capitao_id || "0");
      
      const titulares = dataTime.atletas || [];
      const reservas = dataTime.reservas || [];

      const getPontos = (id: string) => {
          const dados = atletasPontuados[id];
          return dados ? parseFloat(dados.pontuacao) : 0.0;
      };
      const checarJogou = (id: string) => !!atletasPontuados[id];

      const titularesPorPosicao: Record<number, any[]> = {};
      const reservasPorPosicao: Record<number, any[]> = {};
      
      titulares.forEach((at: any) => {
        if (!titularesPorPosicao[at.posicao_id]) titularesPorPosicao[at.posicao_id] = [];
        titularesPorPosicao[at.posicao_id].push({ ...at, idStr: String(at.atleta_id) });
      });
      reservas.forEach((at: any) => {
        if (!reservasPorPosicao[at.posicao_id]) reservasPorPosicao[at.posicao_id] = [];
        reservasPorPosicao[at.posicao_id].push({ ...at, idStr: String(at.atleta_id) });
      });

      let escalacaoFinal: any[] = [];
      let trocaLuxoRealizada = false;

      for (const posId in titularesPorPosicao) {
          let tits = titularesPorPosicao[posId];
          let res = reservasPorPosicao[posId] || [];
          res = res.map((r: any) => ({ ...r, pts: getPontos(r.idStr), jogou: checarJogou(r.idStr) }));
          res.sort((a: any, b: any) => b.pts - a.pts); 

          let houveSubstituicaoNormal = false;
          let titularesDestaPosicao = [];

          for (let i = 0; i < tits.length; i++) {
              let titular = tits[i];
              const jogou = checarJogou(titular.idStr);
              if (!jogou) {
                  const comecou = jogoComecou(titular.clube_id);
                  if (comecou) {
                      const reservaDisponivel = res.find((r: any) => r.jogou && !r.usado);
                      if (reservaDisponivel) {
                          reservaDisponivel.usado = true;
                          if (titular.idStr === capitaoId) capitaoId = reservaDisponivel.idStr; 
                          titularesDestaPosicao.push({ ...reservaDisponivel });
                          houveSubstituicaoNormal = true;
                      } else {
                          titularesDestaPosicao.push({ ...titular, pts: 0 }); 
                      }
                  } else {
                      titularesDestaPosicao.push({ ...titular, pts: 0 });
                  }
              } else {
                  titularesDestaPosicao.push({ ...titular, pts: getPontos(titular.idStr) });
              }
          }

          if (!houveSubstituicaoNormal && !trocaLuxoRealizada && luxoIdOficial !== "0") {
              const reservaLuxo = res.find((r: any) => r.idStr === luxoIdOficial);
              if (reservaLuxo && reservaLuxo.jogou && !reservaLuxo.usado) {
                  const piorTitular = titularesDestaPosicao.reduce((min:any, curr:any) => curr.pts < min.pts ? curr : min, titularesDestaPosicao[0]);
                  if (reservaLuxo.pts > piorTitular.pts) {
                      titularesDestaPosicao = titularesDestaPosicao.map(t => {
                          if (t.idStr === piorTitular.idStr) {
                              if (t.idStr === capitaoId) capitaoId = reservaLuxo.idStr; 
                              return { ...reservaLuxo };
                          }
                          return t;
                      });
                      trocaLuxoRealizada = true;
                  }
              }
          }
          escalacaoFinal.push(...titularesDestaPosicao);
      }

      let somaTotal = 0;
      escalacaoFinal.forEach(at => {
          let p = getPontos(at.idStr || String(at.atleta_id));
          if ((at.idStr || String(at.atleta_id)) === capitaoId) p = p * 1.5;
          somaTotal += p;
      });

      return parseFloat(somaTotal.toFixed(2));
  };

  // OTIMIZAÇÃO: Busca todas as escalações de forma paralela
  const escalacoesCache: Record<number, any> = {};
  await Promise.all(times.map(async (t: any) => {
      const timeId = t.times.time_id_cartola;
      let dataTime = await fetchCartola(`https://api.cartola.globo.com/time/id/${timeId}?_=${ts}`);
      escalacoesCache[timeId] = dataTime;
  }));

  // Mapeamento super rápido na memória local
  const resultados = times.map((t: any) => {
      const timeId = t.times.time_id_cartola;
      const dataTime = escalacoesCache[timeId];
      const parcialCalculada = calcularTime(dataTime);
      return { time_id: t.time_id, parcial: parcialCalculada };
  });

  return { success: true, parciais: resultados };
}

export async function buscarPreviaRodadaPontosCorridos(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  try {
    await verificarAdmin();
    const db = getDb();

    const { data: partidas, error } = await db.from('partidas')
      .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*), campeonato:campeonatos(usar_decimais)')
      .eq('campeonato_id', campeonatoId).eq('rodada', rodadaLiga).order('id');

    if (error) throw error;
    if (!partidas || partidas.length === 0) return { success: false, msg: "Sem jogos nesta rodada." };

    const p = partidas as any[];
    const campInfo: any = p[0].campeonato;
    const usarDecimais = Array.isArray(campInfo) ? campInfo[0]?.usar_decimais === true : campInfo?.usar_decimais === true;

    const pendentes: Record<number, { casa: string, visitante: string }> = {};

    for (const jogo of p) {
        const [resCasa, resVis] = await Promise.all([
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`),
            fetchCartola(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`)
        ]);

        // Pega a pontuação oficial já calculada pelo Cartola
        const ptsCasa = resCasa?.pontos || 0;
        const ptsVis = resVis?.pontos || 0;

        const placarC = usarDecimais ? ptsCasa : Math.floor(ptsCasa);
        const placarV = usarDecimais ? ptsVis : Math.floor(ptsVis);

        pendentes[jogo.id] = { 
            casa: String(placarC), 
            visitante: String(placarV) 
        };
    }

    return { success: true, pendentes };
  } catch (error: any) {
    console.error("Erro em buscarPrevia:", error);
    return { success: false, msg: error.message || "Erro interno." };
  }
}

export async function buscarDetalhesConfrontoAoVivo(timeCasaIdCartola: number, timeVisIdCartola: number, rodada?: number) {
  try {
      const tsNow = Date.now();
      
      // 1. Identificar Rodada Atual
      const statusMercadoRes = await fetchCartola(`https://api.cartola.globo.com/mercado/status?_=${tsNow}`);
      const rodadaAtualMercado = statusMercadoRes?.rodada_atual || 1;
      
      const isRodadaPassada = rodada !== undefined && rodada < rodadaAtualMercado;

      const urlCasa = rodada ? `https://api.cartola.globo.com/time/id/${timeCasaIdCartola}/${rodada}` : `https://api.cartola.globo.com/time/id/${timeCasaIdCartola}`;
      const urlVis = rodada ? `https://api.cartola.globo.com/time/id/${timeVisIdCartola}/${rodada}` : `https://api.cartola.globo.com/time/id/${timeVisIdCartola}`;

      const urlSubCasa = isRodadaPassada ? `https://api.cartola.globo.com/time/substituicoes/${timeCasaIdCartola}/${rodada}` : null;
      const urlSubVis = isRodadaPassada ? `https://api.cartola.globo.com/time/substituicoes/${timeVisIdCartola}/${rodada}` : null;

      // 2. Busca paralela inteligente
      const [parciais, timeCasa, timeVis, partidasCartola, subsCasa, subsVis] = await Promise.all([
          isRodadaPassada ? Promise.resolve(null) : fetchCartola(`https://api.cartola.globo.com/atletas/pontuados?_=${tsNow}`),
          fetchCartola(`${urlCasa}?_=${tsNow}`),
          fetchCartola(`${urlVis}?_=${tsNow}`),
          fetchCartola(`https://api.cartola.globo.com/partidas?_=${tsNow}`),
          urlSubCasa ? fetchCartola(`${urlSubCasa}?_=${tsNow}`).catch(() => ([])) : Promise.resolve([]),
          urlSubVis ? fetchCartola(`${urlSubVis}?_=${tsNow}`).catch(() => ([])) : Promise.resolve([])
      ]);

      // Mapa de Status de Partidas 
      const statusClubes: Record<number, boolean> = {};
      if (partidasCartola?.partidas) {
          partidasCartola.partidas.forEach((p: any) => {
              const s1 = p.status_partida_id;
              const s2 = p.status_transmissao_tr?.id;
              if ((s1 && s1 !== 1) || (s2 && s2 !== 1)) {
                  statusClubes[p.clube_casa_id] = true;
                  statusClubes[p.clube_visitante_id] = true;
              }
          });
      }
      
      const jogoComecou = (clubeId: number, atletaJogou: boolean) => {
          if (isRodadaPassada) return true;
          if (atletaJogou) return true;
          return !!statusClubes[clubeId];
      };

      // Engine de Processamento de Escalação
      const processarEscalacao = (dataTime: any, subsDaAPI: any) => {
          if (!dataTime || !dataTime.atletas) return { titulares: [], reservas: [], pontosTime: 0, substituicoes: [] };

          const arraySubstituicoes = Array.isArray(subsDaAPI) ? subsDaAPI : (subsDaAPI?.substituicoes || []);

          let luxoIdOficial = "0";
          if (dataTime.reserva_luxo_id) luxoIdOficial = String(dataTime.reserva_luxo_id);
          else if (dataTime.id_reserva_luxo) luxoIdOficial = String(dataTime.id_reserva_luxo);
          else if (dataTime.time?.reserva_luxo_id) luxoIdOficial = String(dataTime.time.reserva_luxo_id);
          else if (dataTime.reservas) {
              const resLuxo = dataTime.reservas.find((r: any) => r.luxo === true || r.is_luxo === true || r.reserva_luxo === true);
              if (resLuxo) luxoIdOficial = String(resLuxo.atleta_id);
          }

          const capitaoId = String(dataTime.capitao_id || dataTime.time?.capitao_id || "0");

          const getPontos = (id: string, ptsFechados?: number) => {
             if (isRodadaPassada) return ptsFechados || 0;
             return parciais?.atletas?.[id] ? parseFloat(parciais.atletas[id].pontuacao) : 0;
          };
          
          const checarJogou = (id: string, ptsFechados?: number) => {
             if (isRodadaPassada) return (ptsFechados !== undefined && ptsFechados !== 0) || arraySubstituicoes.some((s:any) => String(s.entrou?.atleta_id || s.entrou?.id || s.entrou) === id);
             return !!parciais?.atletas?.[id];
          };

          const formatPlayer = (at: any) => ({
              id: String(at.atleta_id),
              nome: at.apelido,
              foto: at.foto ? at.foto.replace('FORMATO', '140x140') : '/user-placeholder.png',
              posicao: dataTime.posicoes?.[at.posicao_id]?.abreviacao || '-',
              posicao_id: at.posicao_id,
              clube_id: at.clube_id,
              pontos: getPontos(String(at.atleta_id), at.pontos_num),
              jogou: checarJogou(String(at.atleta_id), at.pontos_num),
              isCapitao: String(at.atleta_id) === capitaoId,
              isLuxo: String(at.atleta_id) === luxoIdOficial,
              substituidoPor: null as any,
              usado: false
          });

          const titulares = dataTime.atletas.map(formatPlayer);
          const reservas = (dataTime.reservas || []).map(formatPlayer);

          let capitaoRealId = capitaoId;
          let somaTotal = 0;
          const escalacaoFinalVisual: any[] = [];

          if (isRodadaPassada) {
             titulares.forEach((t: any) => {
                 const pFechado = t.pontos;
                 t.pontosCalculados = pFechado;
                 if (t.isCapitao) t.pontos = pFechado / 1.5;
                 somaTotal += pFechado;
             });

             titulares.sort((a: any, b: any) => a.posicao_id - b.posicao_id);
             reservas.sort((a: any, b: any) => a.posicao_id - b.posicao_id);
             
             return { 
                 titulares: titulares, 
                 reservas: reservas, 
                 pontosTime: dataTime.pontos || parseFloat(somaTotal.toFixed(2)),
                 substituicoes: arraySubstituicoes 
             };
          }

          // MOTOR AO VIVO
          const titsByPos: Record<number, any[]> = {};
          const resByPos: Record<number, any[]> = {};
          
          titulares.forEach((t: any) => { if (!titsByPos[t.posicao_id]) titsByPos[t.posicao_id] = []; titsByPos[t.posicao_id].push(t); });
          reservas.forEach((r: any) => { if (!resByPos[r.posicao_id]) resByPos[r.posicao_id] = []; resByPos[r.posicao_id].push(r); });

          // A. Substituição Normal
          for (const posId in titsByPos) {
              const res = resByPos[posId] || [];
              
              for (let i = 0; i < titsByPos[posId].length; i++) {
                  const titular = titsByPos[posId][i];
                  if (!titular.jogou && jogoComecou(titular.clube_id, titular.jogou)) {
                      const rDisponivel = res.find((r: any) => r.jogou && !r.usado);
                      if (rDisponivel) {
                          rDisponivel.usado = true;
                          if (titular.id === capitaoRealId) capitaoRealId = rDisponivel.id;
                          titular.substituidoPor = { ...rDisponivel };
                      }
                  }
              }
          }

          // B. Reserva de Luxo AGRESSIVO
          if (luxoIdOficial !== "0") {
              const rLuxo = reservas.find((r: any) => r.id === luxoIdOficial);
              if (rLuxo && rLuxo.jogou && !rLuxo.usado) {
                  const titsDaMesmaPosicao = titsByPos[rLuxo.posicao_id] || [];
                  
                  // Pega apenas os titulares da posição que JÁ COMEÇARAM a jogar
                  const titsQueJaComecaram = titsDaMesmaPosicao.filter((tit: any) => jogoComecou(tit.clube_id, tit.jogou));

                  if (titsQueJaComecaram.length > 0) {
                      let piorTitular = titsQueJaComecaram[0];
                      let menorPts = piorTitular.substituidoPor ? piorTitular.substituidoPor.pontos : piorTitular.pontos;

                      for (let i = 1; i < titsQueJaComecaram.length; i++) {
                          const tit = titsQueJaComecaram[i];
                          const ptsSlot = tit.substituidoPor ? tit.substituidoPor.pontos : tit.pontos;
                          if (ptsSlot < menorPts) {
                              menorPts = ptsSlot;
                              piorTitular = tit;
                          }
                      }

                      // Troca Imediata se o reserva tiver mais pontos
                      if (rLuxo.pontos > menorPts) {
                          rLuxo.usado = true;
                          if (piorTitular.id === capitaoRealId || (piorTitular.substituidoPor && piorTitular.substituidoPor.id === capitaoRealId)) {
                              capitaoRealId = rLuxo.id;
                          }
                          piorTitular.substituidoPor = { ...rLuxo, isLuxoEntry: true };
                      }
                  }
              }
          }

          for (const posId in titsByPos) {
              escalacaoFinalVisual.push(...titsByPos[posId]);
          }

          escalacaoFinalVisual.forEach((t: any) => {
              const jogadorAtivo = t.substituidoPor ? t.substituidoPor : t;
              jogadorAtivo.isCapitao = jogadorAtivo.id === capitaoRealId;
              
              const pRaw = jogadorAtivo.pontos; 
              let pFinal = pRaw;
              
              if (jogadorAtivo.isCapitao) pFinal = pRaw * 1.5;
              somaTotal += pFinal;
              
              if (t.substituidoPor) {
                  t.substituidoPor.isCapitao = jogadorAtivo.isCapitao;
                  t.substituidoPor.pontosCalculados = pFinal;
                  t.substituidoPor.pontos = pRaw; 
              } else {
                  t.isCapitao = jogadorAtivo.isCapitao;
                  t.pontosCalculados = pFinal;
                  t.pontos = pRaw; 
              }
          });

          escalacaoFinalVisual.sort((a: any, b: any) => a.posicao_id - b.posicao_id);
          reservas.sort((a: any, b: any) => a.posicao_id - b.posicao_id);

          return { 
              titulares: escalacaoFinalVisual, 
              reservas: reservas, 
              pontosTime: parseFloat(somaTotal.toFixed(2)),
              substituicoes: arraySubstituicoes
          };
      };

      const dadosCasa = processarEscalacao(timeCasa, subsCasa);
      const dadosVis = processarEscalacao(timeVis, subsVis);

      return {
          success: true,
          casa: {
              nome: timeCasa?.time?.nome || 'Mandante',
              escudo: timeCasa?.time?.url_escudo_png || '/shield-placeholder.png',
              pontos: dadosCasa.pontosTime,
              titulares: dadosCasa.titulares,
              reservas: dadosCasa.reservas,
              substituicoes: dadosCasa.substituicoes
          },
          visitante: {
              nome: timeVis?.time?.nome || 'Visitante',
              escudo: timeVis?.time?.url_escudo_png || '/shield-placeholder.png',
              pontos: dadosVis.pontosTime,
              titulares: dadosVis.titulares,
              reservas: dadosVis.reservas,
              substituicoes: dadosVis.substituicoes
          }
      };
  } catch (error: any) {
      console.error("Erro ao buscar detalhes do confronto:", error);
      return { success: false, msg: "Falha ao carregar escalações." };
  }
}
