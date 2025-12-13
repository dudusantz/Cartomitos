'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  atualizarRodadaMataMata, 
  listarPartidas, 
  excluirMataMata, 
  atualizarPlacarManual 
} from '../actions'
import MataMataBracket from './MataMataBracket'
import ModalConfirmacao from './ModalConfirmacao'
import SorteioMataMata from './admin/SorteioMataMata'
import { RefreshCw, Trash2, Trophy, Save, Edit3, Eye, Shield } from 'lucide-react'

interface Props {
  campeonatoId: number
  rodadasCorte: number
  bloquearGerador?: boolean 
}

export default function PainelMataMata({ campeonatoId, rodadasCorte, bloquearGerador = false }: Props) {
  const [partidas, setPartidas] = useState<any[]>([])
  
  // Estados dos Controles (API)
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')
  
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
    
    if (jogosMataMata.length === 0) {
        setModoSorteio(!bloquearGerador)
    } else {
        setModoSorteio(false)
    }
    setLoading(false)
  }

  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada_bracket))].sort((a, b) => a - b)
  const fasesIda = fasesDisponiveis.filter(r => r % 2 !== 0) 
  const isJogoUnico = (fase: number) => !fasesDisponiveis.includes(fase + 1)

  // --- AÇÕES ---

  async function handleAtualizarAPI() {
    const f = Number(faseAtual)
    const unico = isJogoUnico(f)
    if(!rodadaIda && (!unico && !rodadaVolta)) return toast.error("Preencha as rodadas do Cartola.")
    
    setLoading(true)
    const rodadaReal = f + rodadasCorte
    const volta = unico ? 0 : Number(rodadaVolta)
    
    const res = await atualizarRodadaMataMata(campeonatoId, rodadaReal, Number(rodadaIda), volta)
    
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
        mensagem: "Isso apagará TODOS os jogos desta fase. Tem certeza?", 
        onConfirm: async () => {
            const res = await excluirMataMata(campeonatoId, rodadasCorte + 1)
            if(res.success) { 
                toast.success(res.msg); 
                window.location.reload(); // Recarrega também ao limpar para evitar bugs visuais
            }
            setModalOpen(false)
        }, 
        tipo: 'perigo' 
    })
    setModalOpen(true)
  }

  // --- RENDER ---

  if (loading && partidas.length === 0) return <div className="text-center py-10 text-gray-500 animate-pulse">Carregando...</div>

  if (partidas.length === 0 && bloquearGerador) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl bg-white/5 animate-fadeIn">
            <div className="text-4xl mb-4 text-gray-700"><Trophy size={48} /></div>
            <h3 className="text-white font-bold text-lg">Aguardando Fase de Grupos</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-md text-center">O chaveamento aparecerá aqui automaticamente.</p>
        </div>
      )
  }

  if (modoSorteio) {
      return (
        <div className="animate-fadeIn">
            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 mb-6 text-center">
                <h3 className="text-white font-bold mb-2">Definir Chaveamento</h3>
                <p className="text-gray-500 text-xs mb-4">Configure os potes abaixo para gerar os confrontos.</p>
            </div>
            
            {/* AQUI ESTÁ A CORREÇÃO: Força o reload da página ao terminar o sorteio */}
            <SorteioMataMata 
                campeonatoId={campeonatoId} 
                onSucesso={() => {
                    toast.success("Chaves geradas! Atualizando página...");
                    setTimeout(() => window.location.reload(), 1000); // Pequeno delay para o toast aparecer
                }} 
            />
        </div>
      )
  }

  return (
    <div className="animate-fadeIn space-y-6">
        <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
        
        {/* === BARRA DE CONTROLE === */}
        <div className="bg-[#121212] p-5 rounded-xl border border-gray-800 flex flex-wrap gap-4 items-end shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Shield size={100} /></div>
            
            <div className="flex-1 min-w-[180px] z-10">
                <label className="text-gray-500 text-[10px] font-bold uppercase block mb-1">Fase Atual (Controle)</label>
                <select className="w-full bg-black border border-gray-700 text-white p-2.5 rounded-lg outline-none focus:border-blue-600 transition text-sm" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                    {fasesIda.length > 0 ? fasesIda.map(f => (
                        <option key={f} value={f}>{isJogoUnico(f) ? `Fase ${Math.ceil(f/2)} (Jogo Único)` : `Fase ${Math.ceil(f/2)} (Ida & Volta)`}</option>
                    )) : <option value="1">Fase 1</option>}
                </select>
            </div>
            
            <div className="flex gap-2 z-10">
                <div className="flex flex-col">
                    <label className="text-[9px] text-gray-500 font-bold uppercase mb-1 ml-1">Ida (Cartola)</label>
                    <input type="number" placeholder="#" className="w-14 bg-black border border-gray-700 text-white p-2.5 rounded-lg text-center outline-none focus:border-blue-600 transition text-sm" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                </div>
                {!isJogoUnico(Number(faseAtual)) && (
                    <div className="flex flex-col">
                        <label className="text-[9px] text-gray-500 font-bold uppercase mb-1 ml-1">Volta</label>
                        <input type="number" placeholder="#" className="w-14 bg-black border border-gray-700 text-white p-2.5 rounded-lg text-center outline-none focus:border-blue-600 transition text-sm" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                    </div>
                )}
                <div className="flex items-end">
                    <button onClick={handleAtualizarAPI} disabled={loading} className="h-[42px] bg-blue-600 text-white px-4 rounded-lg font-bold uppercase text-[10px] hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 flex items-center gap-2">
                        {loading ? <RefreshCw className="animate-spin w-3 h-3"/> : <RefreshCw className="w-3 h-3" />} <span className="hidden sm:inline">Atualizar & Avançar</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-2 ml-auto items-center pl-4 border-l border-gray-800 z-10">
                <button 
                    onClick={handleLimpar} 
                    className="h-[42px] text-red-500 bg-red-500/10 px-3 rounded-lg hover:bg-red-500 hover:text-white transition border border-red-500/20"
                    title="Limpar / Resetar Fase"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* === ABAS === */}
        <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg w-fit border border-gray-800">
             <button onClick={() => setModoEdicao(false)} className={`text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-all ${!modoEdicao ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <Eye size={14} /> Chaveamento
             </button>
             <button onClick={() => setModoEdicao(true)} className={`text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-all ${modoEdicao ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <Edit3 size={14} /> Editar Placar / Desempate
             </button>
        </div>

        {/* === CONTEÚDO === */}
        <div className="min-h-[400px]">
            {modoEdicao ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                     <div className="flex items-start gap-3 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-blue-200 text-xs">
                        <div className="bg-blue-500 p-1.5 rounded-full mt-0.5"><Edit3 size={12} className="text-white"/></div>
                        <div>
                            <strong className="block mb-1 text-blue-100">Modo de Edição Manual</strong>
                            Use esta área para corrigir placares ou inserir o vencedor dos pênaltis caso haja empate no agregado.
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
    </div>
  )
}

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

    const isJogoIda = !!jogoVolta; 
    const isJogoUnico = !jogoIda && !jogoVolta; 
    const isJogoVolta = !!jogoIda;

    let isEmpateAgregado = false;
    let textoDesempate = "Pênaltis";

    const pC_Atual = casa === '' ? 0 : Number(casa);
    const pV_Atual = visitante === '' ? 0 : Number(visitante);

    if (isJogoUnico) {
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
             <input type="number" className="w-10 h-8 text-center bg-transparent text-white font-bold focus:outline-none border-b border-gray-600 focus:border-blue-500" value={casa} onChange={e => setCasa(e.target.value)} placeholder="0"/>
             <span className="text-gray-600 text-xs">✕</span>
             <input type="number" className="w-10 h-8 text-center bg-transparent text-white font-bold focus:outline-none border-b border-gray-600 focus:border-blue-500" value={visitante} onChange={e => setVisitante(e.target.value)} placeholder="0"/>
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