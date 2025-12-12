import { listarCampeonatos } from '@/app/actions'
import Link from 'next/link'

// Atualiza a cada 5 segundos para garantir que novos campeonatos apareçam rápido
export const revalidate = 5

export default async function CampeonatosPage() {
  const campeonatos = await listarCampeonatos()

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
      
      {/* === CABEÇALHO === */}
      <div className="flex items-center gap-6 mb-12 pb-6 border-b border-white/5">
        <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        
        <div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Ligas Ativas
            </h1>
            <p className="text-sm text-gray-400 font-medium mt-2 max-w-lg leading-relaxed">
                Selecione uma competição abaixo para visualizar a tabela, jogos e estatísticas completas.
            </p>
        </div>
      </div>

      {/* === LISTAGEM (GRID) === */}
      {(!campeonatos || campeonatos.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma liga encontrada</h3>
          <p className="text-gray-500 mb-8 text-sm">Opa! Parece que ainda não temos campeonatos criados.</p>
          <Link 
            href="/admin/ligas" 
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
          >
            Criar Campeonato
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campeonatos.map((camp: any) => {
            const isPontos = camp.tipo === 'pontos_corridos';
            const isMata = camp.tipo === 'mata_mata';
            
            const themeColor = isPontos ? 'text-blue-400' : isMata ? 'text-purple-400' : 'text-orange-400';
            const gradientBg = isPontos ? 'from-blue-500/10 to-blue-900/5' : isMata ? 'from-purple-500/10 to-purple-900/5' : 'from-orange-500/10 to-orange-900/5';
            const borderColor = isPontos ? 'group-hover:border-blue-500/50' : isMata ? 'group-hover:border-purple-500/50' : 'group-hover:border-orange-500/50';

            return (
                <Link 
                  href={`/campeonato/${camp.id}`} 
                  key={camp.id}
                  className="group relative block"
                >
                  <div className={`relative h-full bg-[#121212] border border-white/5 rounded-3xl p-8 overflow-hidden transition-all duration-300 ${borderColor} hover:shadow-2xl hover:-translate-y-1`}>
                    
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-full bg-black/40 ${themeColor}`}>
                                {isPontos ? 'Pontos Corridos' : isMata ? 'Mata-Mata' : 'Copa & Grupos'}
                            </span>
                            <span className="text-white font-mono font-bold text-sm opacity-50">
                                {camp.ano}
                            </span>
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2 leading-tight group-hover:scale-[1.02] transition-transform origin-left">
                            {camp.nome}
                        </h2>
                        
                        <div className="w-10 h-1 bg-white/10 rounded-full mb-6 group-hover:w-full group-hover:bg-white/20 transition-all duration-700 ease-out"></div>

                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 group-hover:text-white transition-colors">
                            <span>Acessar Painel</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                  </div>
                </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}