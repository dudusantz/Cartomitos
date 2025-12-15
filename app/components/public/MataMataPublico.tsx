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
  const [listaJogosRaw, setListaJogosRaw] = useState<any[]>([])
  const [partidasAgrupadas, setPartidasAgrupadas] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)
  
  // Zoom
  const [escala, setEscala] = useState(0.9)
  
  // Drag
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // =================================================================================
  // 1. CARREGAMENTO INICIAL
  // =================================================================================
  useEffect(() => {
    async function load() {
        try {
            const dados = await listarPartidas(campeonatoId)
            if (dados && Array.isArray(dados)) {
                const corte = Number(rodadasCorte) || 6
                const apenasMataMata = dados.filter((p: any) => p.rodada > corte)
                
                setListaJogosRaw(apenasMataMata)
                
                // Processa dados originais do banco
                const agrupados = processarConfrontos(apenasMataMata, corte, false)
                setPartidasAgrupadas(agrupados)
            }
        } catch (error) {
            console.error("Erro ao carregar mata-mata:", error)
        } finally {
            setLoading(false)
        }
    }
    load()
  }, [campeonatoId, rodadasCorte])

  // =================================================================================
  // 2. LÓGICA CORE: AGRUPAR JOGOS (IDA + VOLTA) E CALCULAR AGREGADO
  // =================================================================================
  function processarConfrontos(jogos: any[], corte: number, usarParciais: boolean) {
      if (!jogos || jogos.length === 0) return []

      // Descobre a primeira rodada com times para ignorar preliminares vazias
      const rodadasComTimes = jogos
          .filter((p: any) => p.time_casa || p.time_visitante)
          .map((p: any) => p.rodada)
      
      const rodadaInicialReal = rodadasComTimes.length > 0 
          ? Math.min(...rodadasComTimes) 
          : (corte + 1)

      const confrontosMap = new Map()
      
      // Ordena por rodada para processar Ida antes da Volta
      const jogosOrdenados = [...jogos].sort((a:any, b:any) => a.rodada - b.rodada)

      jogosOrdenados.forEach((jogo: any) => {
          if (jogo.rodada < rodadaInicialReal) return

          // Normaliza Rodada Visual
          const rodadaRelativa = jogo.rodada - rodadaInicialReal
          const faseVisual = Math.floor(rodadaRelativa / 2) + 1

          // Chave única do confronto
          const id1 = jogo.time_casa || 'def'
          const id2 = jogo.time_visitante || 'def'
          const timesChave = [id1, id2].sort().join('-')
          const chaveUnica = (id1 === 'def' && id2 === 'def') 
              ? `F${faseVisual}-GAME-${jogo.id}` 
              : `F${faseVisual}-${timesChave}`

          if (confrontosMap.has(chaveUnica)) {
              // === JOGO DE VOLTA ===
              const confronto = confrontosMap.get(chaveUnica)
              
              const placarCasaVolta = jogo.placar_casa ?? 0
              const placarVisVolta = jogo.placar_visitante ?? 0

              // Soma no Agregado (Invertendo mando se necessário)
              if (jogo.time_casa === confronto.time_visitante) {
                   confronto.placar_visitante += placarCasaVolta
                   confronto.placar_casa += placarVisVolta
              } else {
                   confronto.placar_casa += placarCasaVolta
                   confronto.placar_visitante += placarVisVolta
              }

              // SE ESTAMOS NO MODO AO VIVO E O JOGO DE VOLTA TEM PARCIAL:
              // Finalizamos o confronto para mostrar quem está passando (Linha Verde)
              if (usarParciais && jogo.is_parcial) {
                  confronto.status = 'finalizado'
              } 
              // Se for status real do banco
              else if (jogo.status === 'finalizado') {
                  confronto.status = 'finalizado'
                  confronto.desempate_casa = jogo.desempate_casa
                  confronto.desempate_visitante = jogo.desempate_visitante
              }

          } else {
              // === JOGO DE IDA (Novo Card) ===
              
              // Verifica se existe um jogo de volta agendado para este confronto
              // (Para saber se é Jogo Único ou Ida)
              const temVolta = jogosOrdenados.some((j:any) => 
                  j.rodada > jogo.rodada && 
                  ((j.time_casa === jogo.time_visitante && j.time_visitante === jogo.time_casa) ||
                   (j.time_casa === jogo.time_casa && j.time_visitante === jogo.time_visitante))
              );

              let statusVisual = jogo.status;

              // SE ESTAMOS NO MODO AO VIVO E O JOGO DE IDA TEM PARCIAL:
              if (usarParciais && jogo.is_parcial) {
                  if (temVolta) {
                      // É jogo de IDA: Atualiza placar mas NÃO finaliza (não mostra quem passa)
                      statusVisual = 'andamento' 
                  } else {
                      // É jogo ÚNICO (ex: Final): Finaliza para mostrar o campeão virtual
                      statusVisual = 'finalizado'
                  }
              }

              confrontosMap.set(chaveUnica, {
                  ...jogo,
                  rodada: faseVisual,
                  placar_casa: jogo.placar_casa ?? 0,
                  placar_visitante: jogo.placar_visitante ?? 0,
                  status: statusVisual
              })
          }
      })

      return Array.from(confrontosMap.values())
  }

  // =================================================================================
  // 3. AÇÃO "VER PARCIAIS AO VIVO"
  // =================================================================================
  async function toggleAoVivo() {
    if (!modoAoVivo) {
        setLoadingLive(true)
        try {
            // 1. Descobre a RODADA ATUAL (Menor rodada com jogos não finalizados)
            // Isso evita pegar parciais para jogos futuros (Volta) quando ainda estamos na Ida
            const jogosPendentes = listaJogosRaw.filter(j => j.status !== 'finalizado' && j.status !== 'bye')
            
            if (jogosPendentes.length === 0) {
                toast.error("Todos os jogos já foram finalizados.")
                setLoadingLive(false)
                return
            }

            const rodadaAtual = Math.min(...jogosPendentes.map(j => j.rodada))
            
            // 2. Busca parciais APENAS para a rodada atual
            const jogosDaRodada = jogosPendentes.filter(j => j.rodada === rodadaAtual)
            
            const { jogos: parciais } = await buscarParciaisAoVivo(jogosDaRodada)
            
            // 3. Mescla
            const listaComParciais = listaJogosRaw.map(jogo => {
                // Só aplica parcial se for da rodada atual
                if (jogo.rodada === rodadaAtual) {
                    const p = parciais?.find((x:any) => x.id === jogo.id)
                    if (p && p.is_parcial) {
                        return { 
                            ...jogo, 
                            placar_casa: p.placar_casa, 
                            placar_visitante: p.placar_visitante, 
                            is_parcial: true 
                        }
                    }
                }
                return jogo
            })

            // 4. Reprocessa
            const novosAgrupados = processarConfrontos(listaComParciais, Number(rodadasCorte)||6, true)
            
            setPartidasAgrupadas(novosAgrupados)
            setModoAoVivo(true)
            toast.success(`Parciais da Rodada ${rodadaAtual} carregadas!`)

        } catch (e) { 
            console.error(e)
            toast.error("Erro ao buscar parciais.")
        }
        setLoadingLive(false)
    } else {
        const agrupadosOriginal = processarConfrontos(listaJogosRaw, Number(rodadasCorte)||6, false)
        setPartidasAgrupadas(agrupadosOriginal)
        setModoAoVivo(false)
    }
  }

  // =================================================================================
  // 4. UI (ZOOM & DRAG)
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

  if (partidasAgrupadas.length === 0) {
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
                    <MataMataBracket partidas={partidasAgrupadas} />
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