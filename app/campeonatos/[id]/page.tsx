'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

import TabelaPublica from '@/app/components/public/TabelaPublica'
import MataMataPublico from '@/app/components/public/MataMataPublico'
import FaseGruposPublica from '@/app/components/public/FaseGruposPublica'

export default function PaginaCampeonato() {
  const params = useParams()
  const [liga, setLiga] = useState<any>(null)
  const [tab, setTab] = useState('tabela')

  // Garante que o ID seja um número válido
  const campeonatoId = params?.id ? Number(params.id) : 0

  useEffect(() => {
    if (!campeonatoId) return

    async function load() {
        const { data, error } = await supabase
            .from('campeonatos')
            .select('*')
            .eq('id', campeonatoId)
            .single()
            
        if (data && !error) {
            setLiga(data)
            // Se for mata-mata, já abre na aba da chave. Se não, abre na tabela/grupos.
            if (data.tipo === 'mata_mata') {
                setTab('chave')
            } else {
                setTab('tabela')
            }
        }
    }
    load()
  }, [campeonatoId])

  if (!liga) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
            <span className="animate-pulse font-bold tracking-widest text-xs uppercase">Carregando...</span>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
        
        {/* HEADER */}
        <div className="border-b border-gray-800 bg-[#1F2937] py-8 px-6 relative overflow-hidden">
            
            {/* AQUI FOI A MUDANÇA: Troquei a cor verde (#009B3A) pelo Amarelo (yellow-500) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20"></div>

            <div className="max-w-[1800px] mx-auto relative z-10">
                <Link href="/campeonatos" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#FFC107] mb-6 inline-flex items-center gap-2 transition-colors">
                    ← Voltar para Lista
                </Link>
                <div className="text-center">
                    <span className="px-3 py-1 border border-gray-700 rounded-full text-[9px] font-bold uppercase text-[#FFC107] bg-[#111827]">
                        {liga.tipo?.replace('_', ' ')}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mt-4 mb-2 tracking-tighter">{liga.nome}</h1>
                    <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase">Temporada {liga.ano}</p>
                </div>
            </div>
        </div>

        {/* MENU DE ABAS */}
        <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur border-b border-gray-800">
            <div className="max-w-[1800px] mx-auto flex justify-center gap-4 p-3">
                {/* Botão da Tabela (Só aparece se NÃO for Mata-Mata puro) */}
                {liga.tipo !== 'mata_mata' && (
                    <button 
                        onClick={() => setTab('tabela')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${tab === 'tabela' ? 'bg-[#FFC107] text-[#111827] shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        {liga.tipo === 'copa' ? 'Fase de Grupos' : 'Classificação'}
                    </button>
                )}
                
                {/* Botão do Mata-Mata (Só aparece se NÃO for Pontos Corridos puro) */}
                {liga.tipo !== 'pontos_corridos' && (
                    <button 
                        onClick={() => setTab('chave')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${tab === 'chave' ? 'bg-[#FFC107] text-[#111827] shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        {liga.tipo === 'copa' ? 'Fase Final' : 'Chaveamento'}
                    </button>
                )}
            </div>
        </div>

        {/* CONTEUDO PRINCIPAL */}
        <div className="flex-1 w-full max-w-[1800px] mx-auto p-6 animate-fadeIn">
            
            {tab === 'tabela' && (
                liga.tipo === 'copa' 
                ? <FaseGruposPublica campeonatoId={campeonatoId} />
                : <TabelaPublica campeonatoId={campeonatoId} />
            )}

            {tab === 'chave' && (
                <div className="h-full min-h-[600px]">
                    <MataMataPublico 
                        campeonatoId={campeonatoId} 
                        rodadasCorte={liga.tipo === 'copa' ? 6 : 0} 
                    />
                </div>
            )}

        </div>

        <footer className="py-8 text-center border-t border-gray-900 text-[9px] font-bold uppercase text-gray-700 bg-[#0a0a0a]">
            Cartola League System
        </footer>
    </div>
  )
}