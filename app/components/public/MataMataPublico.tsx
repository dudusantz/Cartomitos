'use client'

import { useEffect, useState, useRef } from 'react'
import { listarPartidas, buscarParciaisAoVivo } from '../../actions'
import MataMataBracket from '../MataMataBracket'

interface Props {
  campeonatoId: number
  rodadasCorte: number 
}

export default function MataMataPublico({ campeonatoId, rodadasCorte }: Props) {
  const [partidasOriginais, setPartidasOriginais] = useState<any[]>([])
  const [partidasExibidas, setPartidasExibidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)
  
  // Refs para o Scroll/Drag
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    async function load() {
        try {
            const dados = await listarPartidas(campeonatoId)
            if (dados && Array.isArray(dados)) {
                // Filtra apenas jogos do mata-mata
                const filtrados = dados
                    .filter((p: any) => p.rodada > rodadasCorte)
                    .map((p: any) => ({ ...p, rodada: p.rodada - rodadasCorte }))
                
                setPartidasOriginais(filtrados)
                setPartidasExibidas(filtrados)
            }
        } catch (error) {
            console.error("Erro mata-mata:", error)
        } finally {
            setLoading(false)
        }
    }
    load()
  }, [campeonatoId, rodadasCorte])

  // --- LÓGICA DO AO VIVO ---
  async function toggleAoVivo() {
    if (!modoAoVivo) {
        setLoadingLive(true)
        try {
            // Pega apenas jogos que NÃO estão finalizados e NÃO são BYE
            const jogosAbertos = partidasOriginais.filter(j => j.status !== 'finalizado' && j.status !== 'bye')
            
            // Busca parciais no Cartola
            const { jogos: parciais } = await buscarParciaisAoVivo(jogosAbertos)
            
            // Mescla os dados originais com as parciais
            const novasPartidas = partidasOriginais.map(jogo => {
                const p = parciais?.find((x:any) => x.id === jogo.id)
                if (p && p.is_parcial) {
                    return { 
                        ...jogo, 
                        placar_casa: p.placar_casa, 
                        placar_visitante: p.placar_visitante, 
                        is_parcial: true,
                        // --- O SEGREDO ESTÁ AQUI ---
                        // Forçamos o status para 'finalizado' SOMENTE NA MEMÓRIA.
                        // Isso faz o componente Bracket calcular quem passa de fase 
                        // e desenhar a linha verde baseada no placar parcial.
                        status: 'finalizado' 
                    }
                }
                return jogo
            })
            
            setPartidasExibidas(novasPartidas)
            setModoAoVivo(true)
        } catch (e) { console.error(e) }
        setLoadingLive(false)
    } else {
        // Resetar para o oficial (banco de dados)
        setPartidasExibidas(partidasOriginais)
        setModoAoVivo(false)
    }
  }

  // --- LÓGICA DE ARRASTAR (DRAG TO SCROLL) ---
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

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Carregando chaves...</div>

  if (partidasOriginais.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 bg-[#121212] rounded-3xl border border-gray-800">
            <span className="text-5xl mb-4 opacity-20">⚔️</span>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Mata-Mata não definido</p>
        </div>
      )
  }

  return (
    <div className="animate-fadeIn w-full">
        
        {/* CSS INJETADO (Seguro) */}
        <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 px-2">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <span className="text-yellow-500">⚡</span> Fase Eliminatória
                </h2>
                {modoAoVivo && <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">Ao Vivo</span>}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                 <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest hidden md:block">
                    ↔ Arraste para navegar
                </span>
                
                {/* BOTÃO AO VIVO */}
                <button 
                    onClick={toggleAoVivo} 
                    disabled={loadingLive}
                    className={`
                        px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2
                        ${modoAoVivo 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20'}
                    `}
                >
                    {loadingLive ? 'Carregando...' : (modoAoVivo ? 'Parar' : 'Ver Parciais Ao Vivo')}
                </button>
            </div>
        </div>
        
        {/* CONTAINER PRINCIPAL */}
        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`
                bg-[#121212] border rounded-3xl shadow-2xl 
                overflow-x-auto hide-scrollbar 
                cursor-grab active:cursor-grabbing select-none
                w-full transition-colors duration-500
                ${modoAoVivo ? 'border-green-500/20' : 'border-gray-800'}
            `}
        >
            <div className="w-max min-w-full p-8 flex items-center justify-start md:justify-center">
                {/* Passamos as partidasExibidas, que contêm as parciais e o status 'finalizado' forçado */}
                <MataMataBracket partidas={partidasExibidas} />
            </div>
        </div>
    </div>
  )
}