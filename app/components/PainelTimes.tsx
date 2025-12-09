'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { adicionarTimeAoCampeonato, removerTimeDaLiga } from '../actions'
import ModalConfirmacao from './ModalConfirmacao'

interface Props {
  campeonatoId: number
  timesLiga: any[]
  todosTimes: any[]
  aoAtualizar: () => void // Função para recarregar dados na página pai
}

export default function PainelTimes({ campeonatoId, timesLiga, todosTimes, aoAtualizar }: Props) {
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [timeParaRemover, setTimeParaRemover] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtra times que AINDA NÃO estão na liga
  const timesDisponiveis = todosTimes.filter(
    t => !timesLiga.some(participante => participante.time_id === t.id)
  )

  // Filtra pela busca
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fadeIn items-start">
      <ModalConfirmacao 
        isOpen={modalOpen} 
        titulo="Remover Time" 
        mensagem="Tem certeza que deseja remover este time do campeonato? Isso apagará o histórico dele nesta liga."
        tipo="perigo"
        onConfirm={handleRemove} 
        onCancel={() => setModalOpen(false)} 
      />

      {/* COLUNA ESQUERDA: BANCO DE TIMES (ADICIONAR) */}
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

      {/* COLUNA DIREITA: TIMES PARTICIPANTES (REMOVER) */}
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
                        const time = item.times; // Acesso seguro ao objeto time
                        return (
                        <div key={item.id} className="relative group bg-[#0a0a0a] border border-gray-800 p-5 rounded-2xl flex flex-col items-center gap-3 hover:border-gray-600 transition-all hover:-translate-y-1 hover:shadow-xl">
                            
                            {/* Botão de Remover (Posição Absoluta corrigida para não bugar layout) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); confirmarRemocao(time.id); }}
                                className="absolute top-2 right-2 w-7 h-7 bg-gray-800 text-gray-500 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-colors z-10"
                                title="Remover time"
                            >
                                <span className="text-sm font-bold">×</span>
                            </button>

                            <div className="w-16 h-16 relative">
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