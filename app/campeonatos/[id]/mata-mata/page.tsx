'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from "@/lib/supabase"
import { listarPartidas, buscarParciaisAoVivo } from "@/app/actions"
import MataMataBracket from '@/app/components/MataMataBracket'
import { ChevronLeft, Trophy, AlertCircle } from 'lucide-react'

export default function PaginaMataMataPublica() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // Dados
  const [liga, setLiga] = useState<any>(null)
  const [partidasOriginais, setPartidasOriginais] = useState<any[]>([]) 
  const [partidasDisplay, setPartidasDisplay] = useState<any[]>([]) 
  
  // Controle Ao Vivo
  const [loading, setLoading] = useState(true)
  const [loadingLive, setLoadingLive] = useState(false)
  const [modoAoVivo, setModoAoVivo] = useState(false)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    
    // 1. Busca infos da Liga para saber onde começa o mata-mata
    const { data: dadosLiga } = await supabase
        .from('campeonatos')
        .select('*')
        .eq('id', campeonatoId)
        .single()
    
    setLiga(dadosLiga)

    // 2. Define o corte (Se mata-mata começa na 19, o corte é 18)
    // Se não tiver definido no banco, assume 0 (pega tudo)
    const rodadaInicio = dadosLiga?.rodada_mata_mata || 1
    const rodadasCorte = rodadaInicio - 1

    // 3. Busca jogos
    const dadosJogos = await listarPartidas(campeonatoId)

    // 4. FILTRA e NORMALIZA para o Bracket entender (Transforma rodada 19 em 1, 20 em 2...)
    const jogosProcessados = dadosJogos
        .filter((j: any) => j.rodada > rodadasCorte)
        .map((j: any) => ({
            ...j,
            rodada: j.rodada - rodadasCorte, // Normalização Essencial
            rodada_real: j.rodada // Mantém a original para referência
        }))

    setPartidasOriginais(jogosProcessados)
    setPartidasDisplay(jogosProcessados)
    setLoading(false)
  }

  // --- LÓGICA DO BOTÃO AO VIVO ---
  async function toggleAoVivo() {
    if (modoAoVivo) {
        setModoAoVivo(false)
        setPartidasDisplay(partidasOriginais)
        return
    }

    setLoadingLive(true)
    
    // Busca parciais apenas dos jogos não finalizados
    const jogosParaAtualizar = partidasOriginais.filter(j => j.status !== 'finalizado' && j.status !== 'bye')
    
    if (jogosParaAtualizar.length === 0) {
        // Se não tem jogos rolando, ativa o modo visual mas sem request
        setModoAoVivo(true)
        setLoadingLive(false)
        return
    }

    const res = await buscarParciaisAoVivo(jogosParaAtualizar)

    if (res.success && res.jogos) {
        const novasPartidas = partidasOriginais.map(original => {
            const atualizado = res.jogos.find((j: any) => j.id === original.id)
            if (atualizado) {
                // Atualiza placar e força status para bracket entender que deve calcular vencedor
                return {
                    ...original,
                    placar_casa: atualizado.placar_casa,
                    placar_visitante: atualizado.placar_visitante,
                    status: 'finalizado', // Simula finalizado para o Bracket pintar o vencedor verde
                    is_live: true
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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500 selection:text-black pb-20">
      
      {/* --- CABEÇALHO --- */}
      <div className="relative border-b border-gray-800/60 pt-10 pb-8 px-6 bg-gradient-to-b from-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href={`/campeonatos/${id}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition mb-6">
            <ChevronLeft size={14} /> Voltar ao Início
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-yellow-500 font-bold tracking-[0.2em] text-[10px] uppercase border border-yellow-500/20 px-2 py-0.5 rounded flex items-center gap-2">
                  <Trophy size={12} /> Mata-Mata Oficial
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                {liga?.nome || 'Carregando...'}
              </h1>
            </div>

            {/* BOTÃO AO VIVO */}
            <div>
                <button
                    onClick={toggleAoVivo}
                    disabled={loadingLive || partidasOriginais.length === 0}
                    className={`
                        relative overflow-hidden px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all duration-300 flex items-center gap-3 border shadow-2xl
                        ${modoAoVivo 
                            ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20' 
                            : 'bg-green-600 hover:bg-green-500 border-transparent text-white hover:scale-105'
                        }
                        ${loadingLive ? 'opacity-70 cursor-wait' : ''}
                    `}
                >
                    {loadingLive ? (
                        <>
                            <span className="animate-spin text-lg">⏳</span> Buscando...
                        </>
                    ) : modoAoVivo ? (
                        <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Sair do Ao Vivo
                        </>
                    ) : (
                        <>
                            <span className="text-lg">⚡</span> Ver Parciais
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL (BRACKET) --- */}
      <main className="w-full overflow-hidden px-4">
        {loading ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
        ) : partidasDisplay.length === 0 ? (
            <div className="max-w-4xl mx-auto mt-20 text-center p-12 border border-gray-800 border-dashed rounded-2xl bg-[#111]">
                <div className="bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-gray-500 opacity-50" size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Chaveamento Indefinido</h3>
                <p className="text-gray-500 text-sm">Os confrontos desta fase ainda não foram gerados pela administração.</p>
            </div>
        ) : (
            <div className="mt-10 animate-fadeIn">
                {/* O Bracket recebe os jogos já normalizados (rodada 1, 2, 3...) */}
                <MataMataBracket partidas={partidasDisplay} />
            </div>
        )}
      </main>

    </div>
  )
}