import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 60

export default async function ListaCampeonatos() {
  const { data: campeonatos } = await supabase
    .from('campeonatos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn">
        
        {/* Título da Seção */}
        <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-1 bg-gradient-to-r from-yellow-500 to-transparent rounded-full"></div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                Ligas <span className="text-yellow-500">Ativas</span>
            </h1>
        </div>

        {/* Grade de Cards */}
        {campeonatos && campeonatos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campeonatos.map((camp: any) => (
                    <Link 
                        key={camp.id} 
                        href={`/campeonato/${camp.id}`}
                        className="group bg-[#121212] border border-white/5 rounded-3xl p-8 hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-[240px]"
                    >
                        {/* Background Efeito */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-[80px] group-hover:bg-yellow-500/10 transition-all duration-500 -mr-10 -mt-10"></div>

                        <div className="relative z-10">
                            <div className="flex gap-2 mb-6">
                                <span className="inline-block px-3 py-1 rounded-lg bg-[#1a1a1a] border border-white/5 text-white text-[9px] font-black uppercase tracking-widest shadow-lg">
                                    {camp.tipo === 'pontos_corridos' ? 'Pontos Corridos' : camp.tipo?.replace('_', ' ')}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest">
                                    {camp.ano}
                                </span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-white mb-2 group-hover:text-yellow-500 transition-colors line-clamp-2 leading-tight">
                                {camp.nome}
                            </h3>
                        </div>

                        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Em andamento</span>
                            </div>
                            <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transform group-hover:rotate-[-45deg] transition-transform duration-300 font-bold text-xs">
                                ➜
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-gray-800 rounded-3xl bg-[#0a0a0a]">
                <span className="text-4xl mb-4 opacity-20">⚽</span>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Nenhuma liga encontrada</p>
            </div>
        )}
    </div>
  )
}