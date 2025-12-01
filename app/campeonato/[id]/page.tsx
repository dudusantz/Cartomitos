'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from "@/lib/supabase"
// Importamos a nova função aqui:
import { buscarTabela, listarPartidas, buscarParciaisAoVivo, buscarHistoricoConfrontoDireto } from "../../actions" 

// Definição de Tipo para o Time na Tabela
type TimeClassificacao = {
  id: number;
  time_id: number;
  pts: number;
  v: number;
  e: number;
  d: number;
  pp: number;
  pc: number;
  sp: number;
  pj: number;
  aproveitamento: number;
  pos_original: number;
  variacao: number;
  times: {
    escudo: string;
    nome: string;
    nome_cartola: string;
  };
};

export default function PaginaPublica() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // Dados
  const [liga, setLiga] = useState<any>(null)
  const [tabela, setTabela] = useState<TimeClassificacao[]>([])
  const [tabelaOriginal, setTabelaOriginal] = useState<TimeClassificacao[]>([]) 
  const [partidas, setPartidas] = useState<any[]>([])
  
  // Controle de Rodadas
  const [rodadaReal, setRodadaReal] = useState(1) 
  const [rodadaView, setRodadaView] = useState(1) 
  const [totalRodadas, setTotalRodadas] = useState(38)

  // Ao Vivo
  const [loadingAoVivo, setLoadingAoVivo] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)

  // Função para aplicar o Confronto Direto
  const aplicarConfrontoDireto = useCallback(async (tabelaInicial: TimeClassificacao[]) => {
    if (!campeonatoId) return tabelaInicial;

    let tabelaFinal: TimeClassificacao[] = [];
    let i = 0;

    // Iterar pela tabela para encontrar grupos empatados
    while (i < tabelaInicial.length) {
      const timeAtual = tabelaInicial[i];
      let grupoEmpatado: TimeClassificacao[] = [timeAtual];
      let j = i + 1;

      // 1. Encontrar todos os times com empate rigoroso nos 4 critérios
      while (j < tabelaInicial.length) {
        const proximoTime = tabelaInicial[j];
        
        // Critério de empate: Pontos, Vitórias, Saldo de Pontos, Pontos Pró
        const empatado = (
          timeAtual.pts === proximoTime.pts &&
          timeAtual.v === proximoTime.v &&
          timeAtual.sp === proximoTime.sp &&
          timeAtual.pp === proximoTime.pp
        );

        if (empatado) {
          grupoEmpatado.push(proximoTime);
        } else {
          break; // O critério de desempate primário mudou
        }
        j++;
      }

      // 2. Se o grupo tiver 2 ou mais times, aplicar o H2H
      if (grupoEmpatado.length >= 2) {
        const timeIds = grupoEmpatado.map(t => t.time_id);
        const jogosH2H = await buscarHistoricoConfrontoDireto(campeonatoId, timeIds);
        
        // Estrutura para calcular pontos no H2H
        const pontosH2H: { [key: number]: number } = {};
        timeIds.forEach(id => pontosH2H[id] = 0);

        // 3. Calcular pontos H2H
        jogosH2H.forEach(jogo => {
          if (jogo.placar_casa > jogo.placar_visitante) {
            pontosH2H[jogo.time_casa] += 3;
          } else if (jogo.placar_visitante > jogo.placar_casa) {
            pontosH2H[jogo.time_visitante] += 3;
          } else if (jogo.placar_casa === jogo.placar_visitante && jogo.placar_casa !== null) {
            pontosH2H[jogo.time_casa] += 1;
            pontosH2H[jogo.time_visitante] += 1;
          }
        });

        // 4. Reordenar o grupo Empatado usando os pontos H2H
        grupoEmpatado.sort((a, b) => {
          const h2ha = pontosH2H[a.time_id] || 0;
          const h2hb = pontosH2H[b.time_id] || 0;

          // Se pontos H2H desempata, usa H2H
          if (h2hb !== h2ha) return h2hb - h2ha;

          // Se H2H empata (ou não houve confronto), mantém a ordem inicial (que já é PTS/V/SP/PP)
          // Isso garante que para grupos de 3+ times, se o H2H falhar, a ordem anterior se mantém
          return 0; 
        });

        tabelaFinal.push(...grupoEmpatado);
      } else {
        // Apenas um time, sem empate
        tabelaFinal.push(timeAtual);
      }
      
      i = j; // Pula para o próximo time que não estava no grupo
    }

    return tabelaFinal;
  }, [campeonatoId]); // Garante que a função só mude se o ID mudar

  const carregarTudo = useCallback(async () => {
    // 1. Liga
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)

    // 2. Tabela (Já ordenada por PTS, V, SP, PP no 'app/actions.ts')
    const dadosTabela = await buscarTabela(campeonatoId) as TimeClassificacao[]
    const tabelaFormatada = dadosTabela.map((t: any, index: number) => ({ ...t, pos_original: index + 1, variacao: 0 }))
    
    // 3. Aplica o Confronto Direto
    const tabelaComH2H = await aplicarConfrontoDireto(tabelaFormatada);
    
    // 4. Finaliza a Tabela
    // Recalcula a posição original após o desempate final
    const tabelaFinal = tabelaComH2H.map((t, index) => ({
      ...t,
      pos_original: index + 1 // Atualiza a posição final para o cálculo de variação
    }))

    setTabela(tabelaFinal)
    setTabelaOriginal(tabelaFinal) // Tabela original com H2H aplicado
    
    // 5. Jogos
    const dadosJogos = await listarPartidas(campeonatoId)
    setPartidas(dadosJogos)

    if (dadosJogos.length > 0) {
      const maxRodada = Math.max(...dadosJogos.map((j: any) => j.rodada))
      setTotalRodadas(maxRodada)
      
      const proximoJogo = dadosJogos.find((j: any) => j.status !== 'finalizado')
      let rodadaParaExibir = proximoJogo ? proximoJogo.rodada : maxRodada
      
      setRodadaReal(rodadaParaExibir)
      setRodadaView(rodadaParaExibir)
    }
  }, [campeonatoId, aplicarConfrontoDireto])

  useEffect(() => {
    if (id) carregarTudo()
  }, [id, carregarTudo])

  // --- LÓGICA AO VIVO (Não mudou) ---
  function recalcularTabelaComJogos(jogosLive: any[]) {
    // ... (A lógica de recalcular tabela ao vivo permanece a mesma, pois 
    // ela reordena a partir do zero usando os critérios principais)
    let novaTabela = JSON.parse(JSON.stringify(tabelaOriginal))

    jogosLive.forEach(jogo => {
      // ... (cálculo de pontos) ...
      if (jogo.placar_casa === null || jogo.placar_visitante === null) return

      const timeCasa = novaTabela.find((t: any) => t.time_id === jogo.time_casa)
      const timeVisitante = novaTabela.find((t: any) => t.time_id === jogo.time_visitante)

      if (timeCasa && timeVisitante) {
        timeCasa.pj++; timeVisitante.pj++
        timeCasa.pp += jogo.placar_casa; timeVisitante.pp += jogo.placar_visitante
        timeCasa.pc += jogo.placar_visitante; timeVisitante.pc += jogo.placar_casa
        timeCasa.sp += (jogo.placar_casa - jogo.placar_visitante)
        timeVisitante.sp += (jogo.placar_visitante - jogo.placar_casa)

        if (jogo.placar_casa > jogo.placar_visitante) {
          timeCasa.pts += 3; timeCasa.v++; timeVisitante.d++
        } else if (jogo.placar_visitante > jogo.placar_casa) {
          timeVisitante.pts += 3; timeVisitante.v++; timeCasa.d++
        } else {
          timeCasa.pts += 1; timeCasa.e++; timeVisitante.pts += 1; timeVisitante.e++
        }
      }
    })

    // Reordenar a nova tabela com os critérios principais
    novaTabela.sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp)
    
    // NOTA: Para o "Modo Ao Vivo", o H2H não é re-calculado em tempo real, 
    // pois exigiria um novo fetch de H2H a cada atualização. O comportamento 
    // padrão dos apps é usar os critérios principais no modo parcial.
    
    novaTabela = novaTabela.map((t: any, index: number) => ({
      ...t,
      variacao: t.pos_original - (index + 1)
    }))

    setTabela(novaTabela)
  }

  async function ativarModoAoVivo() {
    if (modoAoVivo) {
      setModoAoVivo(false)
      // Volta para a tabela original com H2H
      setTabela(tabelaOriginal)
      return
    }

    setLoadingAoVivo(true)
    const jogosParaCalcular = partidas.filter(j => Number(j.rodada) === rodadaView)
    const res = await buscarParciaisAoVivo(jogosParaCalcular)
    
    if (res.success) {
      const novasPartidas = partidas.map(p => {
        const jogoAtualizado = res.jogos?.find((j: any) => j.id === p.id)
        return jogoAtualizado || p
      })
      setPartidas(novasPartidas)
      
      const jogosDaRodadaLive = novasPartidas.filter(j => Number(j.rodada) === rodadaView)
      recalcularTabelaComJogos(jogosDaRodadaLive)
      
      setModoAoVivo(true)
    }
    setLoadingAoVivo(false)
  }

  const jogosDaRodada = partidas.filter(jogo => Number(jogo.rodada) === rodadaView)

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cartola-gold selection:text-black">
      
      {/* --- CABEÇALHO --- */}
      <div className="relative border-b border-gray-800/60 pt-10 pb-8 px-6 bg-gradient-to-b from-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition mb-6">
            <span>←</span> Voltar ao Início
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-cartola-gold font-bold tracking-[0.2em] text-[10px] uppercase">
                  Campeonato Oficial
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                {liga?.nome || '...'}
              </h1>
            </div>
            
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Temporada</p>
                <p className="text-xl font-bold text-white">{liga?.ano}</p>
              </div>
              <div className="h-8 w-px bg-gray-800"></div>
              <div>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Rodada Atual</p>
                <p className="text-xl font-bold text-cartola-gold">#{rodadaReal}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* === COLUNA ESQUERDA: TABELA === */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Classificação
                {modoAoVivo && <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded animate-pulse">EM TEMPO REAL</span>}
              </h2>
              <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-500">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> G4</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Z4</span>
              </div>
            </div>

            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-800/60 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-black/20 text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-800/60">
                      <th className="p-4 pl-6 w-14 text-center">#</th>
                      <th className="p-4">Clube</th>
                      <th className="p-4 text-center text-white font-bold">PTS</th>
                      <th className="p-4 text-center">J</th>
                      <th className="p-4 text-center">V</th>
                      <th className="p-4 text-center hidden md:table-cell">E</th>
                      <th className="p-4 text-center hidden md:table-cell">D</th>
                      <th className="p-4 text-center hidden md:table-cell">PP</th>
                      <th className="p-4 text-center">SP</th>
                      <th className="p-4 text-center hidden sm:table-cell">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {tabela.map((time, index) => {
                      let posColor = "text-gray-500";
                      if (index < 4) posColor = "text-blue-500"; 
                      else if (index >= tabela.length - 4 && tabela.length > 8) posColor = "text-red-500"; 

                      let variacaoIcon = null
                      if (modoAoVivo && time.variacao !== 0) {
                         if (time.variacao > 0) variacaoIcon = <span className="text-green-500 text-[10px] ml-1 block">▲{Math.abs(time.variacao)}</span>
                         else variacaoIcon = <span className="text-red-500 text-[10px] ml-1 block">▼{Math.abs(time.variacao)}</span>
                      }

                      return (
                        <tr key={time.id} className="hover:bg-white/[0.02] transition duration-200 group">
                          <td className={`p-4 text-center font-black text-lg ${posColor}`}>
                            {index + 1}
                            {variacaoIcon}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <img src={time.times.escudo} className="w-9 h-9 object-contain opacity-90 group-hover:opacity-100 transition" alt="Escudo" />
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-200 text-sm leading-tight group-hover:text-white transition">{time.times.nome}</span>
                                <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">{time.times.nome_cartola}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`p-4 text-center font-black text-lg ${modoAoVivo ? 'text-green-400 bg-green-900/10 rounded' : 'text-cartola-gold bg-yellow-900/5 rounded'}`}>
                            {time.pts}
                          </td>
                          <td className="p-4 text-center text-gray-400 font-mono">{time.pj}</td>
                          <td className="p-4 text-center text-gray-400">{time.v}</td>
                          <td className="p-4 text-center text-gray-600 hidden md:table-cell">{time.e}</td>
                          <td className="p-4 text-center text-gray-600 hidden md:table-cell">{time.d}</td>
                          <td className="p-4 text-center text-gray-600 font-mono hidden md:table-cell">{time.pp}</td>
                          <td className="p-4 text-center font-bold text-gray-400">{time.sp}</td>
                          <td className="p-4 text-center text-xs text-gray-600 hidden sm:table-cell">{time.aproveitamento}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEGENDA */}
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
               <span>PTS: Pontos</span><span>J: Jogos</span><span>V: Vitórias</span><span>E: Empates</span>
               <span>D: Derrotas</span><span>PP: Pontos Pró</span><span>SP: Saldo</span><span>%: Aproveitamento</span>
            </div>
          </div>

          {/* === SIDEBAR JOGOS === */}
          <div className="lg:col-span-1">
            <div className="sticky top-10">
              <div className="mb-4 flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-white">Jogos</h2>
                
                {/* MENU DE RODADAS */}
                <div className="flex items-center gap-1 bg-[#0f0f0f] rounded-lg p-1 border border-gray-800">
                   <button onClick={() => setRodadaView(r => r > 1 ? r - 1 : r)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30 hover:bg-white/10 rounded transition" disabled={rodadaView <= 1}>‹</button>
                   
                   <div className="relative">
                     <select 
                       className="appearance-none bg-transparent text-xs font-bold text-cartola-gold uppercase tracking-wider px-2 text-center w-20 cursor-pointer focus:outline-none"
                       value={rodadaView}
                       onChange={(e) => setRodadaView(Number(e.target.value))}
                     >
                       {Array.from({ length: totalRodadas }, (_, i) => i + 1).map(r => (
                         <option key={r} value={r} className="bg-gray-900 text-white">R{r}</option>
                       ))}
                     </select>
                   </div>

                   <button onClick={() => setRodadaView(r => r < totalRodadas ? r + 1 : r)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30 hover:bg-white/10 rounded transition" disabled={rodadaView >= totalRodadas}>›</button>
                </div>
              </div>

              {/* BOTÃO AO VIVO */}
              <button 
                onClick={ativarModoAoVivo}
                disabled={loadingAoVivo}
                className={`w-full mb-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition flex items-center justify-center gap-2 ${modoAoVivo ? 'bg-red-900/50 text-red-300 hover:bg-red-900 hover:text-white border border-red-800' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/20'}`}
              >
                {loadingAoVivo ? 'Calculando...' : modoAoVivo ? '❌ Sair do Ao Vivo' : '⚡ Ver Parciais Ao Vivo'}
              </button>

              <div className="space-y-2">
                {jogosDaRodada.length === 0 && <div className="text-center py-10 text-gray-600 bg-[#0f0f0f] rounded-xl border border-gray-800 border-dashed"><p className="text-sm">Sem jogos.</p></div>}

                {jogosDaRodada.map((jogo) => (
                  <div key={jogo.id} className={`bg-[#111] rounded-2xl p-5 border transition relative overflow-hidden group ${jogo.is_parcial ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-gray-800 hover:border-gray-600'}`}>
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                       <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{liga?.nome}</span>
                       {jogo.is_parcial ? <span className="text-[9px] font-black uppercase text-green-400 tracking-wider animate-pulse">● Em Andamento</span> : <span className={`text-[9px] font-black uppercase tracking-widest ${jogo.status === 'finalizado' ? 'text-blue-500' : 'text-gray-500'}`}>{jogo.status === 'finalizado' ? 'Encerrado' : 'Agendado'}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col items-center w-1/3 group-hover:-translate-y-1 transition duration-300"><img src={jogo.casa?.escudo} className="w-14 h-14 mb-3 drop-shadow-2xl" /><span className="text-[10px] text-gray-300 font-bold text-center leading-tight uppercase tracking-wider">{jogo.casa?.nome}</span></div>
                       <div className="flex flex-col items-center justify-center w-1/3">
                         <div className="text-3xl font-black tracking-widest text-white flex gap-2 items-center">
                           {(jogo.status === 'finalizado' || jogo.is_parcial) ? <><span className={jogo.placar_casa > jogo.placar_visitante ? 'text-green-400' : 'text-white'}>{String(jogo.placar_casa ?? '0')}</span><span className="text-gray-700 text-xl">:</span><span className={jogo.placar_visitante > jogo.placar_casa ? 'text-green-400' : 'text-white'}>{String(jogo.placar_visitante ?? '0')}</span></> : <span className="text-gray-700 text-xl">VS</span>}
                         </div>
                         {jogo.is_parcial && <span className="text-[8px] text-green-500 uppercase font-bold mt-1 animate-pulse">Parcial</span>}
                       </div>
                       <div className="flex flex-col items-center w-1/3 group-hover:-translate-y-1 transition duration-300"><img src={jogo.visitante?.escudo} className="w-14 h-14 mb-3 drop-shadow-2xl" /><span className="text-[10px] text-gray-300 font-bold text-center leading-tight uppercase tracking-wider">{jogo.visitante?.nome}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}