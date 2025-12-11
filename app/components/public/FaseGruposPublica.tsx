'use client'

import { useState, useEffect } from 'react'
import { buscarTabelaGrupos, listarPartidas, buscarParciaisAoVivo } from '../../actions'

interface Props {
  campeonatoId: number
}

export default function FaseGruposPublica({ campeonatoId }: Props) {
  // Guardamos os dados originais para poder resetar depois do "Ao Vivo"
  const [dadosOriginais, setDadosOriginais] = useState<{grupos: any, jogos: any[]}>({ grupos: {}, jogos: [] })
  
  const [gruposExibidos, setGruposExibidos] = useState<any>({})
  const [jogosExibidos, setJogosExibidos] = useState<any[]>([])
  
  const [rodadaView, setRodadaView] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const dadosGrupos = await buscarTabelaGrupos(campeonatoId)
        const dadosJogos = await listarPartidas(campeonatoId)
        const jogosGrupos = dadosJogos.filter((j: any) => j.rodada <= 20)
        
        // Salva estado inicial
        setDadosOriginais({ grupos: dadosGrupos, jogos: jogosGrupos })
        setGruposExibidos(dadosGrupos)
        setJogosExibidos(jogosGrupos)

        // Define rodada atual
        if (jogosGrupos.length > 0) {
            const atual = jogosGrupos.find((j:any) => j.status !== 'finalizado')?.rodada || 
                          Math.max(...jogosGrupos.map((j:any) => j.rodada));
            setRodadaView(atual)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [campeonatoId])

  // --- LÓGICA AO VIVO ---
  async function toggleAoVivo() {
    if (!modoAoVivo) {
        setLoadingLive(true)
        try {
            // 1. Busca parciais dos jogos não finalizados da rodada atual
            const jogosAbertos = dadosOriginais.jogos.filter((j:any) => 
                j.status !== 'finalizado' && j.rodada === rodadaView
            )
            const { jogos: parciais } = await buscarParciaisAoVivo(jogosAbertos)

            // 2. Atualiza a lista de jogos com os placares parciais
            const novosJogos = dadosOriginais.jogos.map(jogo => {
                if (jogo.rodada === rodadaView) {
                    const p = parciais?.find((x:any) => x.id === jogo.id)
                    if (p && p.is_parcial) {
                        return { 
                            ...jogo, 
                            placar_casa: p.placar_casa, 
                            placar_visitante: p.placar_visitante, 
                            is_parcial: true,
                            status: 'finalizado' // Simula finalizado para cálculo
                        }
                    }
                }
                return jogo
            })
            setJogosExibidos(novosJogos)

            // 3. RECALCULA AS TABELAS DOS GRUPOS
            // Precisamos reconstruir a pontuação baseada nesses "novosJogos"
            const stats: any = {}
            // Inicializa stats com base nos times originais (zerados)
            Object.values(dadosOriginais.grupos).flat().forEach((t: any) => {
                stats[t.time_id] = { 
                    ...t, 
                    pts: 0, pj: 0, v: 0, e: 0, d: 0, pp: 0, pc: 0, sp: 0 
                }
            })

            // Recalcula somando todos os jogos (passados + parciais)
            novosJogos.forEach((jogo: any) => {
                const c = stats[jogo.time_casa]
                const v = stats[jogo.time_visitante]
                
                // Só processa se o jogo tiver placar (real ou parcial)
                if (c && v && (jogo.status === 'finalizado' || jogo.is_parcial)) {
                    c.pj++; v.pj++;
                    c.pp += jogo.placar_casa; c.pc += jogo.placar_visitante;
                    v.pp += jogo.placar_visitante; v.pc += jogo.placar_casa;
                    c.sp = c.pp - c.pc; v.sp = v.pp - v.pc;

                    if (jogo.placar_casa > jogo.placar_visitante) { c.pts += 3; c.v++; v.d++; }
                    else if (jogo.placar_visitante > jogo.placar_casa) { v.pts += 3; v.v++; c.d++; }
                    else { c.pts += 1; v.pts += 1; c.e++; v.e++; }
                }
            })

            // Remonta o objeto de grupos ordenado
            const novosGrupos: any = {}
            Object.values(stats).forEach((time: any) => {
                if (!novosGrupos[time.grupo]) novosGrupos[time.grupo] = []
                novosGrupos[time.grupo].push(time)
            })
            // Ordena cada grupo
            for (const l in novosGrupos) {
                novosGrupos[l].sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp)
            }

            setGruposExibidos(novosGrupos)
            setModoAoVivo(true)

        } catch (e) { console.error(e) }
        setLoadingLive(false)
    } else {
        // Reset
        setGruposExibidos(dadosOriginais.grupos)
        setJogosExibidos(dadosOriginais.jogos)
        setModoAoVivo(false)
    }
  }

  const jogosDaRodada = jogosExibidos.filter(j => j.rodada === rodadaView)
  const totalRodadas = dadosOriginais.jogos.length > 0 ? Math.max(...dadosOriginais.jogos.map(j => j.rodada)) : 6

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Carregando...</div>

  if (Object.keys(gruposExibidos).length === 0) {
    return <div className="text-center py-20 bg-[#121212] rounded-3xl border border-gray-800 text-gray-500">Grupos não definidos</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
        
        {/* ESQUERDA: GRADES DE GRUPOS */}
        <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="text-xl">🌎</span> Fase de Grupos
                    </h2>
                    {modoAoVivo && <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">Ao Vivo (R{rodadaView})</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {Object.keys(gruposExibidos).sort().map(letra => (
                    <div key={letra} className={`bg-[#121212] border rounded-2xl overflow-hidden shadow-lg flex flex-col h-fit transition-colors ${modoAoVivo ? 'border-green-900/30' : 'border-gray-800'}`}>
                        <div className="bg-[#151515] px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                            <span className="text-white font-black tracking-widest text-xs uppercase text-blue-400">Grupo {letra}</span>
                        </div>
                        
                        <div className="w-full">
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                                    <tr>
                                        <th className="py-2 pl-3 w-[8%]">#</th>
                                        <th className="py-2 px-1 w-[32%]">Clube</th> 
                                        <th className="py-2 text-center text-white w-[10%]">PTS</th>
                                        <th className="py-2 text-center w-[8%]">J</th>
                                        <th className="py-2 text-center w-[8%]">V</th>
                                        <th className="py-2 text-center w-[10%]" title="Pontos Pró">PP</th>
                                        <th className="py-2 text-center w-[10%]" title="Pontos Contra">PC</th>
                                        <th className="py-2 text-center w-[10%]" title="Saldo">SP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/40">
                                    {gruposExibidos[letra].map((t: any, idx: number) => {
                                        const time = Array.isArray(t.times) ? t.times[0] : t.times;
                                        const isClassificado = idx < 2;
                                        
                                        return (
                                        <tr key={t.id} className="hover:bg-white/[0.02]">
                                            <td className="py-2 pl-3 font-bold text-gray-500 relative">
                                                {isClassificado && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500"></div>}
                                                {idx + 1}
                                            </td>
                                            <td className="py-2 px-1">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <img src={time?.escudo} className="w-5 h-5 object-contain shrink-0" />
                                                    <span className={`font-bold truncate max-w-[100px] ${isClassificado ? 'text-white' : 'text-gray-400'}`}>{time?.nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 text-center font-black text-white bg-white/5">{t.pts}</td>
                                            <td className="py-2 text-center text-gray-600">{t.pj}</td>
                                            <td className="py-2 text-center text-gray-600">{t.v}</td>
                                            <td className="py-2 text-center text-gray-500 font-mono">{t.pp}</td>
                                            <td className="py-2 text-center text-gray-500 font-mono">{t.pc}</td>
                                            <td className={`py-2 text-center font-bold ${t.sp > 0 ? 'text-green-500' : t.sp < 0 ? 'text-red-500' : 'text-gray-600'}`}>{t.sp}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* DIREITA: JOGOS E CONTROLES */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-5 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Jogos
                    </span>
                    <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                        <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">‹</button>
                        <span className="text-[10px] font-black px-2 text-blue-500 uppercase">R{rodadaView}</span>
                        <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">›</button>
                    </div>
                </div>

                {/* BOTÃO AO VIVO */}
                <button 
                    onClick={toggleAoVivo} 
                    disabled={loadingLive}
                    className={`
                        w-full py-3 mb-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2
                        ${modoAoVivo 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20'}
                    `}
                >
                    {loadingLive ? 'Carregando...' : (modoAoVivo ? 'Parar Simulação' : 'Ver Parciais Ao Vivo')}
                </button>

                <div className="space-y-2">
                    {jogosDaRodada.length === 0 && <div className="text-center text-gray-600 text-[10px] py-4">Sem jogos nesta rodada.</div>}
                    
                    {jogosDaRodada.map(j => {
                        const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                        const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                        const finalizado = j.status === 'finalizado';
                        const parcial = j.is_parcial === true;
                        
                        return (
                            <div key={j.id} className={`bg-black/40 border p-3 rounded-xl flex justify-between items-center text-xs transition-colors ${parcial ? 'border-green-900/50' : 'border-gray-800'}`}>
                                <div className="flex items-center gap-2 w-[40%] justify-end">
                                    <span className={`font-bold text-[9px] truncate ${parcial && j.placar_casa > j.placar_visitante ? 'text-green-400' : 'text-gray-400'}`}>{casa?.nome}</span>
                                    <img src={casa?.escudo} className="w-5 h-5 object-contain" />
                                </div>
                                <div className={`font-mono font-black border px-2 py-1 rounded text-[10px] ${parcial ? 'bg-green-900/20 border-green-900 text-green-400' : 'bg-[#151515] border-gray-800 text-white'}`}>
                                    {j.placar_casa ?? '-'} : {j.placar_visitante ?? '-'}
                                </div>
                                <div className="flex items-center gap-2 w-[40%] justify-start">
                                    <img src={visitante?.escudo} className="w-5 h-5 object-contain" />
                                    <span className={`font-bold text-[9px] truncate ${parcial && j.placar_visitante > j.placar_casa ? 'text-green-400' : 'text-gray-400'}`}>{visitante?.nome}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

    </div>
  )
}