'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { adicionarTimeAoCampeonato, removerTimeDaLiga, substituirTimeNaLiga } from '@/app/actions'
import { ModalConfirmacao } from './ModalConfirmacao'
import { RefreshCw } from 'lucide-react' // <-- Adicionado ícone novo

interface Props {
  campeonatoId: number
  timesLiga: any[]
  todosTimes: any[]
  aoAtualizar: () => void 
  ativo?: boolean 
}

export default function PainelTimes({ campeonatoId, timesLiga, todosTimes, aoAtualizar }: Props) {
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [timeParaRemover, setTimeParaRemover] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // --- ESTADOS PARA SUBSTITUIÇÃO ---
  const [substituicaoModalOpen, setSubstituicaoModalOpen] = useState(false)
  const [timeSaindo, setTimeSaindo] = useState<any>(null)
  const [timeEntrando, setTimeEntrando] = useState<number | ''>('')
  const [substituindo, setSubstituindo] = useState(false)

  const timesDisponiveis = todosTimes.filter(
    t => !timesLiga.some(participante => participante.time_id === t.id)
  )

  const timesFiltrados = timesDisponiveis.filter(t => 
    t.nome.toLowerCase().includes(busca.toLowerCase()) || 
    t.nome_cartola?.toLowerCase().includes(busca.toLowerCase())
  )

  async function handleAdd(timeId: number) {
    const res = await adicionarTimeAoCampeonato(campeonatoId, timeId)
    if (res.success) {
      toast.success("Time adicionado!")
      aoAtualizar()
    } else {
      toast.error(res.msg || "Erro ao adicionar")
    }
  }

  function confirmarRemocao(timeId: number) {
    setTimeParaRemover(timeId)
    setModalOpen(true)
  }

  async function handleRemove() {
    if (!timeParaRemover) return
    setLoading(true)
    const res = await removerTimeDaLiga(campeonatoId, timeParaRemover)
    setLoading(false)
    setModalOpen(false)
    
    if (res.success) {
      toast.success("Time removido!")
      aoAtualizar()
    } else {
      toast.error(res.msg || "Erro ao remover")
    }
  }

  // --- LÓGICA DE SUBSTITUIÇÃO ---
  function abrirModalSubstituicao(time: any) {
    setTimeSaindo(time)
    setTimeEntrando('')
    setSubstituicaoModalOpen(true)
  }

  async function handleSubstituir() {
    if (!timeSaindo || !timeEntrando) return
    setSubstituindo(true)
    const res = await substituirTimeNaLiga(campeonatoId, timeSaindo.id, Number(timeEntrando))
    setSubstituindo(false)
    setSubstituicaoModalOpen(false)
    
    if (res.success) {
      toast.success(res.msg)
      aoAtualizar()
    } else {
      toast.error(res.msg)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fadeIn items-start">
      
      {/* MODAL DE REMOÇÃO */}
      <ModalConfirmacao 
        isOpen={modalOpen} 
        titulo="Remover Time" 
        descricao="Tem certeza que deseja remover este time do campeonato? Isso apagará todos os jogos e o histórico dele nesta liga."
        corBotao="red"
        textoBotao={loading ? "Removendo..." : "Remover"}
        onConfirm={handleRemove} 
        onClose={() => setModalOpen(false)} 
      />

      {/* MODAL DE SUBSTITUIÇÃO */}
      {substituicaoModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg"><RefreshCw className="text-blue-500 w-6 h-6" /></div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Substituir Time</h3>
              </div>
              
              <p className="text-gray-400 text-xs mb-6">
                O time substituto vai assumir a vaga, os jogos agendados e os pontos já conquistados pelo <strong className="text-gray-200">{timeSaindo?.nome}</strong> na tabela. O calendário não será quebrado.
              </p>
              
              <div className="mb-6">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Selecione o Substituto</label>
                <select 
                  value={timeEntrando} 
                  onChange={e => setTimeEntrando(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:border-blue-500 outline-none cursor-pointer transition font-bold text-sm"
                >
                  <option value="" disabled>-- Escolha um time do banco --</option>
                  {timesDisponiveis.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSubstituicaoModalOpen(false)} 
                  disabled={substituindo}
                  className="flex-1 bg-gray-800 text-gray-300 py-3.5 rounded-xl font-black hover:bg-gray-700 transition uppercase tracking-wider text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubstituir} 
                  disabled={substituindo || !timeEntrando}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-black hover:bg-blue-500 transition uppercase tracking-wider text-xs disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  {substituindo ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar Troca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLUNA ESQUERDA: BANCO DE TIMES */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800 shadow-lg sticky top-6">
          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-xl">🔍</span> Adicionar Times
          </h3>
          
          <div className="relative mb-4">
            <input 
              type="text" 
              placeholder="Buscar time..." 
              className="w-full bg-black border border-gray-700 text-white p-3 rounded-xl focus:border-green-500 outline-none transition"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <span className="absolute right-4 top-3.5 text-gray-500 text-xs font-bold">
              {timesFiltrados.length} encontrados
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {timesFiltrados.length === 0 && (
              <div className="text-center text-gray-600 py-8 text-xs">Nenhum time encontrado.</div>
            )}
            
            {timesFiltrados.map(t => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-[#0a0a0a] border border-gray-800 rounded-xl hover:border-green-600/50 transition group">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <img src={t.escudo} className="w-8 h-8 object-contain" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-300 group-hover:text-white truncate max-w-[150px]">{t.nome}</span>
                        <span className="text-[10px] text-gray-600">{t.nome_cartola}</span>
                    </div>
                 </div>
                 <button 
                    onClick={() => handleAdd(t.id)} 
                    className="bg-green-600 hover:bg-green-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-green-900/20 transition"
                 >
                    +
                 </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: TIMES PARTICIPANTES */}
      <div className="xl:col-span-8 space-y-6">
        <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="text-xl">🛡️</span> Times Participantes
                </h3>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">
                    {timesLiga.length} Confirmados
                </span>
            </div>

            {timesLiga.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl bg-black/20">
                    <p className="text-gray-500">Nenhum time adicionado ainda.</p>
                    <p className="text-gray-700 text-sm mt-2">Use a busca ao lado para adicionar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {timesLiga.map(item => {
                        const time = item.times; 
                        if (!time) return null;
                        
                        return (
                        <div key={time.id} className="relative group bg-[#0a0a0a] border border-gray-800 p-5 rounded-2xl flex flex-col items-center gap-3 hover:border-gray-600 transition-all hover:-translate-y-1 hover:shadow-xl">
                            
                            {/* Botão de Substituir (Esquerda) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); abrirModalSubstituicao(time); }}
                                className="absolute top-2 left-2 w-7 h-7 bg-gray-800 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg flex items-center justify-center transition-colors z-10"
                                title="Substituir time na liga"
                            >
                                <RefreshCw size={14} />
                            </button>

                            {/* Botão de Remover (Direita) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); confirmarRemocao(time.id); }}
                                className="absolute top-2 right-2 w-7 h-7 bg-gray-800 text-gray-500 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-colors z-10"
                                title="Remover time"
                            >
                                <span className="text-sm font-bold">×</span>
                            </button>

                            <div className="w-16 h-16 relative mt-4">
                                <img src={time.escudo} className="w-full h-full object-contain drop-shadow-md" />
                            </div>
                            
                            <div className="text-center w-full">
                                <h4 className="text-sm font-bold text-gray-200 truncate w-full">{time.nome}</h4>
                                <p className="text-[10px] text-gray-600 truncate">{time.nome_cartola}</p>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}