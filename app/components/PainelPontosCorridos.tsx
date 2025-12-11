'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  gerarJogosPontosCorridos, atualizarRodadaPontosCorridos, 
  buscarTabelaPontosCorridos, zerarJogos, atualizarPlacarManual, listarPartidas, recalcularTabelaPontosCorridos 
} from '../actions'
import ModalConfirmacao from './ModalConfirmacao'

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
  
  // Controle para ajuste automático da rodada (apenas na 1ª carga)
  const [viewAdjusted, setViewAdjusted] = useState(false)
  
  // Modal e Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  useEffect(() => { 
      if (campeonatoId) carregarDados() 
  }, [campeonatoId])

  async function carregarDados() {
    const dadosTabela = await buscarTabelaPontosCorridos(campeonatoId)
    setTabela(dadosTabela)
    
    const dadosJogos = await listarPartidas(campeonatoId)
    setJogos(dadosJogos)

    // --- LÓGICA DE SELEÇÃO AUTOMÁTICA DA RODADA ATUAL ---
    if (!viewAdjusted && dadosJogos.length > 0) {
        // Procura rodadas que tenham jogos NÃO finalizados
        const rodadasPendentes = dadosJogos
            .filter((j: any) => j.status !== 'finalizado')
            .map((j: any) => j.rodada);
        
        let rodadaInicial = 1;

        if (rodadasPendentes.length > 0) {
            // Se houver pendências, vai para a menor rodada pendente
            rodadaInicial = Math.min(...rodadasPendentes);
        } else {
            // Se tudo finalizado, vai para a última
            const todasRodadas = dadosJogos.map((j: any) => j.rodada);
            rodadaInicial = Math.max(...todasRodadas);
        }

        setRodadaView(rodadaInicial);
        setViewAdjusted(true); // Trava para não mudar mais sozinho
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
       const res = await gerarJogosPontosCorridos(campeonatoId)
       if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
    })
  }

  async function handleReset() {
    confirm("Resetar", "Apagar jogos e zerar pontos?", async () => {
       await zerarJogos(campeonatoId)
       carregarDados()
       toast.success("Resetado.")
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
    if(!rodadaCartola) return toast.error("Informe a rodada.")
    setLoading(true)
    const res = await atualizarRodadaPontosCorridos(campeonatoId, rodadaView, Number(rodadaCartola))
    if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
    setLoading(false)
  }

  async function salvarPlacar() {
    if(!editingId) return
    await atualizarPlacarManual(editingId, Number(tempCasa), Number(tempVisitante))
    setEditingId(null)
    carregarDados() 
    toast.success("Salvo!")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn items-start">
      <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
      
      {/* Modal Edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="bg-[#121212] p-8 rounded-2xl border border-gray-800 w-96 shadow-2xl shadow-black transform scale-100 transition-all">
                <h3 className="text-white mb-8 text-center font-black text-xl tracking-widest uppercase">Editar Placar</h3>
                <div className="flex justify-center items-center gap-6 mb-8">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold mb-2 uppercase">Casa</span>
                        <input type="number" className="w-20 h-20 bg-black border border-gray-700 focus:border-blue-600 text-white text-4xl font-black text-center rounded-2xl outline-none transition" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    </div>
                    <span className="text-gray-600 font-black text-2xl mt-4">X</span>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold mb-2 uppercase">Visitante</span>
                        <input type="number" className="w-20 h-20 bg-black border border-gray-700 focus:border-blue-600 text-white text-4xl font-black text-center rounded-2xl outline-none transition" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-900 text-gray-400 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition text-xs uppercase tracking-wider">Cancelar</button>
                    <button onClick={salvarPlacar} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20">Salvar Resultado</button>
                </div>
            </div>
        </div>
      )}

      {/* COLUNA 1: TABELA DE CLASSIFICAÇÃO */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center bg-[#121212] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="text-2xl">🏆</span> Classificação Oficial
                </h3>
            </div>
            <div className="flex gap-3">
                 <button onClick={handleRecalcular} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">
                    {loading ? '...' : 'Recalcular'}
                </button>
                {jogos.length === 0 ? (
                    <button onClick={handleGerar} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition shadow-lg shadow-green-900/20">Gerar Tabela</button>
                ) : (
                    <button onClick={handleReset} className="text-red-500 hover:bg-red-900/10 border border-red-900/30 px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">Resetar</button>
                )}
            </div>
        </div>

        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="bg-black text-gray-500 uppercase font-bold text-[10px] tracking-widest border-b border-gray-800">
                        <tr>
                            <th className="py-4 pl-6 text-center w-[5%]">Pos</th>
                            <th className="py-4 px-4 w-[35%]">Clube</th>
                            <th className="py-4 text-center text-white font-black w-[8%] bg-white/[0.03]">PTS</th>
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
                                <td className="py-4 pl-6 text-center relative">
                                    {isG4 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                                    {isZ4 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>}
                                    <span className={`font-black text-sm ${isG4 ? 'text-blue-400' : isZ4 ? 'text-red-500' : 'text-gray-600'}`}>{i + 1}</span>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <img src={escudo} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" alt={nome} />
                                        <span className={`font-bold text-sm transition ${isZ4 ? 'text-gray-400 group-hover:text-red-400' : 'text-gray-300 group-hover:text-white'} whitespace-nowrap`}>{nome}</span>
                                    </div>
                                </td>
                                <td className="py-4 text-center font-black text-white bg-white/[0.03] text-sm shadow-inner">{t.pts}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.pj}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.v}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.e}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.d}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.gp}</td>
                                <td className="py-4 text-center text-gray-500 font-mono">{t.gc}</td>
                                <td className={`py-4 text-center font-mono font-bold ${t.sg > 0 ? 'text-green-500' : (t.sg < 0 ? 'text-red-500' : 'text-gray-500')}`}>{t.sg}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
            {tabela.length === 0 && (
                <div className="p-16 text-center text-gray-600">
                    <p className="mb-2">Nenhum dado encontrado.</p>
                    <p className="text-xs">Adicione times e gere a tabela.</p>
                </div>
            )}
        </div>
        
        <div className="flex gap-6 px-4 text-[10px] uppercase font-bold tracking-widest text-gray-500">
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Classificação (G4)</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-600 rounded-full"></div> Rebaixamento (Z4)</div>
        </div>
      </div>

      {/* COLUNA 2: JOGOS (Cards Melhorados com Destaque Verde) */}
      <div className="lg:col-span-1 space-y-6">
         <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 sticky top-6 shadow-xl h-fit">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Jogos
                </h3>
                <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                    <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">‹</button>
                    <span className="text-[10px] font-black px-3 text-yellow-500 uppercase tracking-widest">R{rodadaView}</span>
                    <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">›</button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 shrink-0">
                <div className="flex-1 relative">
                    <input type="number" placeholder="Rodada Cartola" className="w-full bg-black border border-gray-800 text-white text-[11px] font-bold p-3 rounded-lg focus:border-yellow-500 outline-none transition placeholder:text-gray-600" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)} />
                </div>
                <button onClick={handleAtualizarRodada} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-[10px] font-bold uppercase transition shadow-lg shadow-blue-900/20 tracking-wider">
                    {loading ? '...' : 'Atualizar'}
                </button>
            </div>

            <div className="space-y-3">
                {jogosDaRodada.length === 0 && <div className="text-center text-gray-600 text-xs py-10">Sem jogos nesta rodada.</div>}
                
                {jogosDaRodada.map(j => {
                    const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                    const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                    
                    const finalizado = j.status === 'finalizado';
                    const placarC = j.placar_casa ?? 0;
                    const placarV = j.placar_visitante ?? 0;
                    
                    // Lógica de Vencedor (Verde)
                    const cVenceu = finalizado && placarC > placarV;
                    const vVenceu = finalizado && placarV > placarC;

                    return (
                    <div key={j.id} onClick={() => { setEditingId(j.id); setTempCasa(j.placar_casa); setTempVisitante(j.placar_visitante); }} className="bg-black/40 border border-gray-800/50 p-4 rounded-xl cursor-pointer hover:border-yellow-500/50 hover:bg-white/[0.02] transition group relative overflow-hidden">
                        
                        {finalizado && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-bl-lg shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        )}

                        <div className="flex justify-between items-center text-xs mt-1">
                            {/* Mandante (Direita) */}
                            <div className="flex items-center justify-end gap-3 w-[40%]">
                                <span className={`text-[10px] font-bold text-right leading-tight break-words ${cVenceu ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {casa?.nome || 'Time'}
                                </span>
                                <img src={casa?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain drop-shadow-md" />
                            </div>
                            
                            {/* Placar */}
                            <div className={`
                                border px-2 py-1.5 rounded-lg text-sm font-black font-mono transition whitespace-nowrap shadow-inner flex items-center justify-center min-w-[50px]
                                ${finalizado ? 'bg-[#151515] border-gray-800' : 'bg-[#0a0a0a] border-gray-800 text-gray-600'}
                            `}>
                                <span className={cVenceu ? 'text-green-400' : 'text-white'}>{j.placar_casa ?? '-'}</span>
                                <span className="text-gray-700 mx-1">:</span>
                                <span className={vVenceu ? 'text-green-400' : 'text-white'}>{j.placar_visitante ?? '-'}</span>
                            </div>
                            
                            {/* Visitante (Esquerda) */}
                            <div className="flex items-center justify-start gap-3 w-[40%]">
                                <img src={visitante?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain drop-shadow-md" />
                                <span className={`text-[10px] font-bold text-left leading-tight break-words ${vVenceu ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {visitante?.nome || 'Time'}
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