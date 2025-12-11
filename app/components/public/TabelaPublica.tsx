'use client'

import { useState, useEffect } from 'react'
import { buscarTabelaPontosCorridos, buscarParciaisAoVivo, listarPartidas } from '../../actions'

interface Props {
  campeonatoId: number
}

export default function TabelaPublica({ campeonatoId }: Props) {
  const [dadosOriginais, setDadosOriginais] = useState<{tabela: any[], jogos: any[]}>({ tabela: [], jogos: [] })
  const [tabelaExibida, setTabelaExibida] = useState<any[]>([])
  const [jogosExibidos, setJogosExibidos] = useState<any[]>([])
  const [rodadaView, setRodadaView] = useState(1)
  const [modoAoVivo, setModoAoVivo] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
        const [tabela, jogos] = await Promise.all([
            buscarTabelaPontosCorridos(campeonatoId),
            listarPartidas(campeonatoId)
        ])
        const tabelaComPos = tabela.map((t:any, i:number) => ({ ...t, posOriginal: i + 1 }))
        
        setDadosOriginais({ tabela: tabelaComPos, jogos })
        setTabelaExibida(tabelaComPos)
        setJogosExibidos(jogos)

        if (jogos.length > 0) {
            const atual = jogos.find((j:any) => j.status !== 'finalizado')?.rodada || 
                          Math.max(...jogos.map((j:any) => j.rodada));
            setRodadaView(atual)
        }
    }
    init()
  }, [campeonatoId])

  useEffect(() => {
    if (dadosOriginais.tabela.length === 0) return;

    if (modoAoVivo) {
        atualizarDadosAoVivo()
    } else {
        setTabelaExibida(dadosOriginais.tabela)
        setJogosExibidos(dadosOriginais.jogos)
    }
  }, [modoAoVivo, rodadaView, dadosOriginais])

  async function atualizarDadosAoVivo() {
    setLoading(true)
    try {
        const jogosParaAtualizar = dadosOriginais.jogos.filter((j:any) => 
            j.status !== 'finalizado' && j.rodada === rodadaView
        )
        
        const { jogos: parciais } = await buscarParciaisAoVivo(jogosParaAtualizar)
        
        const novosJogos = dadosOriginais.jogos.map(jogo => {
            if (jogo.rodada === rodadaView) {
                const p = parciais?.find((x:any) => x.id === jogo.id)
                if (p && p.is_parcial) {
                    return { ...jogo, placar_casa: p.placar_casa, placar_visitante: p.placar_visitante, is_parcial: true }
                }
            }
            return jogo
        })
        setJogosExibidos(novosJogos)

        const novaTabela = dadosOriginais.tabela.map(time => {
            const jogosTime = novosJogos.filter((j:any) => j.is_parcial && j.rodada === rodadaView && (j.time_casa === time.time_id || j.time_visitante === time.time_id))
            
            let pts = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0, sg = 0;
            
            jogosTime.forEach((j:any) => {
                const c = j.placar_casa; const vis = j.placar_visitante;
                const isCasa = j.time_casa === time.time_id;
                
                const golsPro = isCasa ? c : vis;
                const golsContra = isCasa ? vis : c;
                
                gp += golsPro; gc += golsContra; sg += golsPro - golsContra;
                
                if(isCasa) { if(c>vis){pts+=3; v++} else if(c===vis){pts+=1; e++} else d++ }
                else { if(vis>c){pts+=3; v++} else if(vis===c){pts+=1; e++} else d++ }
            })

            return { 
                ...time, 
                pts: time.pts + pts, 
                v: time.v + v, e: time.e + e, d: time.d + d, 
                gp: (time.gp || 0) + gp, gc: (time.gc || 0) + gc, sg: (time.sg || 0) + sg, 
                ptsExtra: pts 
            }
        }).sort((a,b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg)

        setTabelaExibida(novaTabela)

    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const jogosDaRodada = jogosExibidos.filter(j => j.rodada === rodadaView)
  const totalRodadas = dadosOriginais.jogos.length > 0 ? Math.max(...dadosOriginais.jogos.map(j => j.rodada)) : 1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
        
        {/* ESQUERDA: CLASSIFICAÇÃO */}
        <div className="lg:col-span-7">
            <div className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-gray-800 bg-[#0a0a0a] flex justify-between items-center">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="text-xl">🏆</span> Classificação
                    </h2>
                    {modoAoVivo && <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest animate-pulse border border-green-900/50 px-3 py-1 rounded-full bg-green-900/20">Ao Vivo (R{rodadaView})</span>}
                </div>
                
                {/* AQUI ESTÁ A MÁGICA: 
                    'w-full' força ocupar 100%. 
                    'table-fixed' força as colunas a respeitarem a largura definida.
                */}
                <div className="w-full">
                    <table className="w-full text-left text-[10px] table-fixed">
                        <thead className="bg-[#151515] text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800 h-10">
                            <tr>
                                <th className="pl-4 w-[8%] text-center">#</th>
                                <th className="px-2 w-[32%]">Clube</th> {/* Mais espaço para o nome */}
                                <th className="text-center text-white w-[8%]">PTS</th>
                                <th className="text-center w-[6%]">J</th>
                                <th className="text-center w-[6%]">V</th>
                                <th className="text-center w-[6%]">E</th>
                                <th className="text-center w-[6%]">D</th>
                                <th className="text-center w-[8%] text-gray-400" title="Pontos Pró">PP</th>
                                <th className="text-center w-[8%] text-gray-400" title="Pontos Contra">PC</th>
                                <th className="text-center w-[8%] text-white" title="Saldo">SP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                            {tabelaExibida.map((t, i) => {
                                const isG4 = i < 4;
                                const isZ4 = i >= tabelaExibida.length - 4 && tabelaExibida.length > 4;
                                const time = Array.isArray(t.times) ? t.times[0] : t.times;
                                
                                return (
                                    <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors h-12">
                                        <td className="pl-4 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className={`font-black text-xs ${isG4 ? 'text-blue-400' : isZ4 ? 'text-red-500' : 'text-gray-500'}`}>{i + 1}º</span>
                                                {/* Indicador de subida/descida no Ao Vivo */}
                                                {modoAoVivo && (t.posOriginal - (i + 1)) !== 0 && (
                                                    <span className={`text-[8px] font-bold leading-none ${t.posOriginal - (i + 1) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {t.posOriginal - (i + 1) > 0 ? '▲' : '▼'} {Math.abs(t.posOriginal - (i + 1))}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <img src={time?.escudo} className="w-6 h-6 object-contain shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    {/* 'truncate' corta o nome com ... se for muito grande */}
                                                    <span className="font-bold text-gray-300 text-[10px] uppercase tracking-wide group-hover:text-white transition truncate block">
                                                        {time?.nome}
                                                    </span>
                                                    {modoAoVivo && t.ptsExtra > 0 && <span className="text-[9px] text-green-500 font-bold leading-none">+{t.ptsExtra}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center font-black text-sm text-white bg-white/[0.02]">{t.pts}</td>
                                        <td className="text-center text-gray-500 font-mono">{t.pj}</td>
                                        <td className="text-center text-gray-500 font-mono">{t.v}</td>
                                        <td className="text-center text-gray-500 font-mono">{t.e}</td>
                                        <td className="text-center text-gray-500 font-mono">{t.d}</td>
                                        <td className="text-center text-gray-400 font-mono">{t.gp}</td>
                                        <td className="text-center text-gray-400 font-mono">{t.gc}</td>
                                        <td className={`text-center font-mono font-bold ${t.sg > 0 ? 'text-green-500' : t.sg < 0 ? 'text-red-500' : 'text-gray-500'}`}>{t.sg}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* DIREITA: LISTA DE JOGOS */}
        <div className="lg:col-span-5 space-y-4">
            
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
                
                {/* BOTÃO QUE ALTERNA O ESTADO */}
                <button 
                    onClick={() => setModoAoVivo(!modoAoVivo)} 
                    disabled={loading} 
                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${modoAoVivo ? 'bg-red-900/20 text-red-500 border border-red-500/50 hover:bg-red-900/40' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20'}`}
                >
                    {loading ? '...' : (modoAoVivo ? 'PARAR' : 'VER PARCIAIS AO VIVO')}
                </button>
            </div>

            <div className="space-y-3">
                {jogosDaRodada.length === 0 && (
                    <div className="text-center py-10 text-gray-700 text-xs bg-[#121212] rounded-xl border border-dashed border-gray-800">Aguardando...</div>
                )}

                {jogosDaRodada.map(j => {
                    const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                    const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                    
                    const isLive = j.is_parcial === true;
                    const finalizado = j.status === 'finalizado';
                    const c = j.placar_casa ?? '-';
                    const v = j.placar_visitante ?? '-';
                    
                    const cWin = (finalizado || isLive) && c > v;
                    const vWin = (finalizado || isLive) && v > c;

                    return (
                        <div key={j.id} className={`relative bg-[#121212] border p-3 rounded-xl transition-all ${isLive ? 'border-green-500/30' : 'border-gray-800'}`}>
                            {isLive && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                
                                <div className="flex items-center justify-end gap-2 min-w-0">
                                    <span className={`text-[10px] font-bold uppercase leading-tight text-right truncate ${cWin ? 'text-green-400' : 'text-gray-400'}`}>
                                        {casa?.nome}
                                    </span>
                                    <img src={casa?.escudo} className="w-6 h-6 object-contain shrink-0" />
                                </div>

                                <div className={`shrink-0 w-[60px] h-[30px] flex justify-center items-center rounded border font-mono text-xs font-black ${isLive ? 'bg-green-900/10 border-green-500/30 text-green-400' : 'bg-black border-gray-800 text-white'}`}>
                                    <span className={cWin ? 'text-green-400' : 'text-white'}>{c}</span>
                                    <span className="mx-1 text-gray-700 text-[10px]">:</span>
                                    <span className={vWin ? 'text-green-400' : 'text-white'}>{v}</span>
                                </div>

                                <div className="flex items-center justify-start gap-2 min-w-0">
                                    <img src={visitante?.escudo} className="w-6 h-6 object-contain shrink-0" />
                                    <span className={`text-[10px] font-bold uppercase leading-tight text-left truncate ${vWin ? 'text-green-400' : 'text-gray-400'}`}>
                                        {visitante?.nome}
                                    </span>
                                </div>

                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

    </div>
  )
}