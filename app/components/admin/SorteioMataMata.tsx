'use client'

import { useState, useEffect } from 'react'
import { listarTimesDoCampeonato, gerarMataMataInteligente } from '../../actions'
import toast from 'react-hot-toast'
import { ChevronUp, ChevronDown, Zap, GripVertical, ListOrdered, Layers3, Shuffle, Eye, Check, RotateCcw } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Props {
  campeonatoId: number
  onSucesso?: () => void
}

export default function SorteioMataMata({ campeonatoId, onSucesso }: Props) {
  const [timesOrdenados, setTimesOrdenados] = useState<any[]>([])
  const [modo, setModo] = useState<'seeds' | 'potes'>('seeds')
  const [potes, setPotes] = useState<any[][]>([[], []])
  const [loading, setLoading] = useState(false)
  const [dndPronto, setDndPronto] = useState(false)
  const [potesSorteados, setPotesSorteados] = useState<any[][] | null>(null)
  const [confrontosRevelados, setConfrontosRevelados] = useState(0)

  useEffect(() => {
    setDndPronto(true)
  }, [])

  useEffect(() => {
    async function load() {
        try {
          const dados = await listarTimesDoCampeonato(campeonatoId)
          const times = dados || []
          setTimesOrdenados(times)
          const metade = Math.ceil(times.length / 2)
          setPotes([times.slice(0, metade), times.slice(metade)])
        } catch (e) {
          console.error(e)
          toast.error('Erro ao carregar times.')
        }
    }
    load()
  }, [campeonatoId])

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

  function onDragEnd(result: DropResult) {
      const { source, destination } = result
      if (!destination) return

      if (modo === 'potes') {
        const origem = Number(source.droppableId.replace('pote-', ''))
        const destino = Number(destination.droppableId.replace('pote-', ''))
        if (origem === destino && destination.index === source.index) return

        const novosPotes = potes.map(pote => [...pote])
        if (origem === destino) {
          const [timeMovido] = novosPotes[origem].splice(source.index, 1)
          novosPotes[destino].splice(destination.index, 0, timeMovido)
        } else {
          // Entre potes fazemos uma troca, preservando sempre a quantidade de times.
          const indexDestino = Math.min(destination.index, novosPotes[destino].length - 1)
          const timeOrigem = novosPotes[origem][source.index]
          const timeDestino = novosPotes[destino][indexDestino]
          novosPotes[origem][source.index] = timeDestino
          novosPotes[destino][indexDestino] = timeOrigem
        }
        setPotes(novosPotes)
        return
      }

      if (destination.index === source.index) return

      const novaLista = Array.from(timesOrdenados)
      const [timeMovido] = novaLista.splice(source.index, 1)
      novaLista.splice(destination.index, 0, timeMovido)
      setTimesOrdenados(novaLista)
  }

  function validarPotes() {
      if (potes.some(pote => pote.length === 0)) {
          toast.error('Os dois potes precisam ter pelo menos um time.')
          return false
      }
      if (Math.abs(potes[0].length - potes[1].length) > 1) {
          toast.error('Os potes precisam ter o mesmo tamanho (ou diferença máxima de 1 time).')
          return false
      }
      return true
  }

  function embaralhar<T>(lista: T[]) {
      const copia = [...lista]
      for (let i = copia.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[copia[i], copia[j]] = [copia[j], copia[i]]
      }
      return copia
  }

  function iniciarSorteioPassoAPasso() {
      if (!validarPotes()) return
      setPotesSorteados([embaralhar(potes[0]), embaralhar(potes[1])])
      setConfrontosRevelados(0)
  }

  async function handleGerarConfrontos(potesDefinidos?: any[][]) {
      // TRAVA 1: Se já estiver carregando, aborta imediatamente o clique extra
      if (loading) return; 
      
      if (timesOrdenados.length < 2) return toast.error("É necessário pelo menos 2 times.");
      
      setLoading(true) // Trava o botão
      
      const seeds = timesOrdenados.map(t => t.time_id)
      let idsPotes: number[][] = []

      if (modo === 'potes') {
          if (!validarPotes()) {
              setLoading(false)
              return
          }

          idsPotes = (potesDefinidos || potes).map(pote => pote.map(t => t.time_id))
      }

      // Gera o mata-mata
      const res = await gerarMataMataInteligente(campeonatoId, seeds, false, idsPotes, Boolean(potesDefinidos))
      
      if (res.success) {
          toast.success("Chaveamento criado! Atualizando...")
          
          if (onSucesso) onSucesso()

          // Mantemos o loading = true até a página recarregar para evitar cliques no limbo
          setTimeout(() => {
              window.location.reload()
          }, 1000)
          
      } else {
          toast.error(res.msg)
          setLoading(false) // Destrava apenas se der erro (ex: "Jogos já existem")
      }
  }

  if (potesSorteados) {
      const total = Math.max(potesSorteados[0].length, potesSorteados[1].length)
      const concluido = confrontosRevelados === total
      return (
        <div className="w-full mt-4 bg-[#121212] border border-yellow-500/20 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500"><Shuffle size={24} /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Sorteio dos confrontos</h3>
            <p className="text-xs text-gray-500 mt-1">{confrontosRevelados} de {total} jogos revelados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {Array.from({ length: total }).map((_, idx) => {
              const revelado = idx < confrontosRevelados
              const timeA = potesSorteados[0][idx]
              const timeB = potesSorteados[1][idx]
              return (
                <div key={idx} className={`rounded-xl border p-4 transition-all duration-500 ${revelado ? 'border-yellow-500/30 bg-yellow-500/[0.04]' : 'border-gray-800 bg-black/20'}`}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3">Confronto {idx + 1}</div>
                  {revelado ? (
                    <div className="flex items-center justify-between gap-3 animate-fadeIn">
                      {timeA ? <div className="flex flex-1 flex-col items-center gap-2 min-w-0 text-center"><img src={timeA.times?.escudo || '/shield-placeholder.png'} className="w-10 h-10 object-contain" alt="" /><span className="text-xs font-bold text-white truncate w-full">{timeA.times?.nome}</span></div> : <div className="flex-1 text-center text-xs font-black text-blue-400">BYE</div>}
                      <span className="text-xs font-black text-yellow-500">X</span>
                      {timeB ? <div className="flex flex-1 flex-col items-center gap-2 min-w-0 text-center"><img src={timeB.times?.escudo || '/shield-placeholder.png'} className="w-10 h-10 object-contain" alt="" /><span className="text-xs font-bold text-white truncate w-full">{timeB.times?.nome}</span></div> : <div className="flex-1 text-center text-xs font-black text-blue-400">BYE</div>}
                    </div>
                  ) : <div className="h-[66px] flex items-center justify-center text-gray-700"><Eye size={22} /></div>}
                </div>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => { setPotesSorteados(null); setConfrontosRevelados(0) }} disabled={loading} className="sm:w-auto px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"><RotateCcw size={15} /> Recomeçar</button>
            {!concluido ? (
              <button type="button" onClick={() => setConfrontosRevelados(v => Math.min(v + 1, total))} className="flex-1 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"><Eye size={18} /> Sortear próximo jogo</button>
            ) : (
              <button type="button" onClick={() => handleGerarConfrontos(potesSorteados)} disabled={loading} className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Zap className="animate-spin" /> : <Check size={18} />} Confirmar e gerar chave</button>
            )}
          </div>
        </div>
      )
  }

  return (
    <div className="w-full mt-4 bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-6 text-center">
            <h3 className="text-white font-bold text-lg mb-1 flex items-center justify-center gap-2">
                {modo === 'seeds' ? <GripVertical size={20} className="text-gray-500" /> : <Layers3 size={20} className="text-yellow-500" />}
                {modo === 'seeds' ? 'Definição de Seeds (Ranking)' : 'Sorteio por Potes'}
            </h3>
            <p className="text-gray-500 text-xs max-w-md mx-auto">
                {modo === 'seeds'
                  ? <>Arraste os times ou use as setas para ordenar. O 1º da lista será o <strong>Cabeça de Chave #1</strong>.</>
                  : <>Distribua os times nos potes. O sorteio cruza um time do <strong>Pote 1</strong> com um do <strong>Pote 2</strong>.</>}
            </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl bg-black/30 p-1.5 border border-white/5">
          <button
            type="button"
            onClick={() => setModo('seeds')}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition ${modo === 'seeds' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <ListOrdered size={15} /> Seeds
          </button>
          <button
            type="button"
            onClick={() => setModo('potes')}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition ${modo === 'potes' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Layers3 size={15} /> Potes
          </button>
        </div>

        {dndPronto && modo === 'potes' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {potes.map((pote, poteIdx) => (
              <div key={poteIdx} className="rounded-xl border border-gray-800 bg-black/20 p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-yellow-500">Pote {poteIdx + 1}</span>
                  <span className="text-[10px] font-bold text-gray-600">{pote.length} times</span>
                </div>
                <Droppable droppableId={`pote-${poteIdx}`} isDropDisabled={loading}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-24 space-y-2 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-yellow-500/5' : ''}`}
                    >
                      {pote.map((t, idx) => (
                        <Draggable key={String(t.time_id)} draggableId={String(t.time_id)} index={idx} isDragDisabled={loading}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                              className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'border-yellow-500 bg-[#222] shadow-xl' : 'border-gray-800 bg-[#1a1a1a]'}`}
                            >
                              <GripVertical size={14} className="text-gray-600 shrink-0" />
                              {t.times?.escudo ? <img src={t.times.escudo} className="w-7 h-7 object-contain shrink-0" alt="" draggable={false} /> : <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />}
                              <span className="truncate text-xs font-bold text-gray-300">{t.times?.nome}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
        ) : dndPronto ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="seeds" isDropDisabled={loading}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 bg-black/20 p-2 rounded-xl border border-white/5 transition-colors ${snapshot.isDraggingOver ? 'border-blue-500/30 bg-blue-500/[0.03]' : ''}`}
              >
                {timesOrdenados.map((t, idx) => (
                  <Draggable
                    key={String(t.time_id)}
                    draggableId={String(t.time_id)}
                    index={idx}
                    isDragDisabled={loading}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={provided.draggableProps.style}
                        className={`flex items-center justify-between bg-[#1a1a1a] p-3 rounded-lg border transition group ${
                          snapshot.isDragging
                            ? 'border-blue-500 shadow-xl shadow-black/50 z-50 scale-[1.02]'
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            {...provided.dragHandleProps}
                            className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5"
                            aria-label={`Arrastar ${t.times?.nome || 'time'}`}
                            disabled={loading}
                          >
                            <GripVertical size={16} />
                          </button>
                          <span className={`font-mono font-bold text-xs w-8 text-right shrink-0 ${idx < 4 ? 'text-green-500' : 'text-gray-600'}`}>
                            #{idx + 1}
                          </span>
                          <div className="flex items-center gap-3 min-w-0">
                            {t.times?.escudo ? (
                              <img src={t.times.escudo} className="w-8 h-8 object-contain pointer-events-none shrink-0" alt="" draggable={false} />
                            ) : (
                              <div className="w-8 h-8 bg-gray-700 rounded-full shrink-0" />
                            )}
                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition truncate">
                              {t.times?.nome}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => moverTime(idx, 'cima')}
                            className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md transition disabled:opacity-20"
                            disabled={idx === 0 || loading}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverTime(idx, 'baixo')}
                            className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md transition disabled:opacity-20"
                            disabled={idx === timesOrdenados.length - 1 || loading}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        ) : (
          <div className="space-y-2 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 bg-black/20 p-2 rounded-xl border border-white/5">
            {timesOrdenados.map((t, idx) => (
              <div key={String(t.time_id)} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono font-bold text-xs w-8 text-right shrink-0 ${idx < 4 ? 'text-green-500' : 'text-gray-600'}`}>
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-bold text-gray-300 truncate">{t.times?.nome}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`grid gap-3 ${modo === 'potes' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {modo === 'potes' && (
            <button type="button" onClick={iniciarSorteioPassoAPasso} disabled={loading || timesOrdenados.length < 2} className="w-full border border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 font-black py-4 rounded-xl uppercase tracking-widest text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"><Eye size={18} /> Sortear jogo a jogo</button>
          )}
          <button
              onClick={() => handleGerarConfrontos()}
              disabled={loading || timesOrdenados.length < 2}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-4 rounded-xl uppercase tracking-widest text-sm transition shadow-lg shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
              {loading ? <Zap className="animate-spin" /> : modo === 'potes' ? <Shuffle /> : <Zap fill="black" />}
              {loading ? 'Processando...' : modo === 'potes' ? 'Sortear tudo' : '⚡ Gerar Chave Final'}
          </button>
        </div>
    </div>
  )
}
