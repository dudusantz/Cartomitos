'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  sortearGrupos, gerarJogosFaseGrupos, buscarTabelaGrupos, 
  atualizarRodadaGrupos, listarPartidas, atualizarPlacarManual 
} from '../actions'
import ModalConfirmacao from './ModalConfirmacao'

interface Props {
  campeonatoId: number
  times: any[]
}

export default function PainelFaseGrupos({ campeonatoId, times }: Props) {
  const [grupos, setGrupos] = useState<any>({})
  const [jogos, setJogos] = useState<any[]>([])
  const [rodadaView, setRodadaView] = useState(1)
  const [rodadaCartola, setRodadaCartola] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewAdjusted, setViewAdjusted] = useState(false)
  const [timesOrdenados, setTimesOrdenados] = useState<any[]>([])

  // Estados do Modal e Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  useEffect(() => { 
      if(campeonatoId) carregarDados() 
  }, [campeonatoId])

  useEffect(() => {
      if (times && times.length > 0) {
          setTimesOrdenados(prev => prev.length === times.length ? prev : [...times])
      }
  }, [times])

  async function carregarDados() {
    const dadosGrupos = await buscarTabelaGrupos(campeonatoId)
    setGrupos(dadosGrupos || {})
    
    const mapaGrupos: Record<number, string> = {}
    if (dadosGrupos) {
        Object.keys(dadosGrupos).forEach(letra => {
            dadosGrupos[letra].forEach((t: any) => {
                mapaGrupos[t.time_id] = letra
            })
        })
    }

    const dadosJogos = await listarPartidas(campeonatoId)
    const jogosGrupos = dadosJogos.filter((j: any) => {
        const gCasa = mapaGrupos[j.time_casa]
        const gVis = mapaGrupos[j.time_visitante]
        return gCasa && gVis && gCasa === gVis && j.rodada <= 20
    })
    
    setJogos(jogosGrupos)

    // Ajuste automático da rodada
    if (!viewAdjusted && jogosGrupos.length > 0) {
        const rodadasPendentes = jogosGrupos
            .filter((j: any) => j.status !== 'finalizado')
            .map((j: any) => j.rodada);
        
        let rodadaInicial = 1;
        if (rodadasPendentes.length > 0) {
            rodadaInicial = Math.min(...rodadasPendentes);
        } else {
            const todasRodadas = jogosGrupos.map((j: any) => j.rodada);
            rodadaInicial = Math.max(...todasRodadas);
        }
        setRodadaView(rodadaInicial);
        setViewAdjusted(true);
    }
  }

  function confirm(titulo: string, msg: string, action: () => void) {
    setModalConfig({ 
        titulo, 
        mensagem: msg, 
        onConfirm: () => { action(); setModalOpen(false); }, 
        tipo: 'info' 
    })
    setModalOpen(true)
  }

  function moverTime(index: number, direcao: 'cima' | 'baixo') {
      if (direcao === 'cima' && index === 0) return;
      if (direcao === 'baixo' && index === timesOrdenados.length - 1) return;

      const novaLista = [...timesOrdenados];
      const indexTroca = direcao === 'cima' ? index - 1 : index + 1;
      const temp = novaLista[index];
      novaLista[index] = novaLista[indexTroca];
      novaLista[indexTroca] = temp;
      setTimesOrdenados(novaLista);
  }

  const numPotes = 4
  const timesPorPote = timesOrdenados.length > 0 ? Math.ceil(timesOrdenados.length / numPotes) : 0
  const previewPotes = []
  if (timesOrdenados.length > 0) {
      for (let i = 0; i < numPotes; i++) {
          const slice = timesOrdenados.slice(i * timesPorPote, (i + 1) * timesPorPote)
          if (slice.length > 0) previewPotes.push({ numero: i+1, times: slice, startIndex: i * timesPorPote })
      }
  }

  function abrirTelaSorteio() { setGrupos({}) }

  async function handleSortear() {
    if (!timesOrdenados || timesOrdenados.length < 4) return toast.error("Mínimo 4 times para sortear.")
    const potes: number[][] = []
    for (let i = 0; i < numPotes; i++) {
        const slice = timesOrdenados.slice(i * timesPorPote, (i + 1) * timesPorPote)
        const ids = slice.map((t: any) => t.time_id)
        if (ids.length > 0) potes.push(ids)
    }
    confirm("Confirmar Sorteio", `Grupos atuais serão apagados. Confirmar?`, async () => {
        const res = await sortearGrupos(campeonatoId, timesPorPote, potes)
        if(res.success) { toast.success(res.msg); await carregarDados() } else { toast.error(res.msg) }
    })
  }

  async function handleGerarJogos() {
    if(jogos.length > 0) {
        confirm("Regerar Jogos", "Apagar e recriar jogos?", async () => executarGeracaoJogos())
    } else {
        confirm("Gerar Jogos", "Criar confrontos?", async () => executarGeracaoJogos())
    }
  }

  async function executarGeracaoJogos() {
      const res = await gerarJogosFaseGrupos(campeonatoId)
      if(res.success) { toast.success(res.msg); await carregarDados(); setRodadaView(1); } else { toast.error(res.msg) }
  }

  async function handleAtualizarRodada() {
    if(!rodadaCartola) return toast.error("Informe a rodada.")
    setLoading(true)
    const res = await atualizarRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartola))
    if(res.success) { toast.success(res.msg); await carregarDados(); } else toast.error(res.msg)
    setLoading(false)
  }

  async function salvarPlacar() {
    if(!editingId) return
    await atualizarPlacarManual(editingId, Number(tempCasa), Number(tempVisitante))
    setEditingId(null)
    await carregarDados()
    toast.success("Salvo!")
  }

  const jogosDaRodada = jogos.filter(j => j.rodada === rodadaView)
  const totalRodadas = jogos.length > 0 ? Math.max(...jogos.map(j => j.rodada)) : 1

  // =====================================================================
  // TELA DE SORTEIO (SEEDS) - MANTIDA IGUAL
  // =====================================================================
  if (!grupos || Object.keys(grupos).length === 0) {
      return (
        <div className="flex flex-col items-center animate-fadeIn py-4">
            <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Definição dos Potes (Seeds)</h3>
                <p className="text-gray-500 text-xs mt-1">Use as setas para organizar os times. O Pote 1 contém os cabeças de chave.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                {previewPotes.map(pote => (
                    <div key={pote.numero} className="bg-[#121212] border border-gray-800 rounded-xl p-4 flex flex-col h-full">
                        <h4 className={`text-xs font-bold uppercase mb-3 border-b border-gray-800 pb-2 ${pote.numero === 1 ? 'text-green-400' : 'text-blue-400'}`}>
                            {pote.numero === 1 ? '🏆 Pote 1 (Cabeças)' : `Pote ${pote.numero}`}
                        </h4>
                        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[400px]">
                            {pote.times.map((t:any, idx: number) => {
                                const globalIndex = pote.startIndex + idx;
                                return (
                                <div key={t.time_id} className="flex items-center justify-between bg-[#0a0a0a] p-2 rounded border border-gray-800/50 group hover:border-gray-600 transition">
                                    <div className="flex items-center gap-2 text-xs text-gray-300 overflow-hidden">
                                        <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-5 h-5 object-contain shrink-0" />
                                        <span className="truncate max-w-[80px]">{t.times?.nome}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition">
                                        <button onClick={() => moverTime(globalIndex, 'cima')} className="text-gray-400 hover:text-white px-1 hover:bg-gray-700 rounded">▲</button>
                                        <button onClick={() => moverTime(globalIndex, 'baixo')} className="text-gray-400 hover:text-white px-1 hover:bg-gray-700 rounded">▼</button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={carregarDados} className="text-gray-500 hover:text-white px-6 py-4 rounded-xl font-bold transition uppercase tracking-widest text-xs border border-transparent hover:border-gray-700">Cancelar</button>
                <button onClick={handleSortear} className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-green-900/20 uppercase tracking-widest text-xs flex items-center gap-2"><span>🎲</span> Confirmar Ordem e Sortear</button>
            </div>
        </div>
      )
  }

  // =====================================================================
  // TELA PRINCIPAL
  // =====================================================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn items-start">
      <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
      
      {/* Modal Edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="bg-[#121212] p-8 rounded-3xl border border-gray-800 w-96 shadow-2xl shadow-black transform scale-100 transition-all">
                <h3 className="text-white mb-8 text-center font-black text-xl tracking-widest uppercase">Editar Placar</h3>
                <div className="flex justify-center items-center gap-6 mb-8">
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 text-white text-4xl font-black text-center rounded-2xl outline-none focus:border-blue-600 transition" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-gray-600 font-black text-2xl">X</span>
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 text-white text-4xl font-black text-center rounded-2xl outline-none focus:border-blue-600 transition" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-900 text-gray-400 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition text-xs uppercase tracking-wider">Cancelar</button>
                    <button onClick={salvarPlacar} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20">Salvar</button>
                </div>
            </div>
        </div>
      )}

      {/* COLUNA 1: TABELAS */}
      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center bg-[#121212] p-6 rounded-3xl border border-gray-800 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Fase de Grupos</span>
            </div>
            <div className="flex gap-3">
                <button onClick={() => confirm("Re-sortear", "Deseja voltar para a tela de definição de potes?", abrirTelaSorteio)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">Re-sortear</button>
                {jogos.length === 0 ? (
                    <button onClick={handleGerarJogos} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition shadow-lg shadow-green-900/20 animate-pulse">Gerar Jogos Agora</button>
                ) : (
                    <button onClick={handleGerarJogos} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">Regerar Jogos</button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {Object.keys(grupos).sort().map(letra => (
                <div key={letra} className="bg-[#0f0f0f] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="bg-[#151515] px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-white font-black tracking-widest text-xs uppercase">Grupo {letra}</span>
                    </div>
                    
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                                <tr>
                                    <th className="py-3 pl-4 text-center w-[6%]">#</th>
                                    <th className="py-3 px-1 w-[26%]">Time</th> 
                                    <th className="py-3 text-center text-white w-[8%] bg-white/[0.02]">PTS</th>
                                    <th className="py-3 text-center w-[6%]">J</th>
                                    <th className="py-3 text-center w-[6%]">V</th>
                                    <th className="py-3 text-center w-[6%]">E</th>
                                    <th className="py-3 text-center w-[6%]">D</th>
                                    <th className="py-3 text-center w-[8%] text-gray-400" title="Pontos Pró">PP</th>
                                    <th className="py-3 text-center w-[8%] text-gray-400" title="Pontos Contra">PC</th>
                                    <th className="py-3 text-center w-[8%] text-white" title="Saldo">SP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/40">
                                {grupos[letra].map((t: any, idx: number) => {
                                    const timeDados = Array.isArray(t.times) ? t.times[0] : t.times;
                                    const escudo = timeDados?.escudo || '/shield-placeholder.png';
                                    const nome = timeDados?.nome || 'Time';
                                    const isClassificado = idx < 2;
                                    const isSulamericana = idx === 2;

                                    return (
                                    <tr key={t.id} className="hover:bg-white/[0.03] transition group relative">
                                            <td className="py-3 pl-4 text-center relative">
                                                {isClassificado && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                                {isSulamericana && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>}
                                                <span className={`font-black text-xs ${isClassificado ? 'text-green-500' : isSulamericana ? 'text-yellow-500' : 'text-gray-600'}`}>{idx + 1}</span>
                                            </td>
                                            <td className="py-3 px-1">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <img src={escudo} className="w-6 h-6 object-contain shrink-0 drop-shadow-md" />
                                                    <span className="font-bold text-gray-300 group-hover:text-white block whitespace-normal leading-tight">{nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center font-black text-white bg-white/[0.02] text-xs shadow-inner">{t.pts}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.pj}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.v}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.e}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.d}</td>
                                            <td className="py-3 text-center text-gray-400 font-mono">{t.pp}</td>
                                            <td className="py-3 text-center text-gray-400 font-mono">{t.pc}</td>
                                            <td className={`py-3 text-center font-mono font-bold ${t.sp > 0 ? 'text-green-500' : t.sp < 0 ? 'text-red-500' : 'text-gray-500'}`}>{t.sp}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* COLUNA 2: JOGOS (NOVO DESIGN) */}
      <div className="lg:col-span-1 space-y-6">
         <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 sticky top-6 shadow-xl h-fit">
            
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Jogos
                </h3>
                <div className="flex items-center gap-1 bg-black p-1.5 rounded-lg border border-gray-800">
                    <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} disabled={rodadaView === 1} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
                    <span className="text-[10px] font-black px-3 text-yellow-500 uppercase tracking-widest">R{rodadaView}</span>
                    <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} disabled={rodadaView === totalRodadas} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30 disabled:cursor-not-allowed">›</button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 shrink-0">
                <div className="flex-1 relative">
                    <input type="number" placeholder="Rodada Cartola" className="w-full bg-black border border-gray-800 text-white text-[11px] font-bold p-3.5 rounded-xl focus:border-yellow-500 outline-none transition placeholder:text-gray-600" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)} />
                </div>
                <button onClick={handleAtualizarRodada} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl text-[10px] font-bold uppercase transition shadow-lg shadow-blue-900/20 tracking-wider">
                    {loading ? '...' : 'Atualizar'}
                </button>
            </div>

            <div className="space-y-4">
                {jogosDaRodada.length === 0 && <div className="text-center text-gray-600 text-xs py-10">Sem jogos gerados.</div>}
                
                {jogosDaRodada.map(j => {
                    const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                    const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                    const jaFoi = j.status === 'finalizado';

                    const vCasa = jaFoi && j.placar_casa > j.placar_visitante;
                    const vVis = jaFoi && j.placar_visitante > j.placar_casa;
                    const empate = jaFoi && j.placar_casa === j.placar_visitante;

                    return (
                    <div 
                        key={j.id} 
                        onClick={() => { setEditingId(j.id); setTempCasa(j.placar_casa); setTempVisitante(j.placar_visitante); }} 
                        className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-gray-800/60 rounded-2xl p-4 cursor-pointer hover:border-gray-600 hover:to-[#151515] transition-all group relative overflow-hidden shadow-lg"
                    >
                        {/* Indicador de Status (bolinha verde se finalizado) */}
                        {jaFoi && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.8)]"></div>}

                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            
                            {/* Mandante (Alinhado à direita) */}
                            <div className="flex flex-col items-end gap-1.5 overflow-hidden">
                                <img src={casa?.escudo || '/shield-placeholder.png'} className={`w-8 h-8 object-contain drop-shadow-md transition-transform group-hover:scale-110 ${!vCasa && jaFoi && !empate ? 'opacity-60 grayscale' : ''}`} />
                                <span className={`text-[10px] font-bold text-right leading-tight w-full truncate ${vCasa ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {casa?.nome || 'Mandante'}
                                </span>
                            </div>
                            
                            {/* Placar Centralizado */}
                            <div className={`
                                flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-black text-sm min-w-[70px] shadow-inner
                                ${jaFoi ? 'bg-black/40 border-gray-700 text-white' : 'bg-black/20 border-gray-800 text-gray-600'}
                            `}>
                                <span className={vCasa ? 'text-green-400' : ''}>{j.placar_casa ?? '-'}</span>
                                <span className="text-gray-700 text-[10px]">✕</span>
                                <span className={vVis ? 'text-green-400' : ''}>{j.placar_visitante ?? '-'}</span>
                            </div>
                            
                            {/* Visitante (Alinhado à esquerda) */}
                            <div className="flex flex-col items-start gap-1.5 overflow-hidden">
                                <img src={visitante?.escudo || '/shield-placeholder.png'} className={`w-8 h-8 object-contain drop-shadow-md transition-transform group-hover:scale-110 ${!vVis && jaFoi && !empate ? 'opacity-60 grayscale' : ''}`} />
                                <span className={`text-[10px] font-bold text-left leading-tight w-full truncate ${vVis ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {visitante?.nome || 'Visitante'}
                                </span>
                            </div>

                        </div>
                    </div>
                )})}
            </div>
         </div>
      </div>
    </div>
  )
}