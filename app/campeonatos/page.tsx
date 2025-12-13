import { listarCampeonatos } from '@/app/actions'
import Link from 'next/link'
import { Trophy, Calendar } from 'lucide-react'

// Atualiza a cada 5 segundos
export const revalidate = 5

export default async function CampeonatosPage() {
  const campeonatos = await listarCampeonatos()

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
      
      {/* === CABEÇALHO === */}
      <div className="flex items-center gap-6 mb-12 pb-6 border-b border-white/5">
        <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
            <Trophy className="w-8 h-8 text-green-500" />
        </div>
        
        <div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Ligas e Copas
            </h1>
            <p className="text-sm text-gray-400 font-medium mt-2 max-w-lg leading-relaxed">
                Acompanhe as tabelas, classificações e resultados de todas as competições ativas e encerradas.
            </p>
        </div>
      </div>

      {/* === LISTAGEM (GRID) === */}
      {(!campeonatos || campeonatos.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma liga encontrada</h3>
          <p className="text-gray-500 text-sm">Em breve novos campeonatos estarão disponíveis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campeonatos.map((camp: any) => {
            const isPontos = camp.tipo === 'pontos_corridos';
            const isMata = camp.tipo === 'mata_mata';
            const isFinalizado = !camp.ativo; // Verifica se está inativo
            
            // Estilos dinâmicos
            let themeColor = 'text-gray-400 border-gray-700 bg-gray-800/50';
            let gradientBg = 'from-gray-900 to-black';
            let borderColor = 'border-white/5';
            let hoverEffect = '';

            if (!isFinalizado) {
                // Ligas ATIVAS (Coloridas)
                themeColor = isPontos ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : isMata ? 'text-purple-400 border-purple-500/20 bg-purple-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10';
                gradientBg = isPontos ? 'from-blue-900/10 to-transparent' : isMata ? 'from-purple-900/10 to-transparent' : 'from-orange-900/10 to-transparent';
                borderColor = isPontos ? 'hover:border-blue-500/50' : isMata ? 'hover:border-purple-500/50' : 'hover:border-orange-500/50';
                hoverEffect = 'hover:-translate-y-1 hover:shadow-2xl';
            } else {
                // Ligas FINALIZADAS (Cinza/Vermelho)
                gradientBg = 'from-red-900/5 to-transparent';
                borderColor = 'hover:border-red-900/20';
            }

            return (
                <Link 
                  href={`/campeonatos/${camp.id}`} 
                  key={camp.id}
                  className="group relative block h-full"
                >
                  <div className={`relative h-full bg-[#121212] border border-white/5 rounded-3xl p-8 overflow-hidden transition-all duration-300 ${borderColor} ${hoverEffect}`}>
                    
                    {/* Background Gradiente */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-2">
                                {/* Badge de Tipo */}
                                <span className={`text-[10px] w-fit font-black uppercase tracking-widest border px-3 py-1 rounded-full ${themeColor}`}>
                                    {isPontos ? 'Pontos Corridos' : isMata ? 'Mata-Mata' : 'Copa & Grupos'}
                                </span>
                                
                                {/* Badge de Finalizado */}
                                {isFinalizado && (
                                    <span className="flex items-center gap-1 w-fit text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                                        <Trophy size={10} /> Encerrado
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
    </div>
  )
}