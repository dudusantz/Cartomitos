'use client'

import { listarCampeonatos } from '@/app/actions'
import Link from 'next/link'
import { Trophy, Calendar, DollarSign, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'

// Função auxiliar para gerar a URL amigável
function gerarSlug(nome: string, id: number) {
  const slug = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  
  return `${slug}-${id}`;
}

export default function CampeonatosPage() {
  const [campeonatos, setCampeonatos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Estado para controlar qual aba está ativa
  const [visualizacao, setVisualizacao] = useState<'oficiais' | 'pagas'>('oficiais')

  useEffect(() => {
    async function load() {
        const dados = await listarCampeonatos()
        setCampeonatos(dados)
        setLoading(false)
    }
    load()
  }, [])

  // Filtra as ligas baseado na aba selecionada
  const campeonatosFiltrados = campeonatos.filter(c => {
      const ehPaga = c.is_paga === true;
      if (visualizacao === 'pagas') return ehPaga;
      return !ehPaga; // Se a aba for oficiais, retorna as que NÃO são pagas
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-7 md:p-10 animate-fadeIn min-h-screen">
      
      {/* === CABEÇALHO === */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-9 md:mb-12 pb-6 border-b border-white/5">
        <div className="flex items-center gap-6">
            {/* === MUDANÇA AQUI: Ícone e fundo agora são AMBER/DOURADO === */}
            <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-900/20 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <Trophy className="w-8 h-8 text-amber-500" />
            </div>
            
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-500">Competições</span>
                <h1 className="mt-1 text-3xl md:text-5xl font-black text-white tracking-[-0.045em] leading-none">
                    Ligas e Copas
                </h1>
                <p className="text-sm text-gray-400 font-medium mt-2 max-w-lg leading-relaxed">
                    Acompanhe as tabelas, classificações e resultados.
                </p>
            </div>
        </div>

        {/* === MENU DE ABAS === */}
        <div className="grid grid-cols-2 w-full md:w-auto bg-[#121212] p-1.5 rounded-xl border border-white/10">
             <button 
                onClick={() => setVisualizacao('oficiais')}
                className={`flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${visualizacao === 'oficiais' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'}`}
             >
                <Trophy size={14} /> Oficiais
             </button>
             <button 
                onClick={() => setVisualizacao('pagas')}
                className={`flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${visualizacao === 'pagas' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'}`}
             >
                <DollarSign size={14} /> Ligas Pagas
             </button>
        </div>
      </div>

      {/* === LOADING === */}
      {loading ? (
         <div className="text-center py-20 text-gray-500 animate-pulse text-sm font-bold uppercase tracking-widest">Carregando competições...</div>
      ) : (
        <>
            {/* === LISTAGEM (GRID) === */}
            {(!campeonatosFiltrados || campeonatosFiltrados.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <h3 className="text-xl font-bold text-white mb-2">
                    {visualizacao === 'oficiais' ? 'Nenhuma liga oficial encontrada' : 'Nenhuma liga paga encontrada'}
                </h3>
                <p className="text-gray-500 text-sm">Em breve novos campeonatos estarão disponíveis.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campeonatosFiltrados.map((camp: any) => {
                    const isPontos = camp.tipo === 'pontos_corridos';
                    const isMata = camp.tipo === 'mata_mata';
                    const isFinalizado = !camp.ativo;
                    const linkAmigavel = `/campeonatos/${gerarSlug(camp.nome, camp.id)}`;
                    
                    // Verifica se é liga paga para ajustar cores
                    const isPaga = camp.is_paga === true;
                    const isGrid = camp.tipo === 'grid';

                    // Estilos dinâmicos
                    let themeColor = 'text-gray-400 border-gray-700 bg-gray-800/50';
                    let gradientBg = 'from-gray-900 to-black';
                    let borderColor = 'border-white/5';
                    let hoverEffect = '';

                    if (!isFinalizado) {
                        if (isPaga || isGrid) {
                             // ESTILO DOURADO PARA LIGAS PAGAS OU GRID
                             themeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
                             gradientBg = 'from-yellow-900/20 to-transparent';
                             borderColor = 'hover:border-yellow-500/50';
                        } else {
                             // ESTILOS NORMAIS PARA LIGAS OFICIAIS
                             themeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
                             gradientBg = 'from-yellow-900/10 to-transparent';
                             borderColor = 'hover:border-yellow-500/40';
                        }
                        hoverEffect = 'hover:-translate-y-1 hover:shadow-2xl';
                    } else {
                        gradientBg = 'from-red-900/5 to-transparent';
                        borderColor = 'hover:border-red-900/20';
                    }

                    return (
                        <Link 
                        href={linkAmigavel} 
                        key={camp.id}
                        className="group relative block h-full"
                        >
                        <div className={`relative h-full bg-[#121212] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 overflow-hidden transition-all duration-300 ${borderColor} ${hoverEffect}`}>
                            
                            {/* Background Gradiente */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-2">
                                        {/* Badge de Tipo */}
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] w-fit font-black uppercase tracking-widest border px-3 py-1 rounded-md ${themeColor}`}>
                                                {isPontos ? 'Pontos Corridos' : isMata ? 'Mata-Mata' : isGrid ? 'Grid / Ranking' : 'Copa & Grupos'}
                                            </span>
                                            {isPaga && (
                                                <span className="text-[10px] w-fit font-black uppercase tracking-widest border px-2 py-1 rounded-full text-yellow-400 border-yellow-500/20 bg-yellow-500/10 flex items-center gap-1">
                                                    <DollarSign size={10} />
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Badge de Finalizado */}
                                        {isFinalizado && (
                                            <span className="flex items-center gap-1 w-fit text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                                                <Lock size={10} /> Encerrado
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-500 font-mono font-bold text-xs flex items-center gap-1">
                                        <Calendar size={12} /> {camp.ano}
                                    </span>
                                </div>

                                <h2 className={`text-2xl font-black mb-auto leading-tight group-hover:scale-[1.01] transition-transform origin-left ${isFinalizado ? 'text-gray-400' : 'text-white'}`}>
                                    {camp.nome}
                                </h2>
                                
                                <div className={`w-8 h-1 rounded-full my-6 transition-all duration-500 ease-out group-hover:w-full ${isFinalizado ? 'bg-gray-800' : 'bg-white/10 group-hover:bg-white/20'}`}></div>

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-white transition-colors uppercase tracking-wider">
                                        {isFinalizado ? 'Ver Resultados' : 'Acessar Liga'}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFinalizado ? 'bg-gray-800 text-gray-500' : 'bg-white/10 text-white group-hover:bg-white group-hover:text-black'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </Link>
                    )
                })}
                </div>
            )}
        </>
      )}
    </div>
  )
}
