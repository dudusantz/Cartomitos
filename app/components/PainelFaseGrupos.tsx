'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabase'
import { 
  sortearGrupos, gerarJogosFaseGrupos, buscarTabelaGrupos, 
  buscarPreviaRodadaGrupos, atualizarRodadaGrupos, listarPartidas, atualizarPlacarManual 
} from '@/app/actions' 
import { ModalConfirmacao } from './ModalConfirmacao' 
import { RefreshCw, Save, X, Calendar, PlayCircle, GripVertical, Eye, Shuffle, Check, RotateCcw } from 'lucide-react'

interface Props {
  campeonatoId: number
  times?: any[] 
}

export default function PainelFaseGrupos({ campeonatoId, times = [] }: Props) {
  const [grupos, setGrupos] = useState<any>({})
  const [jogos, setJogos] = useState<any[]>([])
  
  // Controle de Rodadas
  const [rodadaView, setRodadaView] = useState(1)
  const [rodadaCartola, setRodadaCartola] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewAdjusted, setViewAdjusted] = useState(false)
  
  // PREVIEW E CONFIGURAÇÕES DINÂMICAS
  const [previewPlacares, setPreviewPlacares] = useState<Record<number, { casa: string, visitante: string }>>({});
  const [configZonas, setConfigZonas] = useState<any[]>([]);
  const [mensagemModal, setMensagemModal] = useState("");

  // Sorteio
  const [timesOrdenados, setTimesOrdenados] = useState<any[]>([])
  const [modoSorteio, setModoSorteio] = useState(false)
  const [potesSorteados, setPotesSorteados] = useState<any[][] | null>(null)
  const [itensRevelados, setItensRevelados] = useState(0)

  // Edição Manual
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

  useEffect(() => {
      if (times && times.length > 0) {
          setTimesOrdenados(prev => prev.length === times.length ? prev : [...times])
      }
  }, [times])

  useEffect(() => {
      setPreviewPlacares({})
  }, [rodadaView])

  async function carregarDados() {
    setLoading(true)

    // Busca as zonas dinâmicas e a mensagem salva no banco
    const { data: camp } = await supabase.from('campeonatos').select('config_zonas, mensagem_atualizacao').eq('id', campeonatoId).single();
    if (camp) {
        const zonasOrdenadas = Array.isArray(camp.config_zonas) ? camp.config_zonas.sort((a: any, b: any) => a.posicao - b.posicao) : [];
        setConfigZonas(zonasOrdenadas);
        setMensagemModal(camp.mensagem_atualizacao || "Deseja salvar os resultados definitivamente?");
    }

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

    if ((!dadosGrupos || Object.keys(dadosGrupos).length === 0) && jogosGrupos.length === 0) {
        setModoSorteio(true)
    } else {
        setModoSorteio(false)
        if (!viewAdjusted && jogosGrupos.length > 0) {
            const pendentes = jogosGrupos.filter((j: any) => j.status !== 'finalizado').map((j: any) => j.rodada)
            const r = pendentes.length > 0 ? Math.min(...pendentes) : Math.max(...jogosGrupos.map((j:any) => j.rodada))
            setRodadaView(r || 1)
            setViewAdjusted(true)
        }
    }
    setLoading(false)
  }

  function confirm(titulo: string, msg: string, action: () => void) {
    setModalConfig({ 
        titulo, 
        descricao: msg,
        onConfirm: async () => { await action(); setModalOpen(false) }, 
        corBotao: 'blue',
        textoBotao: 'Confirmar'
    })
    setModalOpen(true)
  }

  const numPotes = 4
  const timesPorPote = timesOrdenados.length > 0 ? Math.ceil(timesOrdenados.length / numPotes) : 0

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    const sourceGlobalIndex = (parseInt(source.droppableId) * timesPorPote) + source.index
    const destGlobalIndex = (parseInt(destination.droppableId) * timesPorPote) + destination.index
    const novosTimes = Array.from(timesOrdenados)
    const [timeMovido] = novosTimes.splice(sourceGlobalIndex, 1)
    novosTimes.splice(destGlobalIndex, 0, timeMovido)
    setTimesOrdenados(novosTimes)
  }

  function abrirTelaSorteio() { setGrupos({}); setModoSorteio(true); }

  async function handleSortear() {
    if (!timesOrdenados || timesOrdenados.length < 4) return toast.error("Mínimo 4 times para sortear.")
    const potes: number[][] = []
    for (let i = 0; i < numPotes; i++) {
        const slice = timesOrdenados.slice(i * timesPorPote, (i + 1) * timesPorPote)
        const ids = slice.map((t: any) => t.time_id)
        if (ids.length > 0) potes.push(ids)
    }

    confirm("Confirmar Sorteio", `Grupos atuais serão apagados e novos serão gerados. Confirmar?`, async () => {
        const res = await sortearGrupos(campeonatoId, timesPorPote, potes) 
        if(res.success) { 
            toast.success(res.msg); 
            await gerarJogosFaseGrupos(campeonatoId);
            await carregarDados();
        } else { 
            toast.error(res.msg) 
        }
    })
  }

  function montarPotes() {
    const potes: any[][] = []
    for (let i = 0; i < numPotes; i++) {
      const pote = timesOrdenados.slice(i * timesPorPote, (i + 1) * timesPorPote)
      if (pote.length > 0) potes.push(pote)
    }
    return potes
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
    if (!timesOrdenados || timesOrdenados.length < 4) return toast.error('Mínimo 4 times para sortear.')
    setPotesSorteados(montarPotes().map(embaralhar))
    setItensRevelados(0)
  }

  async function concluirSorteioPassoAPasso() {
    if (!potesSorteados || loading) return
    setLoading(true)
    const ids = potesSorteados.map(pote => pote.map((time: any) => time.time_id))
    const res = await sortearGrupos(campeonatoId, timesPorPote, ids, true)
    if (res.success) {
      toast.success(res.msg)
      await gerarJogosFaseGrupos(campeonatoId)
      setPotesSorteados(null)
      setItensRevelados(0)
      await carregarDados()
    } else {
      toast.error(res.msg)
      setLoading(false)
    }
  }

  async function handleGerarJogos() {
    if(jogos.length > 0) {
        confirm("Regerar Jogos", "Isso apagará os jogos existentes e recriará a tabela. Tem certeza?", async () => executarGeracaoJogos())
    } else {
        confirm("Gerar Jogos", "Criar confrontos de ida e volta para os grupos?", async () => executarGeracaoJogos())
    }
  }

  async function executarGeracaoJogos() {
      const res = await gerarJogosFaseGrupos(campeonatoId)
      if(res.success) { toast.success(res.msg); await carregarDados(); setRodadaView(1); } else { toast.error(res.msg) }
  }

  async function handleBuscarPrevia() {
    if(!rodadaCartola) return toast.error("Informe a rodada do Cartola.")
    setLoading(true)
    const res = await buscarPreviaRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartola))
    if(res.success && res.pendentes) { 
        setPreviewPlacares(res.pendentes)
        toast.success("Pontuações carregadas! Verifique e clique em Salvar.")
    } else {
        toast.error(res.msg || "Erro ao buscar dados.")
    }
    setLoading(false)
  }

  async function handleSalvarRodada() {
    if(!rodadaCartola) return toast.error("Rodada do Cartola vazia.")
    
    // Mostra o modal com a mensagem dinâmica lida do banco antes de salvar
    confirm("Confirmar Resultados", mensagemModal, async () => {
        setSaving(true)
        const res = await atualizarRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartola))
        if(res.success) { 
            toast.success(res.msg); 
            setPreviewPlacares({}) 
            await carregarDados(); 
        } else {
            toast.error(res.msg || "Erro ao salvar resultados.")
        }
        setSaving(false)
    });
  }

  function cancelarPreview() {
      setPreviewPlacares({})
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
        toast.error("Erro ao salvar.")
    } finally {
        setSaving(false)
        setEditingId(null)
    }
  }

  const formatDecimal = (val: number) => {
      if (val === undefined || val === null) return 0;
      return val % 1 !== 0 ? val.toFixed(1) : val;
  };

  const jogosDaRodada = jogos.filter(j => j.rodada === rodadaView)
  const totalRodadas = jogos.length > 0 ? Math.max(...jogos.map(j => j.rodada)) : 1

  const isPreviewMode = Object.keys(previewPlacares).length > 0;

  if (modoSorteio && potesSorteados) {
      const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      const sequencia = potesSorteados.flatMap((pote, poteIndex) => pote.map((time, grupoIndex) => ({ time, poteIndex, grupoIndex })))
      const concluido = itensRevelados === sequencia.length
      return (
        <div className="animate-fadeIn py-4">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400"><Shuffle size={24} /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Sorteio dos grupos</h3>
            <p className="text-xs text-gray-500 mt-1">{itensRevelados} de {sequencia.length} times revelados</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: timesPorPote }).map((_, grupoIndex) => {
              const timesGrupo = sequencia.filter((item, index) => item.grupoIndex === grupoIndex && index < itensRevelados)
              return (
                <div key={grupoIndex} className="rounded-xl border border-gray-800 bg-[#121212] p-4 min-h-48">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
                    <span className="font-black text-green-400 uppercase tracking-widest text-sm">Grupo {letras[grupoIndex]}</span>
                    <span className="text-[10px] text-gray-600">{timesGrupo.length}/{potesSorteados.length}</span>
                  </div>
                  <div className="space-y-2">
                    {timesGrupo.map(({ time, poteIndex }) => (
                      <div key={time.time_id} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/[0.03] p-2.5 animate-fadeIn">
                        <span className="w-5 text-[9px] font-black text-gray-600">P{poteIndex + 1}</span>
                        <img src={time.escudo || time.times?.escudo || '/shield-placeholder.png'} className="w-6 h-6 object-contain" alt="" />
                        <span className="truncate text-xs font-bold text-gray-200">{time.nome || time.times?.nome}</span>
                      </div>
                    ))}
                    {timesGrupo.length === 0 && <div className="h-24 flex items-center justify-center text-gray-700"><Eye size={22} /></div>}
                  </div>
                </div>
              )
            })}
          </div>

          {itensRevelados > 0 && !concluido && (() => {
            const ultimo = sequencia[itensRevelados - 1]
            return <div className="mb-5 text-center text-sm text-gray-400"><strong className="text-white">{ultimo.time.nome || ultimo.time.times?.nome}</strong> foi para o <strong className="text-green-400">Grupo {letras[ultimo.grupoIndex]}</strong></div>
          })()}

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => { setPotesSorteados(null); setItensRevelados(0) }} disabled={loading} className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"><RotateCcw size={15} /> Recomeçar</button>
            {!concluido ? (
              <button type="button" onClick={() => setItensRevelados(v => Math.min(v + 1, sequencia.length))} className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"><Eye size={18} /> Sortear próximo time</button>
            ) : (
              <button type="button" onClick={concluirSorteioPassoAPasso} disabled={loading} className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />} Confirmar grupos</button>
            )}
          </div>
        </div>
      )
  }

  if (modoSorteio) {
      return (
        <div className="flex flex-col items-center animate-fadeIn py-4">
            <ModalConfirmacao 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)}
                onConfirm={modalConfig.onConfirm}
                titulo={modalConfig.titulo || ""}
                descricao={modalConfig.descricao || ""}
                corBotao={modalConfig.corBotao || "blue"}
                textoBotao={modalConfig.textoBotao || "Confirmar"}
            />
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Definição dos Potes (Seeds)</h3>
                <p className="text-gray-500 text-xs mt-1">Arraste e solte os times para organizá-los. O Pote 1 contém os cabeças de chave.</p>
            </div>
            
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                  {[0, 1, 2, 3].map((poteIndex) => (
                      <div key={poteIndex} className="bg-[#121212] border border-gray-800 rounded-xl p-4 flex flex-col h-full">
                          <h4 className={`text-xs font-bold uppercase mb-3 border-b border-gray-800 pb-2 ${poteIndex === 0 ? 'text-green-400' : 'text-blue-400'}`}>
                              {poteIndex === 0 ? '🏆 Pote 1 (Cabeças)' : `Pote ${poteIndex + 1}`}
                          </h4>
                          
                          <Droppable droppableId={String(poteIndex)}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className={`flex-1 space-y-2 min-h-[200px] transition-colors rounded p-1 ${snapshot.isDraggingOver ? 'bg-white/[0.02]' : ''}`}
                              >
                                  {timesOrdenados.slice(poteIndex * timesPorPote, (poteIndex + 1) * timesPorPote).map((t:any, idx: number) => (
                                      <Draggable key={String(t.time_id)} draggableId={String(t.time_id)} index={idx}>
                                        {(provided, snapshot) => (
                                          <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`flex items-center justify-between bg-[#0a0a0a] p-2 rounded border transition-all ${snapshot.isDragging ? 'border-blue-500 shadow-xl shadow-black/50 z-50 scale-[1.02]' : 'border-gray-800/50 hover:border-gray-600'}`}
                                            style={provided.draggableProps.style}
                                          >
                                              <div className="flex items-center gap-2 text-xs text-gray-300 overflow-hidden">
                                                  <img src={t.escudo || t.times?.escudo || '/shield-placeholder.png'} className="w-5 h-5 object-contain shrink-0 pointer-events-none" />
                                                  <span className="truncate max-w-[80px] md:max-w-[120px] pointer-events-none">{t.nome || t.times?.nome}</span>
                                              </div>
                                              <div className="text-gray-600">
                                                  <GripVertical size={14} />
                                              </div>
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

            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={carregarDados} className="text-gray-500 hover:text-white px-6 py-4 rounded-xl font-bold transition uppercase tracking-widest text-xs border border-transparent hover:border-gray-700">Cancelar</button>
                <button onClick={iniciarSorteioPassoAPasso} className="border border-green-500/40 bg-green-500/5 hover:bg-green-500/10 text-green-400 px-8 py-4 rounded-xl font-bold transition uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Eye size={16} /> Sortear time a time</button>
                <button onClick={handleSortear} className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-green-900/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Shuffle size={16} /> Sortear tudo</button>
            </div>
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn items-start pb-20">
      <ModalConfirmacao 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          onConfirm={modalConfig.onConfirm}
          titulo={modalConfig.titulo || ""}
          descricao={modalConfig.descricao || ""}
          corBotao={modalConfig.corBotao || "blue"}
          textoBotao={modalConfig.textoBotao || "Confirmar"}
      />
      
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
                            <input 
                                type="number" 
                                step="0.1" 
                                autoFocus 
                                className="mt-2 w-20 h-16 bg-black border border-gray-700 focus:border-blue-500 text-white text-3xl font-black text-center rounded-xl outline-none transition" 
                                value={tempCasa} 
                                onChange={e => setTempCasa(e.target.value)} 
                            />
                        </div>
                        <span className="text-gray-600 font-black text-2xl mt-4">X</span>
                        <div className="flex flex-col items-center w-1/3">
                            <img src={escudoVisitante} alt={timeVisitanteNome} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase text-center line-clamp-1">{timeVisitanteNome}</span>
                            <input 
                                type="number" 
                                step="0.1" 
                                className="mt-2 w-20 h-16 bg-black border border-gray-700 focus:border-blue-500 text-white text-3xl font-black text-center rounded-xl outline-none transition" 
                                value={tempVisitante} 
                                onChange={e => setTempVisitante(e.target.value)} 
                            />
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

      {/* LISTA DE GRUPOS */}
      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center bg-[#121212] p-6 rounded-3xl border border-gray-800 shadow-lg">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Fase de Grupos</span>
             </div>
             <div className="flex gap-3">
                <button onClick={() => confirm("Re-sortear", "Deseja voltar para a tela de definição de potes? Isso apagará os grupos atuais.", abrirTelaSorteio)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition">Re-sortear</button>
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
                    <div className="w-full overflow-x-auto custom-scrollbar">
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
                                    
                                    // Acha a zona dinâmica para pintar a linha
                                    const zonaAtiva = configZonas.find((z) => (idx + 1) <= z.posicao);
                                    const corZona = zonaAtiva ? zonaAtiva.cor : 'transparent';
                                    const isClassificado = zonaAtiva !== undefined;

                                    return (
                                        <tr key={t.id} className="hover:bg-white/[0.03] transition group relative">
                                            <td className="py-3 pl-4 text-center relative">
                                                {isClassificado && <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r shadow-md" style={{ backgroundColor: corZona }}></div>}
                                                <span className="font-black text-xs" style={{ color: isClassificado ? corZona : '#4b5563' }}>{idx + 1}</span>
                                            </td>
                                            <td className="py-3 px-1">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <img src={escudo} className="w-6 h-6 object-contain shrink-0 drop-shadow-md" />
                                                    <span className={`font-bold block whitespace-normal leading-tight ${isClassificado ? "text-gray-300 group-hover:text-white" : "text-gray-500"}`}>{nome}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center font-black text-white bg-white/[0.02] text-xs shadow-inner">{formatDecimal(t.pts)}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.pj}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.v}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.e}</td>
                                            <td className="py-3 text-center text-gray-500 font-mono">{t.d}</td>
                                            <td className="py-3 text-center text-gray-400 font-mono">{formatDecimal(t.pp)}</td>
                                            <td className="py-3 text-center text-gray-400 font-mono">{formatDecimal(t.pc)}</td>
                                            <td className={`py-3 text-center font-mono font-bold ${t.sp > 0 ? 'text-green-500' : t.sp < 0 ? 'text-red-500' : 'text-gray-500'}`}>{formatDecimal(t.sp)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* COLUNA 2: JOGOS E CONTROLES */}
      <div className="lg:col-span-1 space-y-6">
         <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 sticky top-6 shadow-xl h-fit">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Calendar className="text-orange-500 w-4 h-4" /> Jogos</h3>
                <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                    <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">‹</button>
                    <span className="text-[10px] font-black px-3 text-orange-500 uppercase tracking-widest">R{rodadaView}</span>
                    <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">›</button>
                </div>
            </div>

            {/* BARRA DE CONTROLE: ATUALIZAR / SALVAR */}
            {!isPreviewMode ? (
                <div className="flex gap-2 mb-6 shrink-0">
                    <input type="number" placeholder="Rodada Cartola" className="flex-1 bg-black border border-gray-800 text-white text-[11px] font-bold p-3 rounded-lg focus:border-blue-500 outline-none transition" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)} />
                    <button onClick={handleBuscarPrevia} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-[10px] font-bold uppercase transition disabled:opacity-50 flex items-center justify-center min-w-[100px]">
                        {loading ? <RefreshCw className="animate-spin w-4 h-4"/> : 'Atualizar'}
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 mb-6 shrink-0 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-xl">
                    <button onClick={cancelarPreview} disabled={saving} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition disabled:opacity-50">Cancelar</button>
                    <button onClick={handleSalvarRodada} disabled={saving} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2">
                        {saving ? <RefreshCw className="animate-spin w-4 h-4"/> : <Save size={14} />} {saving ? 'Salvando...' : 'Salvar Resultados'}
                    </button>
                </div>
            )}
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                {jogosDaRodada.length === 0 && <div className="text-center text-gray-600 text-xs py-10 border border-dashed border-gray-800 rounded-xl">Sem jogos.</div>}
                
                {jogosDaRodada.map(j => {
                    const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
                    const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
                    
                    let placarC = j.placar_casa;
                    let placarV = j.placar_visitante;
                    let isPreviewCurrent = false;

                    if (isPreviewMode && previewPlacares[j.id]) {
                        placarC = previewPlacares[j.id].casa;
                        placarV = previewPlacares[j.id].visitante;
                        isPreviewCurrent = true;
                    }

                    const finalizado = j.status === 'finalizado' || isPreviewCurrent;
                    const cVenceu = finalizado && Number(placarC) > Number(placarV);
                    const vVenceu = finalizado && Number(placarV) > Number(placarC);
                    
                    return (
                    <div key={j.id} onClick={() => !isPreviewMode && abrirModalEdicao(j)} className={`border p-4 rounded-xl transition group relative overflow-hidden ${isPreviewCurrent ? 'bg-yellow-500/5 border-yellow-500/50 cursor-default' : 'bg-black/40 border-gray-800/50 cursor-pointer hover:border-orange-500/50 hover:bg-white/[0.02]'}`}>
                        
                        {isPreviewCurrent ? (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-bl-lg animate-pulse"></div>
                        ) : (
                            finalizado && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-bl-lg"></div>
                        )}

                        <div className="flex justify-between items-center text-xs mt-1">
                            <div className="flex items-center justify-end gap-3 w-[40%]">
                                <span className={`text-[10px] font-bold text-right leading-tight ${cVenceu ? 'text-green-400' : 'text-gray-400'}`}>{casa?.nome || 'Time'}</span>
                                <img src={casa?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain drop-shadow-md" />
                            </div>
                            
                            <div className={`border px-2 py-1.5 rounded-lg text-sm font-black font-mono flex items-center justify-center min-w-[50px] 
                                ${isPreviewCurrent ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : finalizado ? 'bg-[#151515] border-gray-800' : 'bg-[#0a0a0a] border-gray-800 text-gray-600'}`}>
                                <span className={cVenceu ? 'text-green-400' : isPreviewCurrent ? 'text-yellow-500' : 'text-white'}>{placarC ?? '-'}</span>
                                <span className="text-gray-700 mx-1">:</span>
                                <span className={vVenceu ? 'text-green-400' : isPreviewCurrent ? 'text-yellow-500' : 'text-white'}>{placarV ?? '-'}</span>
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
