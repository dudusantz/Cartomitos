'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Import components
import TabelaPublica from '@/app/components/public/TabelaPublica'
import MataMataPublico from '@/app/components/public/MataMataPublico'
import FaseGruposPublica from '@/app/components/public/FaseGruposPublica' // <--- IMPORT NOVO

export default function PaginaCampeonato() {
  const params = useParams()
  const [liga, setLiga] = useState<any>(null)
  const [tab, setTab] = useState('tabela')

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
            if (data.tipo === 'mata_mata') {
                setTab('chave')
            } else if (data.tipo === 'copa') {
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
        <div className="border-b border-gray-800 bg-[#0a0a0a] py-8 px-6">
            <div className="max-w-[1800px] mx-auto">
                <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white mb-6 block">
                    ← Voltar
                </Link>
                <div className="text-center">
                    <span className="px-3 py-1 border border-gray-800 rounded-full text-[9px] font-bold uppercase text-gray-400 bg-[#151515]">
                        {liga.tipo?.replace('_', ' ')}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mt-4 mb-2 tracking-tighter">{liga.nome}</h1>
                    <p className="text-gray-600 text-xs font-bold tracking-[0.2em] uppercase">Temporada {liga.ano}</p>
                </div>
            </div>
        </div>

        {/* MENU */}
        <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur border-b border-gray-800">
            <div className="max-w-[1800px] mx-auto flex justify-center gap-4 p-3">
                {liga.tipo !== 'mata_mata' && (
                    <button 
                        onClick={() => setTab('tabela')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${tab === 'tabela' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Classificação
                    </button>
                )}
                
                {liga.tipo !== 'pontos_corridos' && (
                    <button 
                        onClick={() => setTab('chave')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${tab === 'chave' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Mata-Mata
                    </button>
                )}
            </div>
        </div>

        {/* CONTEUDO */}
        <div className="flex-1 w-full max-w-[1800px] mx-auto p-6">
            
            {tab === 'tabela' && (
                liga.tipo === 'copa' 
                ? <FaseGruposPublica campeonatoId={campeonatoId} /> // <--- SUBSTITUÍDO AQUI
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

        <footer className="py-8 text-center border-t border-gray-900 text-[9px] font-bold uppercase text-gray-700">
            Cartola League System
        </footer>
    </div>
  )
}