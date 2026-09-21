'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  atualizarRodadaMataMata, 
  salvarCalendarioMataMata,
  listarPartidas, 
  excluirMataMata, 
  atualizarPlacarManual 
} from '@/app/actions'
import MataMataBracket from './MataMataBracket'
import { ModalConfirmacao } from './ModalConfirmacao' 
import SorteioMataMata from './admin/SorteioMataMata'
import { fasesPrevistas } from '@/lib/mata-mata-calendar'
import { RefreshCw, Trash2, Trophy, Save, Edit3, Eye, Wand2, CalendarDays } from 'lucide-react'

interface Props {
  campeonatoId: number
  rodadasCorte: number
  bloquearGerador?: boolean 
  isCopa?: boolean
  finalUnica?: boolean
  calendarioInicial?: Record<string, { ida?: number; volta?: number | null; desempate?: number | null }>
}

export default function PainelMataMata({ campeonatoId, rodadasCorte, bloquearGerador = false, isCopa = false, finalUnica = false, calendarioInicial = {} }: Props) {
  const [partidas, setPartidas] = useState<any[]>([])
  const [calendario, setCalendario] = useState(calendarioInicial)
  
  // Estados dos Controles (API)
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')
  const [rodadaDesempate, setRodadaDesempate] = useState('')
  
  // Estados de Interface
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  const [modoSorteio, setModoSorteio] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)

  useEffect(() => { carregarDados() }, [campeonatoId])

  async function carregarDados() {
    setLoading(true)
    const todosJogos = await listarPartidas(campeonatoId) || []
    
    const jogosMataMata = todosJogos
      .filter((p: any) => p.rodada > rodadasCorte)
      .map((p: any) => ({ ...p, rodada_bracket: p.rodada - rodadasCorte }))
    
    setPartidas(jogosMataMata)
    setLoading(false)
  }

  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada_bracket))].sort((a, b) => a - b)
  const participantesIniciais = new Set(partidas.filter(p => p.rodada_bracket === 1).flatMap(p => [p.time_casa, p.time_visitante].filter(Boolean))).size
  const fasesIda = fasesPrevistas(participantesIniciais, fasesDisponiveis)
  const totalFases = fasesIda.length
  const isJogoUnico = (fase: number) => fase === fasesIda[fasesIda.length - 1] &&
    (finalUnica || (fasesDisponiveis.includes(fase) && !fasesDisponiveis.includes(fase + 1)))
  const nomeFase = (fase: number) => {
    const equipes = 2 ** (totalFases - (fase - 1) / 2)
    return ({ 2: 'Final', 4: 'Semifinal', 8: 'Quartas', 16: 'Oitavas', 32: '16 avos', 64: '32 avos', 128: '64 avos' } as Record<number, string>)[equipes] || `Fase ${(fase + 1) / 2}`
  }
  const fasesSemRodadas = fasesIda.filter(fase => {
    const salvo = calendario[String(fase + rodadasCorte)]
    const ida = salvo?.ida || partidas.find(p => p.rodada_bracket === fase)?.rodada_cartola
    const volta = salvo?.volta || partidas.find(p => p.rodada_bracket === fase + 1)?.rodada_cartola
    return !ida || (!isJogoUnico(fase) && !volta)
  }).length
  const fasesConfiguradas = fasesIda.length - fasesSemRodadas
  const faseSelecionadaTemJogos = partidas.some(p => p.rodada_bracket === Number(faseAtual) && p.status !== 'bye')

  const empatesPendentes = (() => {
    const fase = Number(faseAtual)
    const jogosIda = partidas.filter(p => p.rodada_bracket === fase && p.status !== 'bye')

    return jogosIda.filter(ida => {
      const volta = partidas.find(p =>
        p.rodada_bracket === fase + 1 &&
        ((p.time_casa === ida.time_visitante && p.time_visitante === ida.time_casa) ||
         (p.time_casa === ida.time_casa && p.time_visitante === ida.time_visitante))
      )
      if (ida.status !== 'finalizado' || (volta && volta.status !== 'finalizado')) return false

      let casa = Number(ida.placar_casa || 0)
      let visitante = Number(ida.placar_visitante || 0)
      if (volta) {
        if (volta.time_casa === ida.time_visitante) {
          casa += Number(volta.placar_visitante || 0)
          visitante += Number(volta.placar_casa || 0)
        } else {
          casa += Number(volta.placar_casa || 0)
          visitante += Number(volta.placar_visitante || 0)
        }
      }
      const decisivo = volta || ida
      return Number(casa.toFixed(2)) === Number(visitante.toFixed(2)) &&
        (decisivo.desempate_casa == null || decisivo.desempate_visitante == null)
    }).length
  })()

  useEffect(() => {
    const fase = Number(faseAtual)
    const salvo = calendario[String(fase + rodadasCorte)]
    const ida = partidas.find(p => p.rodada_bracket === fase && p.rodada_cartola)
    const volta = partidas.find(p => p.rodada_bracket === fase + 1 && p.rodada_cartola)
    setRodadaIda(String(salvo?.ida || ida?.rodada_cartola || ''))
    setRodadaVolta(String(salvo?.volta || volta?.rodada_cartola || ''))
    setRodadaDesempate(String(salvo?.desempate || ''))
  }, [faseAtual, partidas, calendario, rodadasCorte])

  // --- AÇÕES ---

  async function persistirCalendario(mostrarToast = true) {
    const fase = Number(faseAtual)
    const ida = Number(rodadaIda)
    const volta = isJogoUnico(fase) ? null : rodadaVolta === '' ? 0 : Number(rodadaVolta)
    const desempate = rodadaDesempate === '' ? null : Number(rodadaDesempate)
    const res = await salvarCalendarioMataMata(campeonatoId, fase + rodadasCorte, ida, volta, desempate)
    if (!res.success) { toast.error(res.msg); return false }
    setCalendario(atual => ({ ...atual, [String(fase + rodadasCorte)]: { ida, volta, desempate } }))
    if (mostrarToast) toast.success(res.msg)
    return true
  }

  async function handleSalvarCalendario() {
    setLoading(true)
    await persistirCalendario()
    await carregarDados()
    setLoading(false)
  }

  async function handleAtualizarAPI() {
    const f = Number(faseAtual)
    const unico = isJogoUnico(f)
    setLoading(true)
    if (!await persistirCalendario(false)) { setLoading(false); return }
    const rodadaReal = f + rodadasCorte
    const volta = unico ? 0 : Number(rodadaVolta)
    
    const res = await atualizarRodadaMataMata(
      campeonatoId,
      rodadaReal,
      Number(rodadaIda),
      volta
    )
    
    if(res.success) { 
        toast.success(res.msg); 
        carregarDados(); 
    } else {
        toast.error(res.msg)
    }
    setLoading(false)
  }

  async function handleLimpar() {
    setModalConfig({ 
        titulo: "Limpar Mata-Mata", 
        descricao: "Isso apagará TODOS os jogos desta fase e reiniciará o mata-mata. Tem certeza?", 
        onConfirm: async () => {
            const res = await excluirMataMata(campeonatoId, rodadasCorte + 1)
            if(res.success) { 
                toast.success(res.msg); 
                window.location.reload();
            }
            setModalOpen(false)
        }, 
        corBotao: 'red',
        textoBotao: 'Sim, Limpar Tudo'
    })
    setModalOpen(true)
  }

  // --- RENDERIZAR TELA DE SORTEIO (SOBREPOSIÇÃO) ---
  if (modoSorteio) {
      return (
        <div className="animate-fadeIn relative bg-[#121212] p-4 rounded-xl border border-gray-800">
            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 mb-6 text-center relative">
                <button 
                    onClick={() => setModoSorteio(false)} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-white text-sm font-bold flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition-colors"
                >
                    ✕ Cancelar
                </button>
                <h3 className="text-white font-bold mb-2">Definir Chaveamento</h3>
                <p className="text-gray-500 text-xs mb-4">Configure os potes abaixo para gerar os confrontos.</p>
            </div>
            
            <SorteioMataMata 
                campeonatoId={campeonatoId} 
                onSucesso={() => {
                    toast.success("Chaves geradas! Atualizando página...");
                    setTimeout(() => window.location.reload(), 1000);
                }} 
            />
        </div>
      )
  }

  if (loading && partidas.length === 0) return <div className="text-center py-10 text-gray-500 animate-pulse">Carregando Painel...</div>

  // --- RENDERIZAÇÃO INTELIGENTE DO BOTÃO ---
  // Se não for copa, OU se não tiver jogos, mostra o botão de qualquer jeito.
  const mostrarBotaoGerar = !isCopa || partidas.length === 0;

  return (
    <div className="animate-fadeIn space-y-6">
        <ModalConfirmacao 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)}
            onConfirm={modalConfig.onConfirm}
            titulo={modalConfig.titulo || ""}
            descricao={modalConfig.descricao || ""}
            corBotao={modalConfig.corBotao || "blue"}
            textoBotao={modalConfig.textoBotao || "Confirmar"}
        />

        {/* === HEADER COM BOTÃO GERAR (Só aparece se NÃO for Copa) === */}
        {/* Isso garante que o mata-mata normal tenha o botão visível */}
        {!isCopa && (
             <div className="bg-[#121212] p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-1">Mata-Mata</h3>
                    <p className="text-gray-400 text-xs">
                        {partidas.length === 0 ? "Nenhum jogo encontrado. Gere o chaveamento ao lado." : "Gerencie o chaveamento e avanços de fase."}
                    </p>
                </div>
                <button 
                    onClick={() => setModoSorteio(true)}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-3 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-yellow-900/20 tracking-widest flex items-center gap-2"
                >
                    <Wand2 size={16} /> 
                    {partidas.length === 0 ? "Gerar Chaveamento" : "Regerar Chaveamento"}
                </button>
            </div>
        )}

        {/* === CONTEÚDO PRINCIPAL === */}
        {partidas.length === 0 ? (
            // ESTADO VAZIO
            bloquearGerador ? (
                // CASO COPA (Bloqueado esperando grupos)
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl bg-white/5 animate-fadeIn">
                    <div className="text-4xl mb-4 text-gray-700"><Trophy size={48} /></div>
                    <h3 className="text-white font-bold text-lg">Aguardando Fase de Grupos</h3>
                    <p className="text-gray-500 text-sm mt-2 max-w-md text-center">O chaveamento aparecerá aqui automaticamente após ser gerado na aba anterior.</p>
                </div>
            ) : (
                // CASO MATA-MATA (Vazio, mas liberado para gerar)
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl bg-white/5 animate-fadeIn">
                    <div className="text-4xl mb-4 text-gray-700"><Trophy size={48} /></div>
                    <h3 className="text-white font-bold text-lg">Nenhum Jogo Definido</h3>
                    <p className="text-gray-500 text-sm mt-2 max-w-md text-center mb-6">
                        O chaveamento ainda não foi gerado.
                    </p>
                    {/* Botão extra de garantia no meio da tela */}
                    <button 
                        onClick={() => setModoSorteio(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 border border-gray-700"
                    >
                        <Wand2 size={14} /> Criar Chaveamento Manualmente
                    </button>
                </div>
            )
        ) : (
            <>
                <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#141613]" aria-label="Calendário do mata-mata">
                  <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 px-5 py-6 sm:px-7">
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f4b900]"><CalendarDays size={14} /> Planejamento da competição</p>
                      <h3 className="text-2xl font-black tracking-tight text-white">Calendário do mata-mata</h3>
                      <p className="mt-1.5 text-sm text-slate-400">Escolha uma fase e defina quando cada confronto será disputado.</p>
                    </div>
                    <div className="min-w-[180px]">
                      <p className="text-right text-xs text-slate-400"><strong className="text-lg font-black text-white">{fasesConfiguradas}</strong> de {fasesIda.length} fases com rodadas definidas</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#f4b900] transition-all" style={{ width: `${fasesIda.length ? fasesConfiguradas / fasesIda.length * 100 : 0}%` }} /></div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
                    <nav className="grid gap-1.5 border-b border-white/10 bg-black/15 p-3 sm:grid-cols-2 lg:block lg:space-y-1.5 lg:border-b-0 lg:border-r" aria-label="Fases do mata-mata">
                      {fasesIda.map(fase => {
                        const salvo = calendario[String(fase + rodadasCorte)]
                        const ida = salvo?.ida || partidas.find(p => p.rodada_bracket === fase && p.rodada_cartola)?.rodada_cartola
                        const volta = salvo?.volta || partidas.find(p => p.rodada_bracket === fase + 1 && p.rodada_cartola)?.rodada_cartola
                        const faltaRodada = !ida || (!isJogoUnico(fase) && !volta)
                        return <button key={fase} type="button" onClick={() => setFaseAtual(String(fase))} aria-pressed={faseAtual === String(fase)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b900] ${faseAtual === String(fase) ? 'border-[#f4b900]/50 bg-[#f4b900]/10' : 'border-transparent hover:border-white/10 hover:bg-white/[.04]'}`}>
                          <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-bold text-white">{nomeFase(fase)}</strong><span className="mt-0.5 block text-[11px] text-slate-400">{ida ? `Ida R${ida}` : 'Ida pendente'}{!isJogoUnico(fase) && ` · ${volta ? `volta R${volta}` : 'volta pendente'}`}</span></span>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${faltaRodada ? 'bg-amber-400' : 'bg-emerald-400'}`} title={faltaRodada ? 'Precisa configurar rodadas' : 'Rodadas configuradas'} />
                        </button>
                      })}
                    </nav>

                    <div className="flex min-w-0 flex-col p-5 sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.17em] text-slate-500">Fase selecionada</p>
                          <h4 className="mt-1 text-2xl font-black tracking-tight text-white">{nomeFase(Number(faseAtual))}</h4>
                          <p className="mt-1 text-xs text-slate-400">{faseSelecionadaTemJogos ? 'Confrontos já criados' : 'Fase futura'} · {isJogoUnico(Number(faseAtual)) ? 'jogo único' : 'ida e volta'}</p>
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold ${fasesSemRodadas || empatesPendentes ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-400'}`}>
                          {empatesPendentes > 0 ? `${empatesPendentes} desempate${empatesPendentes > 1 ? 's' : ''} pendente${empatesPendentes > 1 ? 's' : ''}` : fasesSemRodadas > 0 ? `${fasesSemRodadas} fase${fasesSemRodadas > 1 ? 's' : ''} precisa${fasesSemRodadas > 1 ? 'm' : ''} de atenção` : 'Calendário completo'}
                        </span>
                      </div>

                      <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Rodada de ida</span><input type="number" min="1" max="38" placeholder="Ex.: 17" className="h-14 w-full rounded-xl border border-white/10 bg-[#0a0c0a] px-4 font-mono text-lg font-bold text-white outline-none transition focus:border-[#f4b900] focus:ring-2 focus:ring-[#f4b900]/20" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} /></label>
                        {!isJogoUnico(Number(faseAtual)) && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Rodada de volta</span><input type="number" min="1" max="38" placeholder="Ex.: 19" className="h-14 w-full rounded-xl border border-white/10 bg-[#0a0c0a] px-4 font-mono text-lg font-bold text-white outline-none transition focus:border-[#f4b900] focus:ring-2 focus:ring-[#f4b900]/20" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} /></label>}
                        <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Desempate <span className="font-normal text-slate-500">· opcional</span></span><input type="number" min="1" max="38" placeholder="Automático" className="h-14 w-full rounded-xl border border-white/10 bg-[#0a0c0a] px-4 font-mono text-base font-bold text-white outline-none transition focus:border-[#f4b900] focus:ring-2 focus:ring-[#f4b900]/20" value={rodadaDesempate} onChange={e => setRodadaDesempate(e.target.value)} /></label>
                      </div>
                      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">Sem rodada de desempate, o sistema usa a rodada seguinte do Cartola. Na R38, busca uma rodada anterior sem empate.</p>

                      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                        <button onClick={handleSalvarCalendario} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f4b900] px-5 text-xs font-black text-black transition hover:bg-[#ffd12a] active:translate-y-px disabled:opacity-50"><Save size={15} /> Salvar calendário</button>
                        <button onClick={handleAtualizarAPI} disabled={loading || !faseSelecionadaTemJogos} title={!faseSelecionadaTemJogos ? 'Os jogos desta fase ainda não foram criados' : undefined} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-xs font-bold text-white transition hover:border-white/30 hover:bg-white/[.05] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar resultados</button>
                        <button onClick={handleLimpar} className="inline-flex h-11 items-center gap-2 px-2 text-xs font-semibold text-slate-500 transition hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:ml-auto" title="Apagar o chaveamento"><Trash2 size={14} /> Apagar chaveamento</button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* === ABAS === */}
                <div className="flex w-fit gap-1 rounded-xl border border-white/10 bg-[#0d0f0d] p-1">
                     <button onClick={() => setModoEdicao(false)} className={`text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-all ${!modoEdicao ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                        <Eye size={14} /> Chaveamento
                     </button>
                     <button onClick={() => setModoEdicao(true)} className={`text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-all ${modoEdicao ? 'bg-[#f4b900] text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                        <Edit3 size={14} /> Resultados e desempates
                     </button>
                </div>

                {/* === CONTEÚDO (Bracket ou Lista) === */}
                <div className="min-h-[400px]">
                    {modoEdicao ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                              <div className="flex items-start gap-3 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-blue-200 text-xs">
                                <div className="bg-blue-500 p-1.5 rounded-full mt-0.5"><Edit3 size={12} className="text-white"/></div>
                                <div>
                                    <strong className="block mb-1 text-blue-100">Correção manual</strong>
                                    Use esta área apenas para corrigir resultados ou informar manualmente o placar do terceiro jogo.
                                </div>
                              </div>
                              <ListaEditavel partidas={partidas} onUpdate={carregarDados} />
                        </div>
                    ) : (
                        <div className="animate-in fade-in">
                            <MataMataBracket partidas={partidas.map(p => ({...p, rodada: p.rodada_bracket}))} />
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  )
}

// --- SUBCOMPONENTES ---

function ListaEditavel({ partidas, onUpdate }: { partidas: any[], onUpdate: () => void }) {
    const rodadas = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b);
  
    return (
      <div className="grid grid-cols-1 gap-6">
        {rodadas.map((r) => (
          <div key={r} className="rounded-xl overflow-hidden border border-gray-800 bg-[#0f0f0f]">
            <div className="bg-gray-900/80 px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="font-bold text-gray-300 uppercase text-[11px] tracking-wider">Rodada {r}</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {partidas.filter(p => p.rodada === r).map((partida) => (
                <CardPartidaEditavel key={partida.id} partida={partida} todosJogos={partidas} onUpdate={onUpdate} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
}

function CardPartidaEditavel({ partida, todosJogos, onUpdate }: { partida: any, todosJogos: any[], onUpdate: () => void }) {
    const [casa, setCasa] = useState(partida.placar_casa?.toString() ?? '')
    const [visitante, setVisitante] = useState(partida.placar_visitante?.toString() ?? '')
    const [extraCasa, setExtraCasa] = useState(partida.desempate_casa?.toString() ?? '')
    const [extraVisitante, setExtraVisitante] = useState(partida.desempate_visitante?.toString() ?? '')
    const [loading, setLoading] = useState(false)
  
    const jogoIda = todosJogos.find(p => p.rodada === partida.rodada - 1 && (p.time_casa === partida.time_visitante || p.time_casa === partida.time_casa));
    const jogoVolta = todosJogos.find(p => p.rodada === partida.rodada + 1 && (p.time_casa === partida.time_visitante || p.time_casa === partida.time_casa));

    const isJogoVolta = !!jogoIda;

    let isEmpateAgregado = false;
    let textoDesempate = "Pênaltis";

    const pC_Atual = casa === '' ? 0 : Number(casa);
    const pV_Atual = visitante === '' ? 0 : Number(visitante);

    if (!jogoIda && !jogoVolta) { // Jogo Único
        if (casa !== '' && visitante !== '' && pC_Atual === pV_Atual) {
            isEmpateAgregado = true;
        }
    } else if (isJogoVolta && jogoIda) {
        const idaC = jogoIda.placar_casa ?? 0;
        const idaV = jogoIda.placar_visitante ?? 0;

        let totalTimeMandanteAtual = pC_Atual; 
        let totalTimeVisitanteAtual = pV_Atual; 

        if (jogoIda.time_casa === partida.time_visitante) {
            totalTimeMandanteAtual += idaV;
            totalTimeVisitanteAtual += idaC;
        } else {
            totalTimeMandanteAtual += idaC;
            totalTimeVisitanteAtual += idaV;
        }

        if (totalTimeMandanteAtual === totalTimeVisitanteAtual && casa !== '' && visitante !== '') {
            isEmpateAgregado = true;
            textoDesempate = "Agregado Empatado";
        }
    }

    async function handleSalvar() {
      setLoading(true)
      const c = casa === '' ? 0 : Number(casa)
      const v = visitante === '' ? 0 : Number(visitante)
      
      const dc = (isEmpateAgregado && extraCasa !== '') ? Number(extraCasa) : undefined
      const dv = (isEmpateAgregado && extraVisitante !== '') ? Number(extraVisitante) : undefined
  
      const res = await atualizarPlacarManual(partida.id, c, v, dc, dv)
      if (res.success) { 
          toast.success('Salvo!'); 
          onUpdate(); 
      } else { 
          toast.error('Erro'); 
      }
      setLoading(false)
    }
  
    if (partida.status === 'bye') return null;
  
    return (
      <div className="px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors group">
        <div className="flex-1 flex items-center justify-center md:justify-start gap-4">
          <div className="flex items-center gap-3 w-40 justify-end">
            <span className="font-bold text-gray-300 text-xs md:text-sm text-right truncate">{partida.casa?.nome}</span>
            {partida.casa?.escudo ? <img src={partida.casa.escudo} className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-gray-800 rounded-full"/>}
          </div>
          
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-gray-800">
             <input 
                type="number" 
                step="0.1" 
                className="w-12 h-8 text-center bg-transparent text-white font-bold focus:outline-none border-b border-gray-600 focus:border-blue-500" 
                value={casa} 
                onChange={e => setCasa(e.target.value)} 
                placeholder="0"
             />
             <span className="text-gray-600 text-xs">✕</span>
             <input 
                type="number" 
                step="0.1" 
                className="w-12 h-8 text-center bg-transparent text-white font-bold focus:outline-none border-b border-gray-600 focus:border-blue-500" 
                value={visitante} 
                onChange={e => setVisitante(e.target.value)} 
                placeholder="0"
             />
          </div>

          <div className="flex items-center gap-3 w-40">
             {partida.visitante ? (
                 <>
                    {partida.visitante?.escudo ? <img src={partida.visitante.escudo} className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-gray-800 rounded-full"/>}
                    <span className="font-bold text-gray-300 text-xs md:text-sm truncate">{partida.visitante?.nome}</span>
                 </>
             ) : <span className="text-gray-600 text-xs italic">A definir</span>}
          </div>
        </div>
  
        <div className="flex items-center justify-center gap-4 border-l border-gray-800 pl-4 md:min-w-[220px]">
            <div className={`transition-all duration-300 overflow-hidden flex items-center ${isEmpateAgregado ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/30">
                    <span className="text-[9px] font-bold uppercase text-amber-500 mr-2 leading-tight w-10 text-right">{textoDesempate}</span>
                    <input type="number" className="w-8 h-7 text-center border border-amber-500/50 rounded text-xs bg-black text-amber-500 font-bold focus:outline-none" placeholder="-" value={extraCasa} onChange={(e) => setExtraCasa(e.target.value)} />
                    <span className="text-amber-500 text-xs font-bold">:</span>
                    <input type="number" className="w-8 h-7 text-center border border-amber-500/50 rounded text-xs bg-black text-amber-500 font-bold focus:outline-none" placeholder="-" value={extraVisitante} onChange={(e) => setExtraVisitante(e.target.value)} />
                </div>
            </div>
            <button onClick={handleSalvar} disabled={loading} className="h-9 w-9 flex items-center justify-center bg-gray-800 text-gray-400 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-lg">
                {loading ? <RefreshCw size={14} className="animate-spin"/> : <Save size={16} />}
            </button>
        </div>
      </div>
    )
}
