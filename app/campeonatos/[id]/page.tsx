'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { buscarPodium } from '@/app/actions'

// Ícones
import { Trophy, ArrowLeft, Crown, DollarSign, Calendar } from 'lucide-react'

// Componentes Públicos
import TabelaPublica from '@/app/components/public/TabelaPublica'
import MataMataPublico from '@/app/components/public/MataMataPublico'
import FaseGruposPublica from '@/app/components/public/FaseGruposPublica'
import TabelaGridPublica from '@/app/components/public/TabelaGridPublica' 

export default function PaginaPublicaCampeonato() {
  const params = useParams()
  const router = useRouter()
  
  const rawId = (Array.isArray(params.id) ? params.id[0] : params.id) || '';
  const parts = rawId.split('-');
  const id = Number(parts[parts.length - 1]);

  const [campeonato, setCampeonato] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'classificacao' | 'fase_final' | 'grupos' | 'grid'>('classificacao')
  const [podium, setPodium] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      if (!id || isNaN(id)) return
      
      const { data: camp } = await supabase
        .from('campeonatos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (!camp) {
          router.push('/campeonatos')
          return
      }
      
      setCampeonato(camp)

      // ABA INICIAL
      if (camp.tipo === 'mata_mata' || camp.tipo === 'mata-mata') {
          setActiveTab('fase_final')
      } else if (camp.tipo === 'copa') {
          setActiveTab('grupos')
      } else if (camp.tipo === 'grid') { 
          setActiveTab('grid')
      } else {
          setActiveTab('classificacao')
      }

      if (camp.ativo === false) {
          const p = await buscarPodium(id)
          setPodium(p)
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Trophy className="animate-bounce text-yellow-500" size={32} />
            <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Carregando Competição...</span>
        </div>
    </div>
  )

  const isFinalizado = campeonato.ativo === false;
  const isPaga = campeonato.is_paga === true;

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 animate-fadeIn pb-20 font-sans">
      
      {/* === HERO HEADER === */}
      <div className="relative bg-[#0a0a0a] border-b border-gray-800 pt-8 pb-12 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/bg-grid.svg')] opacity-10"></div>
        {/* MUDANÇA: COR DO BRILHO (Dourado se pago/grid) */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-colors duration-700 ${isPaga ? 'bg-yellow-600/10' : 'bg-blue-600/10'}`}></div>

        <div className="max-w-7xl mx-auto relative z-10">
            <Link href="/campeonatos" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white mb-6 uppercase tracking-widest transition-colors">
                <ArrowLeft size={14} /> Voltar para Ligas
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="flex items-center gap-1 text-gray-400 font-bold font-mono text-xs tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10">
                            <Calendar size={10} />
                            {campeonato.ano}
                        </span>
                        
                        <span className={`text-[10px] font-black uppercase tracking-widest border px-2 py-1 rounded ${isPaga ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' : 'text-blue-400 border-blue-500/20 bg-blue-500/10'}`}>
                            {campeonato.tipo.replace('_', ' ')}
                        </span>

                        {/* MUDANÇA: BADGE DOURADO */}
                        {isPaga && (
                            <span className="text-yellow-400 font-bold text-[10px] uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                <DollarSign size={10} /> Liga Paga
                            </span>
                        )}

                        {isFinalizado && (
                            <span className="text-red-400 font-bold text-[10px] uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1">
                                <Trophy size={10} /> Encerrado
                            </span>
                        )}
                    </div>
                    
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                        {campeonato.nome}
                    </h1>
                </div>

                {/* === PÓDIO === */}
                {isFinalizado && podium.length > 0 && (
                    <div className="flex items-end gap-3 md:gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm mt-4 md:mt-0">
                        {podium[1] && (
                            <div className="flex flex-col items-center">
                                <img src={podium[1].escudo} className="w-8 h-8 md:w-10 md:h-10 object-contain mb-1 opacity-80" alt="2º Lugar" />
                                <div className="h-6 w-8 md:h-8 md:w-10 bg-gray-400/20 rounded-t-lg flex items-center justify-center border-t border-gray-400/30">
                                    <span className="text-[10px] md:text-xs font-bold text-gray-400">2</span>
                                </div>
                            </div>
                        )}
                        {podium[0] && (
                            <div className="flex flex-col items-center relative -top-2">
                                <Crown size={14} className="text-yellow-400 mb-1 animate-bounce" />
                                <img src={podium[0].escudo} className="w-12 h-12 md:w-14 md:h-14 object-contain mb-2 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" alt="Campeão" />
                                <div className="h-10 w-10 md:h-12 md:w-12 bg-yellow-500/20 rounded-t-lg flex items-center justify-center border-t border-yellow-500/30 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent"></div>
                                    <span className="text-sm md:text-lg font-black text-yellow-500">1</span>
                                </div>
                            </div>
                        )}
                        {podium[2] && (
                            <div className="flex flex-col items-center">
                                <img src={podium[2].escudo} className="w-8 h-8 md:w-10 md:h-10 object-contain mb-1 opacity-60" alt="3º Lugar" />
                                <div className="h-4 w-8 md:h-6 md:w-10 bg-orange-700/20 rounded-t-lg flex items-center justify-center border-t border-orange-700/30">
                                    <span className="text-[10px] md:text-xs font-bold text-orange-700">3</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* === NAVEGAÇÃO (TABS) === */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 flex gap-8 overflow-x-auto no-scrollbar">
            
            {campeonato.tipo === 'pontos_corridos' && (
                <button 
                    onClick={() => setActiveTab('classificacao')}
                    className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'classificacao' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    Tabela
                </button>
            )}

            {/* MUDANÇA: ABA GRID DOURADA */}
            {campeonato.tipo === 'grid' && (
                <button 
                    onClick={() => setActiveTab('grid')}
                    className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'grid' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    Ranking Geral
                </button>
            )}

            {campeonato.tipo === 'copa' && (
                <button 
                    onClick={() => setActiveTab('grupos')}
                    className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'grupos' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    Fase de Grupos
                </button>
            )}

            {(campeonato.tipo === 'mata_mata' || campeonato.tipo === 'mata-mata' || campeonato.tipo === 'copa') && (
                <button 
                    onClick={() => setActiveTab('fase_final')}
                    className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'fase_final' ? 'border-purple-500 text-purple-500' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    {campeonato.tipo === 'copa' ? 'Fase Final' : 'Chaveamento'}
                </button>
            )}
        </div>
      </div>

      {/* === CONTEÚDO DAS ABAS === */}
      <div className="max-w-7xl mx-auto p-6 md:p-10 min-h-[400px]">
          
          {activeTab === 'classificacao' && (
              <div className="animate-fadeIn">
                <TabelaPublica campeonatoId={id} />
              </div>
          )}
          
          {activeTab === 'grid' && (
              <div className="animate-fadeIn">
                <TabelaGridPublica campeonatoId={id} />
              </div>
          )}
          
          {activeTab === 'grupos' && (
              <div className="animate-fadeIn">
                <FaseGruposPublica campeonatoId={id} />
              </div>
          )}
          
          {activeTab === 'fase_final' && (
              <div className="animate-fadeIn">
                <MataMataPublico 
                    campeonatoId={id} 
                    rodadasCorte={campeonato.tipo === 'copa' ? 6 : 0}
                />
              </div>
          )}
      </div>
    </div>
  )
}