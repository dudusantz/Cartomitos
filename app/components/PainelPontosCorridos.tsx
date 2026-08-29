'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  gerarJogosPontosCorridos, 
  buscarPreviaRodadaPontosCorridos, // <-- Importação da função oficial
  buscarTabelaPontosCorridos, 
  zerarJogos, 
  atualizarPlacarManual, 
  listarPartidas, 
  recalcularTabelaPontosCorridos 
} from '@/app/actions'
import { ModalConfirmacao } from './ModalConfirmacao'
import { Trophy, RefreshCw, Trash2, Save, X, Calendar, PlayCircle } from 'lucide-react'

interface Props {
  campeonatoId: number
  times?: any[] 
}

type Pendentes = Record<number, { casa: string; visitante: string }>

export default function PainelPontosCorridos({ campeonatoId, times = [] }: Props) {
  const [tabela, setTabela] = useState<any[]>([])
  const [jogos, setJogos] = useState<any[]>([])
  const [rodadaView, setRodadaView] = useState(1)
  const [rodadaCartola, setRodadaCartola] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewAdjusted, setViewAdjusted] = useState(false)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')
  const [timeCasaNome, setTimeCasaNome] = useState('')
  const [timeVisitanteNome, setTimeVisitanteNome] = useState('')
  const [escudoCasa, setEscudoCasa] = useState('')
  const [escudoVisitante, setEscudoVisitante] = useState('')

  const [pendentes, setPendentes] = useState<Pendentes>({})
  const [salvandoTudo, setSalvandoTudo] = useState(false)
  const temPendentes = Object.keys(pendentes).length > 0

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
        .map((j: any) => j.rodada)
      
      let rodadaInicial = 1
      if (rodadasPendentes.length > 0) {
        rodadaInicial = Math.min(...rodadasPendentes)
      } else {
        const todasRodadas = dadosJogos.map((j: any) => j.rodada)
        rodadaInicial = Math.max(...todasRodadas)
      }
      setRodadaView(rodadaInicial)
      setViewAdjusted(true)
    }
  }

  const jogosDaRodada = jogos.filter(j => j.rodada === rodadaView)
  const totalRodadas = jogos.length > 0 ? Math.max(...jogos.map(j => j.rodada)) : 1

  useEffect(() => {
    const rodadaVinculada = jogos.find(j => j.rodada === rodadaView && j.rodada_cartola)?.rodada_cartola
    setRodadaCartola(rodadaVinculada ? String(rodadaVinculada) : '')
  }, [jogos, rodadaView])

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

  async function handleGerar() {
    if (times.length < 2) return toast.error("Mínimo 2 times.")
    confirm("Gerar Tabela", "Criar todos contra todos?", async () => {
      setLoading(true)
      const res = await gerarJogosPontosCorridos(campeonatoId)
      setLoading(false)
      if (res.success) { toast.success(res.msg); carregarDados() } else toast.error(res.msg)
    })
  }

  async function handleReset() {
    confirm("Resetar Campeonato", "Isso apagará todos os jogos e pontos. Tem certeza?", async () => {
      setLoading(true)
      await zerarJogos(campeonatoId)
      await carregarDados()
      setLoading(false)
      toast.success("Campeonato resetado.")
      setPendentes({})
    })
  }

  async function handleRecalcular() {
    setLoading(true)
    await recalcularTabelaPontosCorridos(campeonatoId)
    await carregarDados()
    toast.success("Tabela Recalculada!")
    setLoading(false)
  }

  // ====================================================================
  // LÓGICA CORRIGIDA: Usa a pontuação oficial do Cartola para a prévia
  // ====================================================================
  async function handleAtualizarRodada() {
    if (!rodadaCartola) return toast.error("Informe a rodada do Cartola.")
    const rodadaBusca = Number(rodadaCartola);
    setLoading(true)
    
    // Chama a função que pega a pontuação oficial e exata
    const res = await buscarPreviaRodadaPontosCorridos(campeonatoId, rodadaView, rodadaBusca);
    
    if (res.success && res.pendentes) { 
      toast.success("Pontuações carregadas! Revise e clique em Salvar.")
      setPendentes(prev => ({ ...prev, ...res.pendentes }))
    } else { 
      toast.error(res.msg || "Erro ao buscar pontuações.") 
    }
    
    setLoading(false)
  }

  function abrirModalEdicao(jogo: any) {
    setEditingId(jogo.id)
    setTempCasa(pendentes[jogo.id]?.casa ?? String(jogo.placar_casa ?? ''))
    setTempVisitante(pendentes[jogo.id]?.visitante ?? String(jogo.placar_visitante ?? ''))
    
    const casa = Array.isArray(jogo.casa) ? jogo.casa[0] : jogo.casa
    const visitante = Array.isArray(jogo.visitante) ? jogo.visitante[0] : jogo.visitante
    setTimeCasaNome(casa?.nome || 'Casa')
    setTimeVisitanteNome(visitante?.nome || 'Visitante')
    setEscudoCasa(casa?.escudo || '/shield-placeholder.png')
    setEscudoVisitante(visitante?.escudo || '/shield-placeholder.png')
  }

  function guardarPlacarLocal() {
    if (!editingId) return
    const id = editingId
    const vCasa = tempCasa
    const vVisitante = tempVisitante
    setEditingId(null)
    setPendentes(prev => ({
      ...prev,
      [id]: { casa: vCasa, visitante: vVisitante }
    }))
  }

  async function salvarTudo() {
    if (!temPendentes) return
    setSalvandoTudo(true)

    let erros = 0
    await Promise.all(
      Object.entries(pendentes).map(async ([idStr, vals]) => {
        const res = await atualizarPlacarManual(
          Number(idStr),
          Number(vals.casa),
          Number(vals.visitante),
          undefined,
          undefined,
          Number(rodadaCartola)
        )
        if (!res.success) erros++
      })
    )

    if (erros === 0) {
      toast.success(`${Object.keys(pendentes).length} placar(es) salvo(s)!`)
    } else {
      toast.error(`${erros} placar(es) falharam ao salvar.`)
    }

    setPendentes({})
    await carregarDados()
    setSalvandoTudo(false)
  }

  const formatDecimal = (val: number) => {
    if (val === undefined || val === null) return 0
    return val % 1 !== 0 ? val.toFixed(1) : val
  }

  return (
    <div className="grid grid-cols-1 gap-5 animate-fadeIn items-start pb-16 xl:grid-cols-[minmax(0,1fr)_390px]">
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
                <button onClick={() => setEditingId(null)} disabled={saving} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition text-xs uppercase tracking-wider disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={guardarPlacarLocal} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 transition text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101210] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] bg-[#141714] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-yellow-500/20 bg-yellow-500/[0.08]"><Trophy className="text-yellow-500 w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-white sm:text-lg">Classificação</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">{tabela.length} clubes · classificação geral</p>
            </div>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <button onClick={handleRecalcular} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-300 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98] disabled:opacity-50 md:flex-none">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? '...' : 'Recalcular'}
            </button>
            {jogos.length === 0 ? (
              <button onClick={handleGerar} className="flex-1 rounded-lg bg-yellow-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-yellow-400 active:scale-[0.98] md:flex-none">Gerar tabela</button>
            ) : (
              <button onClick={handleReset} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-400 transition hover:bg-red-500/10 active:scale-[0.98] md:flex-none">
                <Trash2 size={12} /> Resetar
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="border-b border-white/[0.07] bg-[#0a0b0a] text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500">
                <tr>
                  <th className="py-4 pl-6 text-center w-[5%]">Pos</th>
                  <th className="py-4 px-4 w-[35%]">Clube</th>
                  <th className="py-4 text-center text-yellow-500 font-black w-[8%] bg-yellow-500/[0.035]">PTS</th>
                  <th className="py-4 text-center w-[6%]">J</th>
                  <th className="py-4 text-center w-[6%]">V</th>
                  <th className="py-4 text-center w-[6%]">E</th>
                  <th className="py-4 text-center w-[6%]">D</th>
                  <th className="py-4 text-center w-[7%] text-gray-400" title="Pró">PP</th>
                  <th className="py-4 text-center w-[7%] text-gray-400" title="Contra">PC</th>
                  <th className="py-4 text-center w-[8%] font-bold text-gray-300" title="Saldo">SP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {tabela.map((t, i) => {
                  const timeInfo = Array.isArray(t.times) ? t.times[0] : t.times
                  const escudo = timeInfo?.escudo || '/shield-placeholder.png'
                  const nome = timeInfo?.nome || 'Time Desconhecido'
                  const isG4 = i < 4
                  const isZ4 = i >= tabela.length - 4 && tabela.length > 4
                  return (
                    <tr key={t.id} className="group relative transition-colors hover:bg-white/[0.025]">
                      <td className="py-3 pl-6 text-center relative">
                        {isG4 && <div className="absolute bottom-2 left-0 top-2 w-0.5 bg-yellow-500"></div>}
                        {isZ4 && <div className="absolute bottom-2 left-0 top-2 w-0.5 bg-red-500"></div>}
                        <span className={`font-mono text-xs font-bold ${isG4 ? 'text-yellow-500' : isZ4 ? 'text-red-400' : 'text-gray-600'}`}>{i + 1}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={escudo} className="h-8 w-8 shrink-0 object-contain transition-transform group-hover:scale-105" alt={nome} />
                          <span className={`font-bold text-sm transition-colors ${isZ4 ? 'text-gray-400 group-hover:text-red-300' : 'text-gray-200 group-hover:text-white'} whitespace-nowrap`}>{nome}</span>
                        </div>
                      </td>
                      <td className="bg-yellow-500/[0.025] py-3 text-center font-mono text-sm font-black text-white">{formatDecimal(t.pts)}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{t.pj}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{t.v}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{t.e}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{t.d}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{formatDecimal(t.gp)}</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{formatDecimal(t.gc)}</td>
                      <td className={`py-3 text-center font-mono font-bold ${t.sg > 0 ? 'text-green-500' : (t.sg < 0 ? 'text-red-500' : 'text-gray-500')}`}>{formatDecimal(t.sg)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside className="min-w-0">
        <div className="h-fit overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101210] shadow-[0_24px_80px_rgba(0,0,0,0.24)] xl:sticky xl:top-6">

          <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#141714] p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-black text-white">
              <Calendar className="text-yellow-500 w-4 h-4" /> Jogos da rodada
            </h3>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#090a09] p-1">
              <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">‹</button>
              <span className="text-[10px] font-black px-3 text-yellow-500 uppercase tracking-widest">R{rodadaView}</span>
              <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition">›</button>
            </div>
          </div>

          <div className="p-4 sm:p-5"><button
            onClick={salvarTudo}
            disabled={salvandoTudo || !temPendentes}
            className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
              temPendentes && !salvandoTudo
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black border-transparent shadow-lg shadow-yellow-900/20 active:scale-[0.98]'
                : 'bg-transparent border-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {salvandoTudo
              ? <><RefreshCw size={13} className="animate-spin" /> Salvando...</>
              : temPendentes
                ? <><Save size={13} /> Salvar {Object.keys(pendentes).length} placar{Object.keys(pendentes).length > 1 ? 'es' : ''}</>
                : <><Save size={13} /> Sem alterações</>
            }
          </button>

          <div className="mb-5 flex gap-2 border-b border-white/[0.07] pb-5">
            <input type="number" aria-label="Rodada do Cartola" placeholder="Rodada do Cartola" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#080908] p-3 text-[11px] font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-500/60" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)} />
            <button onClick={handleAtualizarRodada} disabled={loading} className="rounded-lg bg-yellow-500 px-4 text-[10px] font-black uppercase text-black transition hover:bg-yellow-400 active:scale-[0.98] disabled:opacity-50">
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : 'Carregar'}
            </button>
          </div>
          
          <div className="space-y-2.5">
            {jogosDaRodada.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-10 border border-dashed border-gray-800 rounded-xl">Sem jogos.</div>
            )}
            {jogosDaRodada.map(j => {
              const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa
              const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante
              const editado = !!pendentes[j.id]

              const placarCasa = editado ? pendentes[j.id].casa : (j.placar_casa ?? '-')
              const placarVisitante = editado ? pendentes[j.id].visitante : (j.placar_visitante ?? '-')

              const finalizado = j.status === 'finalizado'
              const cVenceu = finalizado && (j.placar_casa ?? 0) > (j.placar_visitante ?? 0)
              const vVenceu = finalizado && (j.placar_visitante ?? 0) > (j.placar_casa ?? 0)

              return (
                <div
                  key={j.id}
                  onClick={() => abrirModalEdicao(j)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-[#090a09] transition hover:border-yellow-500/35 hover:bg-[#0c0e0c] active:scale-[0.995] ${
                    editado ? 'border-yellow-500/40' : 'border-gray-800/50'
                  }`}
                >
                  <div className="px-3.5 py-3">
                    <div className={`grid grid-cols-[3px_28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 py-1.5 ${cVenceu ? 'bg-white/[0.025]' : ''}`}>
                      <span className={`h-5 w-[3px] rounded-full ${cVenceu ? 'bg-yellow-500' : 'bg-transparent'}`} />
                      <img src={casa?.escudo || '/shield-placeholder.png'} className="h-7 w-7 shrink-0 object-contain" alt={`Escudo ${casa?.nome || 'time da casa'}`} />
                      <span className={`min-w-0 truncate text-[11px] font-bold ${cVenceu ? 'text-white' : 'text-gray-400'}`}>{casa?.nome || 'Time'}</span>
                      <span className={`min-w-10 rounded-md px-2 py-1 text-center font-mono text-base font-black tabular-nums ${editado ? 'bg-yellow-500/10 text-yellow-400' : cVenceu ? 'text-white' : 'text-gray-300'}`}>{placarCasa}</span>
                    </div>
                    <div className={`grid grid-cols-[3px_28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 py-1.5 ${vVenceu ? 'bg-white/[0.025]' : ''}`}>
                      <span className={`h-5 w-[3px] rounded-full ${vVenceu ? 'bg-yellow-500' : 'bg-transparent'}`} />
                      <img src={visitante?.escudo || '/shield-placeholder.png'} className="h-7 w-7 shrink-0 object-contain" alt={`Escudo ${visitante?.nome || 'time visitante'}`} />
                      <span className={`min-w-0 truncate text-[11px] font-bold ${vVenceu ? 'text-white' : 'text-gray-400'}`}>{visitante?.nome || 'Time'}</span>
                      <span className={`min-w-10 rounded-md px-2 py-1 text-center font-mono text-base font-black tabular-nums ${editado ? 'bg-yellow-500/10 text-yellow-400' : vVenceu ? 'text-white' : 'text-gray-300'}`}>{placarVisitante}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.055] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.1em]">
                    <span className={editado ? 'text-yellow-500' : finalizado ? 'text-gray-600' : 'text-gray-600'}>
                      {editado ? 'Alteração pendente' : finalizado ? 'Resultado final' : 'Partida agendada'}
                    </span>
                    <span className="text-gray-700 transition-colors group-hover:text-yellow-500">Editar placar →</span>
                  </div>
                </div>
              )
            })}
          </div></div>
        </div>
      </aside>
    </div>
  )
}
