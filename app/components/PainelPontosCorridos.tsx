'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  gerarJogosPontosCorridos, atualizarRodadaPontosCorridos, 
  buscarTabelaPontosCorridos, zerarJogos, atualizarPlacarManual, listarPartidas, recalcularTabelaPontosCorridos 
} from '../actions'
import ModalConfirmacao from './ModalConfirmacao'
import BotaoFinalizarCampeonato from './BotaoFinalizarCampeonato'
import { Trophy, ShieldAlert, RefreshCw, Trash2, Save, X, Calendar, PlayCircle } from 'lucide-react'

interface Props {
  campeonatoId: number
  times: any[]
}

export default function PainelPontosCorridos({ campeonatoId, times }: Props) {
  const [tabela, setTabela] = useState<any[]>([])
  const [jogos, setJogos] = useState<any[]>([])
  const [rodadaView, setRodadaView] = useState(1)
  const [rodadaCartola, setRodadaCartola] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Controle para ajuste automático da rodada
  const [viewAdjusted, setViewAdjusted] = useState(false)
  
  // Modal e Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')
  const [timeCasaNome, setTimeCasaNome] = useState('')
  const [timeVisitanteNome, setTimeVisitanteNome] = useState('')
  const [escudoCasa, setEscudoCasa] = useState('')
  const [escudoVisitante, setEscudoVisitante] = useState('')

  useEffect(() => { 
      if (campeonatoId) carregarDados() 
  }, [campeonatoId])

  async function carregarDados() {
    const dadosTabela = await buscarTabelaPontosCorridos(campeonatoId)
    setTabela(dadosTabela)
    
    const dadosJogos = await listarPartidas(campeonatoId)
    setJogos(dadosJogos)

    if (!viewAdjusted && dadosJogos.length > 0) {
        const rodadasPendentes = dadosJogos
            .filter((j: any) => j.status !== 'finalizado')
            .map((j: any) => j.rodada);
        
        let rodadaInicial = 1;
        if (rodadasPendentes.length > 0) {
            rodadaInicial = Math.min(...rodadasPendentes);
        } else {
            const todasRodadas = dadosJogos.map((j: any) => j.rodada);
            rodadaInicial = Math.max(...todasRodadas);
        }
        setRodadaView(rodadaInicial);
        setViewAdjusted(true);
    }
  }

  const jogosDaRodada = jogos.filter(j => j.rodada === rodadaView)
  const totalRodadas = jogos.length > 0 ? Math.max(...jogos.map(j => j.rodada)) : 1

  function confirm(titulo: string, msg: string, action: () => void) {
    setModalConfig({ titulo, mensagem: msg, onConfirm: () => { action(); setModalOpen(false) }, tipo: 'info' })
    setModalOpen(true)
  }

  async function handleGerar() {
    if (times.length < 2) return toast.error("Mínimo 2 times.")
    confirm("Gerar Tabela", "Criar todos contra todos?", async () => {
       setLoading(true)
       const res = await gerarJogosPontosCorridos(campeonatoId)
       setLoading(false)
       if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
    })
  }

  async function handleReset() {
    confirm("Resetar Campeonato", "Isso apagará todos os jogos e pontos. Tem certeza?", async () => {
       setLoading(true)
       await zerarJogos(campeonatoId)
       await carregarDados()
       setLoading(false)
       toast.success("Campeonato resetado.")
    })
  }

  async function handleRecalcular() {
      setLoading(true)
      await recalcularTabelaPontosCorridos(campeonatoId)
      await carregarDados()
      toast.success("Tabela Recalculada!")
      setLoading(false)
  }

  async function handleAtualizarRodada() {
    if(!rodadaCartola) return toast.error("Informe a rodada do Cartola.")
    setLoading(true)
    const res = await atualizarRodadaPontosCorridos(campeonatoId, rodadaView, Number(rodadaCartola))
    if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
    setLoading(false)
  }

  function abrirModalEdicao(jogo: any) {
      setEditingId(jogo.id)
      setTempCasa(jogo.placar_casa ?? '')
      setTempVisitante(jogo.placar_visitante ?? '')
      
      const casa = Array.isArray(jogo.casa) ? jogo.casa[0] : jogo.casa;
      const visitante = Array.isArray(jogo.visitante) ? jogo.visitante[0] : jogo.visitante;
      setTimeCasaNome(casa?.nome || 'Casa')
      setTimeVisitanteNome(visitante?.nome || 'Visitante')
      setEscudoCasa(casa?.escudo || '/shield-placeholder.png')
      setEscudoVisitante(visitante?.escudo || '/shield-placeholder.png')
  }

  async function salvarPlacar() {
    if(!editingId) return
    setSaving(true)
    try {
        await atualizarPlacarManual(editingId, Number(tempCasa), Number(tempVisitante))
        toast.success("Placar atualizado!")
        await carregarDados()
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar.")
    } finally {
        setSaving(false)
        setEditingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn items-start pb-20">
      <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
      
      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
                <div className="bg-gray-900/50 p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <PlayCircle size={16} className="text-yellow-500" /> Editar Resultado
                    </h3>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="p-8">
                    <div className="flex justify-between items-center gap-4 mb-8">
                        <div className="flex flex-col items-center w-1/3">
                            <img src={escudoCasa} alt={timeCasaNome} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase text-center line-clamp-1">{timeCasaNome}</span>
                            <input type="number" autoFocus className="mt-2 w-20 h-16 bg-black border border-gray-700 focus:border-blue-500 text-white text-3xl font-black text-center rounded-xl outline-none transition" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                        </div>
                        <span className="text-gray-600 font-black text-2xl mt-4">X</span>
                        <div className="flex flex-col items-center w-1/3">
                            <img src={escudoVisitante} alt={timeVisitanteNome} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase text-center line-clamp-1">{timeVisitanteNome}</span>
                            <input type="number" className="mt-2 w-20 h-16 bg-black border border-gray-700 focus:border-blue-500 text-white text-3xl font-black text-center rounded-xl outline-none transition" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setEditingId(null)} disabled={saving} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition text-xs uppercase tracking-wider disabled:opacity-50">Cancelar</button>
                        <button onClick={salvarPlacar} disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 transition text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <RefreshCw className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />} {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* CLASSIFICAÇÃO */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#121212] p-5 rounded-2xl border border-gray-800 shadow-lg gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg"><Trophy className="text-yellow-500 w-6 h-6" /></div>
                <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">Classificação</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Pontos Corridos</p>
                </div>
            </div>

            <div className="flex gap-2 items-center w-full md:w-auto">
              
                <button onClick={handleRecalcular} disabled={loading} className="flex-1 md:flex-none items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex justify-center disabled:opacity-50">
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? '...' : 'Recalcular'}
                </button>
                {jogos.length === 0 ? (
                    <button onClick={handleGerar} className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition shadow-lg shadow-green-900/20">Gerar Tabela</button>
                ) : (
                    <button onClick={handleReset} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-red-500 hover:bg-red-900/10 border border-red-900/30 px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">
                        <Trash2 size={12} /> Resetar
                    </button>
                )}
            </div>
        </div>

        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="bg-black text-gray-500 uppercase font-bold text-[10px] tracking-widest border-b border-gray-800">
                        <tr>
                            <th className="py-4 pl-6 text-center w-[5%]">Pos</th>
                            <th className="py-4 px-4 w-[35%]">Clube</th>
                            <th className="py-4 text-center text-white font-black w-[8%] bg-white/[0.05]">PTS</th>
                            <th className="py-4 text-center w-[6%]">J</th>
                            <th className="py-4 text-center w-[6%]">V</th>
                            <th className="py-4 text-center w-[6%]">E</th>
                            <th className="py-4 text-center w-[6%]">D</th>
                            <th className="py-4 text-center w-[7%] text-gray-400" title="Pró">PP</th>
                            <th className="py-4 text-center w-[7%] text-gray-400" title="Contra">PC</th>
                            <th className="py-4 text-center w-[8%] font-bold text-gray-300" title="Saldo">SP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {tabela.map((t, i) => {
                            const timeInfo = Array.isArray(t.times) ? t.times[0] : t.times;
                            const escudo = timeInfo?.escudo || '/shield-placeholder.png';
                            const nome = timeInfo?.nome || 'Time Desconhecido';
                            const isG4 = i < 4;
                            const isZ4 = i >= tabela.length - 4 && tabela.length > 4;
                            return (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition duration-200 group relative">
                                <td className="py-3 pl-6 text-center relative">
                                    {isG4 && <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div>}
                                    {isZ4 && <div className="absolute left-0 top-1 bottom-1 w-1 bg-red-600 rounded-r-full shadow-[0_0_10px_rgba(220,38,38,0.4)]"></div>}
                                    <span className={`font-black text-sm ${isG4 ? 'text-blue-400' : isZ4 ? 'text-red-500' : 'text-gray-600'}`}>{i + 1}º</span>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <img src={escudo} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" alt={nome} />
                                        <span className={`font-bold text-sm transition ${isZ4 ? 'text-gray-400 group-hover:text-red-400' : 'text-gray-300 group-hover:text-white'} whitespace-nowrap`}>{nome}</span>
                                    </div>
                                </td>
                                <td className="py-3 text-center font-black text-white bg-white/[0.03] text-sm shadow-inner">{t.pts}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.pj}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.v}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.e}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.d}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.gp}</td>
                                <td className="py-3 text-center text-gray-500 font-mono">{t.gc}</td>
                                <td className={`py-3 text-center font-mono font-bold ${t.sg > 0 ? 'text-green-500' : (t.sg < 0 ? 'text-red-500' : 'text-gray-500')}`}>{t.sg}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* JOGOS */}
      <div className="lg:col-span-1 space-y-6">
         <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 sticky top-6 shadow-xl h-fit">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Calendar className="text-yellow-500 w-4 h-4" /> Jogos</h3>
                <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                    <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">‹</button>
                    <span className="text-[10px] font-black px-3 text-yellow-500 uppercase tracking-widest">R{rodadaView}</span>
                    <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">›</button>
                </div>
            </div>
            <div className="flex gap-2 mb-6 shrink-0">
                <input type="number" placeholder="Rodada Cartola" className="flex-1 bg-black border border-gray-800 text-white text-[11px] font-bold p-3 rounded-lg focus:border-yellow-500 outline-none transition" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)} />
                <button onClick={handleAtualizarRodada} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-[10px] font-bold uppercase transition disabled:opacity-50">{loading ? <RefreshCw className="animate-spin w-4 h-4"/> : 'Atualizar'}</button>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                {jogosDaRodada.length === 0 && <div className="text-center text-gray-600 text-xs py-10 border border-dashed border-gray-800 rounded-xl">Sem jogos.</div>}
                {jogosDaRodada.map(j => {
                    const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                    const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                    const finalizado = j.status === 'finalizado';
                    const cVenceu = finalizado && (j.placar_casa ?? 0) > (j.placar_visitante ?? 0);
                    const vVenceu = finalizado && (j.placar_visitante ?? 0) > (j.placar_casa ?? 0);
                    return (
                    <div key={j.id} onClick={() => abrirModalEdicao(j)} className="bg-black/40 border border-gray-800/50 p-4 rounded-xl cursor-pointer hover:border-yellow-500/50 hover:bg-white/[0.02] transition group relative overflow-hidden">
                        {finalizado && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-bl-lg"></div>}
                        <div className="flex justify-between items-center text-xs mt-1">
                            <div className="flex items-center justify-end gap-3 w-[40%]">
                                <span className={`text-[10px] font-bold text-right leading-tight ${cVenceu ? 'text-green-400' : 'text-gray-400'}`}>{casa?.nome || 'Time'}</span>
                                <img src={casa?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain drop-shadow-md" />
                            </div>
                            <div className={`border px-2 py-1.5 rounded-lg text-sm font-black font-mono flex items-center justify-center min-w-[50px] ${finalizado ? 'bg-[#151515] border-gray-800' : 'bg-[#0a0a0a] border-gray-800 text-gray-600'}`}>
                                <span className={cVenceu ? 'text-green-400' : 'text-white'}>{j.placar_casa ?? '-'}</span><span className="text-gray-700 mx-1">:</span><span className={vVenceu ? 'text-green-400' : 'text-white'}>{j.placar_visitante ?? '-'}</span>
                            </div>
                            <div className="flex items-center justify-start gap-3 w-[40%]">
                                <img src={visitante?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain drop-shadow-md" />
                                <span className={`text-[10px] font-bold text-left leading-tight ${vVenceu ? 'text-green-400' : 'text-gray-400'}`}>{visitante?.nome || 'Time'}</span>
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