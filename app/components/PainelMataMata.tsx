'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  atualizarRodadaMataMata, 
  listarPartidas, 
  excluirMataMata, 
  atualizarPlacarManual 
} from '@/app/actions'
import MataMataBracket from './MataMataBracket'
import { ModalConfirmacao } from './ModalConfirmacao' 
import SorteioMataMata from './admin/SorteioMataMata'
import { RefreshCw, Trash2, Trophy, Save, Edit3, Eye, Wand2, CalendarDays, Sparkles, AlertTriangle } from 'lucide-react'

interface Props {
  campeonatoId: number
  rodadasCorte: number
  bloquearGerador?: boolean 
  isCopa?: boolean
}

export default function PainelMataMata({ campeonatoId, rodadasCorte, bloquearGerador = false, isCopa = false }: Props) {
  const [partidas, setPartidas] = useState<any[]>([])
  
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
  const fasesIda = fasesDisponiveis.filter(r => r % 2 !== 0) 
  const isJogoUnico = (fase: number) => !fasesDisponiveis.includes(fase + 1)

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

  // --- AÇÕES ---

  async function handleAtualizarAPI() {
    const f = Number(faseAtual)
    const unico = isJogoUnico(f)
    if(!rodadaIda && (!unico && !rodadaVolta)) return toast.error("Preencha as rodadas do Cartola.")
    
    setLoading(true)
    const rodadaReal = f + rodadasCorte
    const volta = unico ? 0 : Number(rodadaVolta)
    
    const res = await atualizarRodadaMataMata(
      campeonatoId,
      rodadaReal,
      Number(rodadaIda),
      volta,
      rodadaDesempate ? Number(rodadaDesempate) : undefined
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
                {/* === BARRA DE CONTROLE === */}
                <section className="rounded-[24px] border border-white/10 bg-[#111310] shadow-[0_20px_60px_rgba(0,0,0,.28)] overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-white">
                        <CalendarDays size={17} className="text-[#f4b900]" />
                        <h3 className="text-sm font-black">Controle da fase</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Sincronize ida, volta e o jogo decisivo usando as rodadas do Cartola.</p>
                    </div>
                    <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] ${empatesPendentes > 0 ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-emerald-400/20 bg-emerald-400/8 text-emerald-400'}`}>
                      {empatesPendentes > 0 ? <AlertTriangle size={12} /> : <Sparkles size={12} />}
                      {empatesPendentes > 0 ? `${empatesPendentes} desempate${empatesPendentes > 1 ? 's' : ''} pendente${empatesPendentes > 1 ? 's' : ''}` : 'Fase sem pendências'}
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-[minmax(230px,1fr)_auto_auto] lg:items-end">
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Fase selecionada</label>
                        <select className="h-12 w-full rounded-xl border border-white/10 bg-[#080908] px-4 text-sm font-bold text-white outline-none transition focus:border-[#f4b900]/60" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                            {fasesIda.length > 0 ? fasesIda.map(f => (
                                <option key={f} value={f}>{isJogoUnico(f) ? `Fase ${Math.ceil(f/2)} (Jogo Único)` : `Fase ${Math.ceil(f/2)} (Ida & Volta)`}</option>
                            )) : <option value="1">Fase 1</option>}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Ida</label>
                            <input type="number" min="1" placeholder="Rod." className="h-12 w-[72px] rounded-xl border border-white/10 bg-[#080908] text-center text-sm font-black text-white outline-none transition focus:border-[#f4b900]/60" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                        </div>
                        {!isJogoUnico(Number(faseAtual)) && (
                            <div>
                                <label className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Volta</label>
                                <input type="number" min="1" placeholder="Rod." className="h-12 w-[72px] rounded-xl border border-white/10 bg-[#080908] text-center text-sm font-black text-white outline-none transition focus:border-[#f4b900]/60" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-amber-400">Decisivo</label>
                            <input type="number" min="1" placeholder="Se empatar" className="h-12 w-[92px] rounded-xl border border-amber-400/25 bg-amber-400/5 text-center text-xs font-black text-amber-200 outline-none transition placeholder:text-amber-200/35 focus:border-amber-400/70" value={rodadaDesempate} onChange={e => setRodadaDesempate(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleAtualizarAPI} disabled={loading} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f4b900] px-5 text-[10px] font-black uppercase tracking-[.08em] text-black transition hover:bg-[#ffd12a] disabled:cursor-wait disabled:opacity-60 lg:flex-none">
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar resultados
                        </button>
                        <button 
                            onClick={handleLimpar} 
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 transition hover:bg-red-500 hover:text-white"
                            title="Limpar / Resetar Fase"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>

                  <div className="border-t border-white/8 bg-black/15 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
                    <strong className="text-slate-300">Desempate automático:</strong> informe a rodada decisiva. Ela só será aplicada aos confrontos que terminarem empatados no agregado.
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
