'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { adicionarTimeAoCampeonato, removerTimeDaLiga, substituirTimeNaLiga } from '@/app/actions'
import { ModalConfirmacao } from './ModalConfirmacao'
import { RefreshCw, Search, Users, Plus, X, ArrowRightLeft, ShieldCheck } from 'lucide-react'

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
  const [adicionandoId, setAdicionandoId] = useState<number | null>(null)

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
    setAdicionandoId(timeId)
    const res = await adicionarTimeAoCampeonato(campeonatoId, timeId)
    if (res.success) {
      toast.success("Time adicionado!")
      aoAtualizar()
    } else {
      toast.error(res.msg || "Erro ao adicionar")
    }
    setAdicionandoId(null)
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
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#121411] shadow-2xl animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl border border-[#f4b900]/20 bg-[#f4b900]/10 p-2.5"><ArrowRightLeft className="h-5 w-5 text-[#f4b900]" /></div>
                <div><h3 className="text-lg font-black text-white">Substituir participante</h3><p className="text-[11px] text-slate-500">Troca segura sem perder o histórico</p></div>
              </div>
              
              <p className="text-gray-400 text-xs mb-6">
                O time substituto vai assumir a vaga, os jogos agendados e os pontos já conquistados pelo <strong className="text-gray-200">{timeSaindo?.nome}</strong> na tabela. O calendário não será quebrado.
              </p>
              
              <div className="mb-6">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Selecione o Substituto</label>
                <select 
                  value={timeEntrando} 
                  /* CORREÇÃO DO TYPESCRIPT AQUI: CONVERSÃO PARA NUMBER */
                  onChange={e => setTimeEntrando(e.target.value ? Number(e.target.value) : '')}
                  className="w-full cursor-pointer rounded-xl border border-white/10 bg-[#080908] p-4 text-sm font-bold text-white outline-none transition focus:border-[#f4b900]/60"
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f4b900] py-3.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#ffd12a] disabled:opacity-50"
                >
                  {substituindo ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar Troca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLUNA ESQUERDA: BANCO DE TIMES */}
      <div className="space-y-6 xl:col-span-5">
        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111310] shadow-[0_20px_60px_rgba(0,0,0,.24)] xl:sticky xl:top-6">
          <div className="border-b border-white/8 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f4b900]/20 bg-[#f4b900]/10 text-[#f4b900]"><Search size={18}/></div>
                <div><h3 className="text-base font-black text-white">Adicionar participantes</h3><p className="text-[11px] text-slate-500">Escolha times cadastrados na base</p></div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-black text-slate-400">{timesDisponiveis.length} disponíveis</span>
            </div>
          </div>
          
          <div className="p-4 sm:p-5">
          <div className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
            <input 
              type="text" 
              placeholder="Nome do time ou treinador"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#080908] pl-11 pr-20 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#f4b900]/60"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
              {timesFiltrados.length} resultados
            </span>
          </div>

          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1 [scrollbar-color:#343a32_transparent] [scrollbar-width:thin]">
            {timesFiltrados.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center"><Search className="mx-auto mb-3 text-slate-700" size={24}/><p className="text-xs font-bold text-slate-500">Nenhum time encontrado</p><p className="mt-1 text-[10px] text-slate-700">Tente buscar por outro nome.</p></div>
            )}
            
            {timesFiltrados.map(t => (
              <div key={t.id} className="group flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#090a09] p-3 transition hover:border-[#f4b900]/25 hover:bg-[#0d0f0c]">
                 <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[.025] p-1.5"><img src={t.escudo} alt="" className="h-full w-full object-contain" /></div>
                    <div className="min-w-0">
                        <span className="block text-sm font-bold leading-tight text-slate-200 group-hover:text-white">{t.nome}</span>
                        <span className="mt-1 block text-[10px] text-slate-600">{t.nome_cartola || 'Treinador não informado'}</span>
                    </div>
                 </div>
                 <button 
                    onClick={() => handleAdd(t.id)} 
                    disabled={adicionandoId !== null}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 transition hover:bg-emerald-400 hover:text-black disabled:opacity-40"
                    title={`Adicionar ${t.nome}`}
                 >
                    {adicionandoId === t.id ? <RefreshCw size={15} className="animate-spin"/> : <Plus size={17}/>}<span className="sr-only">Adicionar {t.nome}</span>
                 </button>
              </div>
            ))}
          </div>
          </div>
        </section>
      </div>

      {/* COLUNA DIREITA: TIMES PARTICIPANTES */}
      <div className="space-y-6 xl:col-span-7">
        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111310] shadow-[0_20px_60px_rgba(0,0,0,.24)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400"><Users size={18}/></div>
                  <div><h3 className="text-base font-black text-white">Participantes confirmados</h3><p className="text-[11px] text-slate-500">Times que disputarão este campeonato</p></div>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.08em] text-emerald-400">
                    {timesLiga.length} {timesLiga.length === 1 ? 'time' : 'times'}
                </span>
            </div>

            {timesLiga.length === 0 ? (
                <div className="m-5 rounded-2xl border border-dashed border-white/10 bg-black/10 py-20 text-center">
                    <ShieldCheck className="mx-auto mb-4 text-slate-700" size={32}/><p className="text-sm font-bold text-slate-400">Nenhum participante adicionado</p>
                    <p className="mt-2 text-xs text-slate-600">Use a busca para montar a lista do campeonato.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
                    {timesLiga.map(item => {
                        const time = item.times; 
                        if (!time) return null;
                        
                        return (
                        <div key={time.id} className="group relative flex min-h-[78px] items-center gap-3 rounded-xl border border-white/8 bg-[#090a09] p-3 pr-20 transition hover:border-white/15 hover:bg-[#0d0f0c]">
                            
                            {/* Botão de Substituir (Esquerda) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); abrirModalSubstituicao(time); }}
                                className="absolute right-11 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-white/8 bg-white/[.035] text-slate-500 transition hover:border-[#f4b900]/30 hover:bg-[#f4b900]/10 hover:text-[#f4b900]"
                                title="Substituir time na liga"
                            >
                                <RefreshCw size={14} />
                            </button>

                            {/* Botão de Remover (Direita) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); confirmarRemocao(time.id); }}
                                className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-white/8 bg-white/[.035] text-slate-600 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                                title="Remover time"
                            >
                                <X size={14}/><span className="sr-only">Remover {time.nome}</span>
                            </button>

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[.025] p-1.5">
                                <img src={time.escudo} alt="" className="h-full w-full object-contain drop-shadow-md" />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold leading-tight text-slate-200">{time.nome}</h4>
                                <p className="mt-1 text-[10px] text-slate-600">{time.nome_cartola || 'Treinador não informado'}</p>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </section>
      </div>
    </div>
  )
}
