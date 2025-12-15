'use client'

import { useEffect, useState, useRef } from 'react'
import { listarPartidas, buscarParciaisAoVivo } from '../../actions'
import MataMataBracket from '../MataMataBracket'
import { ZoomIn, ZoomOut, Maximize, MoveHorizontal, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  campeonatoId: number
  rodadasCorte: number 
}

export default function MataMataPublico({ campeonatoId, rodadasCorte }: Props) {
  const [listaJogosRaw, setListaJogosRaw] = useState<any[]>([]) // Dados originais do banco
  const [partidasExibidas, setPartidasExibidas] = useState<any[]>([]) // Dados normalizados para o Bracket
  
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)
  
  // Zoom e Drag
  const [escala, setEscala] = useState(0.9)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // =================================================================================
  // 1. CARREGAMENTO E NORMALIZAÇÃO
  // =================================================================================
  useEffect(() => {
    async function load() {
        try {
            const dados = await listarPartidas(campeonatoId)
            const corte = Number(rodadasCorte) || 6

            if (dados && Array.isArray(dados)) {
                // Pega apenas jogos do Mata-Mata
                const rawMataMata = dados.filter((p: any) => p.rodada > corte)
                setListaJogosRaw(rawMataMata)
                
                // Gera a versão visual inicial
                const normalizados = normalizarRodadas(rawMataMata, corte)
                setPartidasExibidas(normalizados)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    load()
  }, [campeonatoId, rodadasCorte])

  // Função que remove "buracos" nas rodadas (ex: 1ª Fase vazia) e faz começar do 1
  function normalizarRodadas(jogos: any[], corte: number) {
      if (!jogos.length) return []

      // Descobre a primeira rodada que REALMENTE tem times definidos
      const rodadasComTimes = jogos
          .filter((p: any) => p.time_casa || p.time_visitante)
          .map((p: any) => p.rodada)
      
      // Se não tiver times ainda, usa a próxima do corte
      const rodadaInicialReal = rodadasComTimes.length > 0 
          ? Math.min(...rodadasComTimes) 
          : (corte + 1)

      // Filtra e Renumera: R7 vira R1, R8 vira R2, etc.
      // Isso mantém Ida e Volta separados (R1 e R2), permitindo que o Bracket mostre "80 + 70"
      return jogos
          .filter((p: any) => p.rodada >= rodadaInicialReal)
          .map((p: any) => ({
              ...p,
              rodada: p.rodada - rodadaInicialReal + 1
          }))
  }

  // =================================================================================
  // 2. LÓGICA AO VIVO
  // =================================================================================
  async function toggleAoVivo() {
    if (!modoAoVivo) {
        setLoadingLive(true)
        try {
            // 1. Identifica a RODADA ATUAL (Menor rodada não finalizada)
            const jogosPendentes = listaJogosRaw.filter(j => j.status !== 'finalizado' && j.status !== 'bye')
            
            if (jogosPendentes.length === 0) {
                toast.error("Todos os jogos já foram finalizados.")
                setLoadingLive(false)
                return
            }

            const rodadaAtual = Math.min(...jogosPendentes.map(j => j.rodada))
            const jogosDaRodada = jogosPendentes.filter(j => j.rodada === rodadaAtual)
            
            // 2. Busca parciais
            const { jogos: parciais } = await buscarParciaisAoVivo(jogosDaRodada)
            
            // 3. Atualiza a lista RAW com as parciais e status simulado
            const listaComParciais = listaJogosRaw.map(jogo => {
                if (jogo.rodada === rodadaAtual) {
                    const p = parciais?.find((x:any) => x.id === jogo.id)
                    if (p && p.is_parcial) {
                        return { 
                            ...jogo, 
                            placar_casa: p.placar_casa, 
                            placar_visitante: p.placar_visitante, 
                            is_parcial: true,
                            // Força 'finalizado' SOMENTE NA MEMÓRIA para o Bracket calcular quem passa
                            // e pintar a linha verde baseado no placar parcial + ida
                            status: 'finalizado'
                        }
                    }
                }
                return jogo
            })

            // 4. Normaliza novamente para exibir
            const normalizados = normalizarRodadas(listaComParciais, Number(rodadasCorte)||6)
            
            setPartidasExibidas(normalizados)
            setModoAoVivo(true)
            toast.success(`Parciais da Rodada ${rodadaAtual} ativas!`)

        } catch (e) { 
            console.error(e)
            toast.error("Erro ao buscar parciais.")
        }
        setLoadingLive(false)
    } else {
        // RESET
        const normalizados = normalizarRodadas(listaJogosRaw, Number(rodadasCorte)||6)
        setPartidasExibidas(normalizados)
        setModoAoVivo(false)
    }
  }

  // =================================================================================
  // 3. UI (ZOOM & DRAG)
  // =================================================================================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const zoomIn = () => setEscala(prev => Math.min(prev + 0.1, 1.5));
  const zoomOut = () => setEscala(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setEscala(0.9);

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Carregando chaves...</div>

  if (partidasExibidas.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 bg-[#121212] rounded-3xl border border-gray-800">
            <span className="text-5xl mb-4 opacity-20">⚔️</span>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Mata-Mata não definido</p>
        </div>
      )
  }

  return (
    <div className="animate-fadeIn w-full flex flex-col h-full">
        <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        <div className="mb-4 flex flex-col md:flex-row justify-between items-end gap-4 px-2">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <span className="text-yellow-500">⚡</span> Fase Eliminatória
                </h2>
                {modoAoVivo && <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">Ao Vivo</span>}
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#1a1a1a] rounded-lg border border-gray-800 p-1 mr-2">
                    <button onClick={zoomOut} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Diminuir"><ZoomOut size={14}/></button>
                    <span className="text-[10px] font-mono w-8 text-center text-gray-500">{Math.round(escala * 100)}%</span>
                    <button onClick={zoomIn} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Aumentar"><ZoomIn size={14}/></button>
                    <div className="w-px h-4 bg-gray-800 mx-1"></div>
                    <button onClick={resetZoom} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Resetar"><Maximize size={14}/></button>
                </div>

                <button 
                    onClick={toggleAoVivo} 
                    disabled={loadingLive}
                    className={`
                        px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2
                        ${modoAoVivo 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20'}
                    `}
                >
                    {loadingLive ? <RefreshCcw className="animate-spin w-3 h-3"/> : null}
                    {loadingLive ? 'Buscando...' : (modoAoVivo ? 'Sair do Ao Vivo' : 'Ver Parciais Ao Vivo')}
                </button>
            </div>
        </div>
        
        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`
                bg-[#121212] border rounded-3xl shadow-2xl 
                overflow-x-auto overflow-y-hidden relative
                w-full transition-colors duration-500 
                h-[75vh] 
                ${modoAoVivo ? 'border-green-500/20' : 'border-gray-800'}
                cursor-grab active:cursor-grabbing hide-scrollbar
            `}
        >
            <div className="flex items-center justify-start h-full pl-10 pr-20 min-w-max">
                <div 
                    className="transition-transform duration-300 ease-out origin-left"
                    style={{ transform: `scale(${escala})` }}
                >
                    <MataMataBracket partidas={partidasExibidas} />
                </div>
            </div>

            <div className="absolute bottom-4 left-4 pointer-events-none opacity-50 flex items-center gap-2 text-gray-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                <MoveHorizontal size={14} />
                <span className="text-[10px] uppercase tracking-widest">
                    Arraste para navegar
                </span>
            </div>
        </div>
    </div>
  )
}