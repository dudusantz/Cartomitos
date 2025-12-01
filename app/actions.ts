'use server'

import { supabase } from "@/lib/supabase"

// 1. Função que busca na API do Cartola (Rodando no servidor para evitar bloqueio)
export async function buscarTimeCartola(termo: string) {
  const res = await fetch(`https://api.cartola.globo.com/times?q=${termo}`)
  const data = await res.json()
  return data
}

// 2. Função que salva o time no seu Supabase
export async function salvarTime(time: any) {
  const { data, error } = await supabase
    .from('times')
    .insert([
      {
        nome: time.nome,
        nome_cartola: time.nome_cartola,
        escudo: time.url_escudo_png,
        slug: time.slug,
        time_id_cartola: time.time_id
      }
    ])
    .select()

  if (error) {
    console.error(error)
    return { success: false, msg: error.message }
  }
  return { success: true, msg: 'Time salvo com sucesso!' }
}

// 3. Função para Criar um Novo Campeonato
export async function criarCampeonato(nome: string, ano: number, tipo: string) {
  const { data, error } = await supabase
    .from('campeonatos')
    .insert([{ nome, ano, tipo, ativo: true }])
    .select()

  if (error) {
    console.error(error)
    return { success: false, msg: error.message }
  }
  return { success: true, msg: 'Campeonato criado com sucesso!' }
}

// 4. Função para Listar Campeonatos existentes
export async function listarCampeonatos() {
  const { data } = await supabase
    .from('campeonatos')
    .select('*')
    .order('id', { ascending: false })
  
  return data || []
}

// 5. Adicionar um Time ao Campeonato (Cria a linha na tabela de classificação)
export async function adicionarTimeAoCampeonato(campeonatoId: number, timeId: number) {
  const { error } = await supabase
    .from('classificacao')
    .insert([
      { campeonato_id: campeonatoId, time_id: timeId }
    ])

  if (error) {
    console.error(error)
    return { success: false, msg: error.message }
  }
  return { success: true }
}

// 6. Listar Times de um Campeonato Específico
export async function listarTimesDoCampeonato(campeonatoId: number) {
  // Busca na tabela classificação e faz o JOIN com a tabela times para pegar o nome
  const { data } = await supabase
    .from('classificacao')
    .select('*, times(*)') // O times(*) significa: traga os dados do time relacionado
    .eq('campeonato_id', campeonatoId)

  return data || []
}

// 7. Listar Times Disponíveis (Sem Cache)
export async function listarTodosTimes() {
  const { data } = await supabase
    .from('times')
    .select('*')
    .order('nome', { ascending: true }) // Já traz em ordem alfabética
  
  return data || []
}

// 8. Criar uma Partida (Confronto)
export async function criarPartida(campeonatoId: number, rodada: number, casaId: number, visitanteId: number) {
  if (casaId === visitanteId) {
    return { success: false, msg: "O time não pode jogar contra ele mesmo!" }
  }

  const { error } = await supabase
    .from('partidas')
    .insert([{
      campeonato_id: campeonatoId,
      rodada: rodada,
      time_casa: casaId,
      time_visitante: visitanteId,
      status: 'agendado' // O jogo começa como agendado
    }])

  if (error) {
    console.error(error)
    return { success: false, msg: error.message }
  }
  return { success: true }
}

// 9. Listar Partidas do Campeonato
export async function listarPartidas(campeonatoId: number) {
  // Aqui a query é mais chatinha: precisa pegar o nome do time da casa E do visitante
  const { data, error } = await supabase
    .from('partidas')
    .select(`
      *,
      casa:times!partidas_time_casa_fkey(*),
      visitante:times!partidas_time_visitante_fkey(*)
    `)
    .eq('campeonato_id', campeonatoId)
    .order('rodada', { ascending: true })

  if (error) console.error(error)
  return data || []
}

// 10. ATUALIZAÇÃO FLEXÍVEL (COM HEADERS CORRIGIDOS)
export async function atualizarRodada(campeonatoId: number, rodadaLiga: number, rodadaCartola: number) {
  const { data: partidas } = await supabase
    .from('partidas')
    .select('*, casa:times!partidas_time_casa_fkey(*), visitante:times!partidas_time_visitante_fkey(*)')
    .eq('campeonato_id', campeonatoId)
    .eq('rodada', rodadaLiga)

  if (!partidas || partidas.length === 0) return { success: false, msg: "Nenhum jogo nesta rodada." }

  // Cabeçalhos para enganar a API da Globo (IMPORTANTE!)
  const headersGlobo = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }

  for (const jogo of partidas) {
    try {
      // Busca API com headers
      const resCasa = await fetch(`https://api.cartola.globo.com/time/id/${jogo.casa.time_id_cartola}/${rodadaCartola}`, { headers: headersGlobo })
      const dadosCasa = await resCasa.json()
      const pontosCasaReais = dadosCasa.pontos || 0

      const resVisitante = await fetch(`https://api.cartola.globo.com/time/id/${jogo.visitante.time_id_cartola}/${rodadaCartola}`, { headers: headersGlobo })
      const dadosVisitante = await resVisitante.json()
      const pontosVisitanteReais = dadosVisitante.pontos || 0

      // Lógica do 0x0 (Jogo não aconteceu)
      let novoStatus = 'finalizado'
      let placarCasa = Math.floor(pontosCasaReais)
      let placarVisitante = Math.floor(pontosVisitanteReais)

      if (pontosCasaReais === 0 && pontosVisitanteReais === 0) {
        novoStatus = 'agendado'
        placarCasa = null as any
        placarVisitante = null as any
      }

      await supabase.from('partidas').update({
          pontos_reais_casa: pontosCasaReais,
          placar_casa: placarCasa,
          pontos_reais_visitante: pontosVisitanteReais,
          placar_visitante: placarVisitante,
          status: novoStatus
        }).eq('id', jogo.id)
        
    } catch (err) {
      console.error("Erro ao buscar API:", err)
    }
  }
  
  await recalcularTabela(campeonatoId)
  return { success: true, msg: `Rodada ${rodadaLiga} atualizada!` }
}

// 11. Chama a função do banco para recalcular a tabela
export async function recalcularTabela(campeonatoId: number) {
  const { error } = await supabase.rpc('calcular_classificacao', { liga_id: campeonatoId })
  
  if (error) {
    console.error(error)
    return { success: false, msg: error.message }
  }
  return { success: true }
}

// 12. Busca a Tabela Ordenada
export async function buscarTabela(campeonatoId: number) {
  const { data } = await supabase
    .from('classificacao')
    .select('*, times(*)') // Pega dados do time
    .eq('campeonato_id', campeonatoId)
    .order('pts', { ascending: false }) // 1º Critério: Total de Pontos (PTS)
    .order('v', { ascending: false })  // 2º Critério: Vitórias (V)
    .order('sp', { ascending: false }) // 3º Critério: Saldo de Pontos (SP)
    .order('pp', { ascending: false }) // 4º Critério: Pontos Pró (PP)

  return data || []
}

// 13. GERADOR AUTOMÁTICO DE TABELA (Turno e Returno)
export async function gerarTabelaCompleta(campeonatoId: number) {
  // 1. Pega todos os times que já estão na liga
  const times = await listarTimesDoCampeonato(campeonatoId)
  
  if (times.length < 2) return { success: false, msg: "Precisa de pelo menos 2 times!" }
  if (times.length % 2 !== 0) return { success: false, msg: "O número de times deve ser PAR para gerar automático. Adicione mais um time ou remova um." }

  const listaIds = times.map(t => t.time_id) // Só os IDs: [1, 2, 3, 4...]
  const numTimes = listaIds.length
  const numRodadas = numTimes - 1 // Em turno único
  const partidasParaSalvar = []

  // Algoritmo "Round Robin" (Polígono)
  for (let turno = 0; turno < 2; turno++) { // 0 = Ida, 1 = Volta
    
    for (let rodada = 0; rodada < numRodadas; rodada++) {
      for (let i = 0; i < numTimes / 2; i++) {
        
        let timeA = listaIds[i]
        let timeB = listaIds[numTimes - 1 - i]
        
        // Define o número da rodada real (Ida: 1 a 19 | Volta: 20 a 38)
        const numeroRodada = (turno * numRodadas) + (rodada + 1)

        // Na volta, inverte o mando de campo
        if (turno === 1) {
          [timeA, timeB] = [timeB, timeA] // Troca A com B
        }

        partidasParaSalvar.push({
          campeonato_id: campeonatoId,
          rodada: numeroRodada,
          time_casa: timeA,
          time_visitante: timeB,
          status: 'agendado'
        })
      }

      // Gira os times (mantém o primeiro fixo e roda o resto)
      const primeiro = listaIds[0]
      const resto = listaIds.slice(1)
      resto.push(resto.shift()!) // Move o primeiro do resto para o fim
      listaIds.length = 0 // Limpa array
      listaIds.push(primeiro, ...resto) // Remonta
    }
  }

  // Salva tudo no banco de uma vez
  const { error } = await supabase.from('partidas').insert(partidasParaSalvar)
  
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// 14. Limpar todos os jogos (Botão "Zerar Jogos")
export async function zerarJogos(campeonatoId: number) {
  const { error } = await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId)
  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// 15. ATUALIZAR O CAMPEONATO INTEIRO (Corrigido)
export async function atualizarCampeonatoInteiro(campeonatoId: number) {
  const { data: jogos } = await supabase
    .from('partidas')
    .select('rodada')
    .eq('campeonato_id', campeonatoId)
    .order('rodada', { ascending: false })
    .limit(1)

  if (!jogos || jogos.length === 0) return { success: false, msg: "Não há jogos para atualizar." }

  const ultimaRodada = jogos[0].rodada

  // Loop: Atualiza da Rodada 1 até a Última
  for (let r = 1; r <= ultimaRodada; r++) {
    // CORREÇÃO AQUI: 
    // No modo automático, assumimos que Rodada 1 da Liga = Rodada 1 do Cartola
    // Passamos 'r' duas vezes (uma para a liga, uma para o cartola)
    await atualizarRodada(campeonatoId, r, r)
  }

  await recalcularTabela(campeonatoId)

  return { success: true, msg: `Todas as ${ultimaRodada} rodadas foram atualizadas!` }
}

// 16. BUSCAR MAIORES PONTUADORES (Ranking de Pontos Reais)
export async function buscarMaioresPontuadores() {
  // Busca todos os jogos finalizados, trazendo os nomes dos times e do campeonato
  const { data: partidas } = await supabase
    .from('partidas')
    .select(`
      rodada,
      pontos_reais_casa,
      pontos_reais_visitante,
      casa:times!partidas_time_casa_fkey(nome, escudo),
      visitante:times!partidas_time_visitante_fkey(nome, escudo),
      liga:campeonatos(nome)
    `)
    .eq('status', 'finalizado')

  if (!partidas) return []

  // O banco retorna partidas (dois times). Precisamos separar em pontuações individuais.
  let listaPontuacoes = []

  partidas.forEach(jogo => {
    // Adiciona o Mandante
    if (jogo.pontos_reais_casa) {
      listaPontuacoes.push({
        time: jogo.casa.nome,
        escudo: jogo.casa.escudo,
        pontos: jogo.pontos_reais_casa,
        rodada: jogo.rodada,
        liga: jogo.liga?.nome
      })
    }
    // Adiciona o Visitante
    if (jogo.pontos_reais_visitante) {
      listaPontuacoes.push({
        time: jogo.visitante.nome,
        escudo: jogo.visitante.escudo,
        pontos: jogo.pontos_reais_visitante,
        rodada: jogo.rodada,
        liga: jogo.liga?.nome
      })
    }
  })

  // Ordena do Maior para o Menor e pega o Top 5
  listaPontuacoes.sort((a, b) => b.pontos - a.pontos)
  
  return listaPontuacoes.slice(0, 5) // Retorna só os 5 melhores
}

// 17. BUSCAR RANKING REAL (Corrigido para pegar TOTAL DO CAMPEONATO)
export async function buscarLigaOficial() {
  // 1. Busca todos os times cadastrados no SEU banco
  const { data: meusTimes } = await supabase.from('times').select('*')

  if (!meusTimes || meusTimes.length === 0) {
    return [] 
  }

  // 2. Busca na API Oficial
  const promessas = meusTimes.map(async (time) => {
    try {
      const res = await fetch(`https://api.cartola.globo.com/time/id/${time.time_id_cartola}`, {
        next: { revalidate: 60 } 
      })
      
      if (!res.ok) return null 

      const dados = await res.json()
      
      return {
        pos: 0, 
        time: dados.time.nome,
        cartoleiro: dados.time.nome_cartola,
        // AQUI ESTAVA O ERRO: mudamos de .pontos para .pontos_campeonato
        pontos: dados.pontos_campeonato || 0, 
        escudo: dados.time.url_escudo_png
      }
    } catch (error) {
      return null
    }
  })

  // 3. Processa e Ordena
  const resultados = await Promise.all(promessas)

  const ranking = resultados
    .filter((item) => item !== null)
    .sort((a: any, b: any) => b.pontos - a.pontos) // Ordena pelo TOTAL

  // 4. Retorna Top 5
  const top5 = ranking.slice(0, 5).map((item: any, index) => ({
    ...item,
    pos: index + 1
  }))

  return top5
}

// 18. LISTAR APENAS OS IDS DOS TIMES SALVOS (Para controle visual)
export async function listarIdsTimesSalvos() {
  const { data } = await supabase.from('times').select('time_id_cartola')
  // Retorna apenas um array de números: [123, 456, 789]
  return data?.map((t: any) => t.time_id_cartola) || []
}

// 19. REMOVER UM TIME (FORÇAR SAÍDA)
export async function removerTime(timeIdCartola: number) {
  // 1. Descobre o ID interno do time no nosso banco
  const { data: time } = await supabase
    .from('times')
    .select('id')
    .eq('time_id_cartola', timeIdCartola)
    .single()

  if (!time) return { success: false, msg: "Time não encontrado." }

  // 2. Apaga o time da tabela de CLASSIFICAÇÃO (sai das ligas)
  await supabase.from('classificacao').delete().eq('time_id', time.id)

  // 3. Apaga os JOGOS onde ele é Mandante ou Visitante
  await supabase.from('partidas').delete().eq('time_casa', time.id)
  await supabase.from('partidas').delete().eq('time_visitante', time.id)

  // 4. AGORA SIM: Apaga o cadastro do time
  const { error } = await supabase
    .from('times')
    .delete()
    .eq('id', time.id)

  if (error) return { success: false, msg: "Erro do Banco: " + error.message }
  return { success: true }
}

// 20. REMOVER TIME DE UMA LIGA ESPECÍFICA
export async function removerTimeDaLiga(campeonatoId: number, timeId: number) {
  // 1. Remove jogos desse time NESTE campeonato (para não dar erro no banco)
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_casa', timeId)
  await supabase.from('partidas').delete().eq('campeonato_id', campeonatoId).eq('time_visitante', timeId)

  // 2. Remove da tabela de classificação (sai da liga)
  const { error } = await supabase
    .from('classificacao')
    .delete()
    .eq('campeonato_id', campeonatoId)
    .eq('time_id', timeId)

  if (error) return { success: false, msg: error.message }
  return { success: true }
}

// 21. ATUALIZAR PLACAR MANUALMENTE
export async function atualizarPlacarManual(partidaId: number, casa: number, visitante: number) {
  // 1. Atualiza o jogo
  const { data, error } = await supabase
    .from('partidas')
    .update({
      placar_casa: casa,
      placar_visitante: visitante,
      status: 'finalizado' // Força o status para finalizado
    })
    .eq('id', partidaId)
    .select('campeonato_id')
    .single()

  if (error) return { success: false, msg: error.message }

  // 2. Recalcula a tabela imediatamente
  await recalcularTabela(data.campeonato_id)
  
  return { success: true }
}

// 21. CALCULAR PARCIAIS AO VIVO (COM CABEÇALHOS ANTI-BLOQUEIO)
export async function buscarParciaisAoVivo(jogos: any[]) {
  const headersGlobo = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }

  let atletasPontuados: any = {}
  
  try {
    console.log("🔍 Buscando parciais na Globo...")
    const res = await fetch('https://api.cartola.globo.com/atletas/pontuados', { 
      headers: headersGlobo,
      next: { revalidate: 0 } 
    })
    
    if (res.ok) {
      const data = await res.json()
      atletasPontuados = data.atletas || {}
      console.log(`✅ Parciais encontradas! Jogadores pontuando: ${Object.keys(atletasPontuados).length}`)
    } else {
      console.error("❌ Erro ao buscar parciais:", res.status)
    }
  } catch (e) {
    console.error("❌ Erro fatal parciais:", e)
  }

  // Calcula os times
  const jogosComParcial = await Promise.all(jogos.map(async (jogo) => {
    
    const calcularTime = async (timeId: number) => {
      try {
        // Busca escalação do time
        const resTime = await fetch(`https://api.cartola.globo.com/time/id/${timeId}`, { 
            headers: headersGlobo, 
            next: { revalidate: 0 } 
        })
        
        if (!resTime.ok) return 0 // Se der erro, retorna 0
        
        const dataTime = await resTime.json()
        let soma = 0
        
        if (dataTime.atletas) {
            dataTime.atletas.forEach((atleta: any) => {
                const pontuacaoAtleta = atletasPontuados[atleta.atleta_id]?.pontuacao || 0
                
                if (atleta.atleta_id === dataTime.capitao_id) {
                    soma += pontuacaoAtleta * 1.5
                } else {
                    soma += pontuacaoAtleta
                }
            })
        }
        return Math.floor(soma)
      } catch (error) {
        return 0
      }
    }

    const [pontosCasa, pontosVisitante] = await Promise.all([
        calcularTime(jogo.casa.time_id_cartola),
        calcularTime(jogo.visitante.time_id_cartola)
    ])

    return {
        ...jogo,
        placar_casa: pontosCasa,
        placar_visitante: pontosVisitante,
        is_parcial: true 
    }
  }))

  return { success: true, jogos: jogosComParcial }
}

// 22. BUSCAR RANKING COMPLETO (Sem limite de Top 5)
export async function buscarRankingCompleto() {
  // 1. Busca todos os times cadastrados
  const { data: meusTimes } = await supabase.from('times').select('*')

  if (!meusTimes || meusTimes.length === 0) return []

  // 2. Busca na API Oficial
  const promessas = meusTimes.map(async (time) => {
    try {
      const res = await fetch(`https://api.cartola.globo.com/time/id/${time.time_id_cartola}`, { next: { revalidate: 60 } })
      if (!res.ok) return null
      const dados = await res.json()
      return {
        pos: 0, time: dados.time.nome, cartoleiro: dados.time.nome_cartola,
        pontos: dados.pontos_campeonato || 0, 
        escudo: dados.time.url_escudo_png
      }
    } catch (error) { return null }
  })

  const resultados = await Promise.all(promessas)
  
  // Retorna a lista INTEIRA ordenada
  const ranking = resultados
    .filter((item) => item !== null)
    .sort((a: any, b: any) => b.pontos - a.pontos)
    .map((item: any, index) => ({ ...item, pos: index + 1 }))

  return ranking
}

// 23. BUSCA HISTÓRICO DE JOGOS ENTRE TIMES EMPATADOS PARA DESEMPATE H2H
export async function buscarHistoricoConfrontoDireto(campeonatoId: number, timeIds: number[]) {
  // Esta busca traz todos os jogos entre os IDs fornecidos (ex: jogo A x B e B x A)
  const { data: jogos } = await supabase
    .from('partidas')
    .select('time_casa, time_visitante, placar_casa, placar_visitante')
    .eq('campeonato_id', campeonatoId)
    .in('time_casa', timeIds)
    .in('time_visitante', timeIds)
    .not('placar_casa', 'is', null) // Considera apenas jogos finalizados
    .not('placar_visitante', 'is', null)

  return jogos || []
}

// 24. GERA CONFRONTOS INICIAIS DE MATA-MATA (Sorteio)
export async function gerarChaveamentoMataMata(campeonatoId: number, timesPotA: number[], timesPotB: number[]) {
    // Verifica se o número de times é igual nos dois potes
    if (timesPotA.length !== timesPotB.length || timesPotA.length === 0) {
        return { success: false, msg: "Os potes A e B devem ter o mesmo número de times e não podem estar vazios." };
    }

    // Algoritmo de Fisher-Yates para embaralhar os potes
    const shuffle = (array: number[]) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[currentIndex], array[randomIndex]];
        }
        return array;
    };

    const potA = shuffle([...timesPotA]);
    const potB = shuffle([...timesPotB]);
    const partidasParaSalvar = [];

    // Criação dos confrontos (Pot A vs Pot B)
    for (let i = 0; i < potA.length; i++) {
        partidasParaSalvar.push({
            campeonato_id: campeonatoId,
            rodada: 1, // Primeira fase
            time_casa: potA[i],
            time_visitante: potB[i],
            status: 'agendado'
        });
    }

    // Apaga jogos antigos e salva os novos
    await zerarJogos(campeonatoId); // Reutiliza a função de zerar jogos
    const { error } = await supabase.from('partidas').insert(partidasParaSalvar);

    if (error) return { success: false, msg: error.message };
    return { success: true, msg: `${partidasParaSalvar.length} confrontos criados na 1ª fase!` };
}