'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from "@/lib/supabase"
import { listarPartidas, buscarParciaisAoVivo } from "../../../actions"
import MataMataBracket from '@/app/components/MataMataBracket'

export default function PaginaMataMataPublica() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // Dados
  const [liga, setLiga] = useState<any>(null)
  const [partidasOriginais, setPartidasOriginais] = useState<any[]>([]) // Guarda os dados oficiais
  const [partidasDisplay, setPartidasDisplay] = useState<any[]>([])     // Guarda o que está sendo mostrado (Oficial ou Live)
  
  // Controle Ao Vivo
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    // 1. Busca infos da Liga
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)

    // 2. Busca jogos
    const dadosJogos = await listarPartidas(campeonatoId)
    setPartidasOriginais(dadosJogos)
    setPartidasDisplay(dadosJogos)
    setLoading(false)
  }

  // --- LÓGICA DO BOTÃO AO VIVO ---
  async function toggleAoVivo() {
    // Se já está ao vivo, desliga e volta pro original
    if (modoAoVivo) {
        setModoAoVivo(false)
        setPartidasDisplay(partidasOriginais)
        return
    }

    setLoadingLive(true)
    
    // Busca parciais apenas dos jogos não finalizados (para economizar e ser mais rápido)
    // Ou busca de todos da fase atual para garantir
    const jogosParaAtualizar = partidasOriginais.filter(j => j.status !== 'finalizado' && j.status !== 'bye')
    
    const res = await buscarParciaisAoVivo(jogosParaAtualizar)

    if (res.success && res.jogos) {
        // Mescla os jogos originais com os dados atualizados da API
        const novasPartidas = partidasOriginais.map(original => {
            const atualizado = res.jogos.find((j: any) => j.id === original.id)
            if (atualizado) {
                return {
                    ...original,
                    placar_casa: atualizado.placar_casa,
                    placar_visitante: atualizado.placar_visitante,
                    // Mantemos o status original ou forçamos um visual de 'em andamento'?
                    // O Bracket usa o placar para definir vencedor, então só o placar basta.
                }
            }
            return original
        })
        
        setPartidasDisplay(novasPartidas)
        setModoAoVivo(true)
    }
    
    setLoadingLive(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cartola-gold selection:text-black pb-20">
      
      {/* --- CABEÇALHO --- */}
      <div className="relative border-b border-gray-800/60 pt-10 pb-8 px-6 bg-gradient-to-b from-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href={`/campeonato/${id}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition mb-6">
            <span>←</span> Voltar ao Início
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-cartola-gold font-bold tracking-[0.2em] text-[10px] uppercase">
                  Mata-Mata Oficial
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                {liga?.nome || 'Carregando...'}
              </h1>
            </div>

            {/* BOTÃO AO VIVO */}
            <div>
                <button
                    onClick={toggleAoVivo}
                    disabled={loadingLive || partidasOriginais.length === 0}
                    className={`
                        relative overflow-hidden px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 border shadow-2xl
                        ${modoAoVivo 
                            ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20' 
                            : 'bg-green-600 hover:bg-green-500 border-transparent text-white hover:scale-105'
                        }
                        ${loadingLive ? 'opacity-70 cursor-wait' : ''}
                    `}
                >
                    {loadingLive ? (
                        <>
                            <span className="animate-spin text-lg">⏳</span> Buscando Parciais...
                        </>
                    ) : modoAoVivo ? (
                        <>
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Sair do Ao Vivo
                        </>
                    ) : (
                        <>
                            <span className="text-lg">⚡</span> Ver Parciais Ao Vivo
                        </>
                    )}
                </button>
                {modoAoVivo && (
                    <p className="text-center text-[9px] text-gray-500 mt-2 uppercase tracking-wide animate-pulse">
                        Mostrando pontuações em tempo real
                    </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL (BRACKET) --- */}
      <main className="w-full overflow-hidden">
        {loading ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cartola-gold"></div>
            </div>
        ) : partidasDisplay.length === 0 ? (
            <div className="max-w-4xl mx-auto mt-20 text-center p-10 border border-gray-800 border-dashed rounded-2xl bg-[#111]">
                <p className="text-gray-500">O chaveamento ainda não foi gerado.</p>
            </div>
        ) : (
            <div className="mt-10 animate-fadeIn">
                <MataMataBracket partidas={partidasDisplay} />
            </div>
        )}
      </main>

    </div>
  )
}