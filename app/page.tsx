import Link from 'next/link'
import { buscarMaioresPontuadores, buscarLigaOficial } from '@/app/actions'

// Atualiza a cada 60 segundos
export const revalidate = 60

export default async function Home() {
  const recordes = await buscarMaioresPontuadores() || []
  const tabelaOficial = await buscarLigaOficial() || []

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
        
        {/* === CABEÇALHO === */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 pb-6 border-b border-white/5 relative z-10 gap-6">
            
            {/* Lado Esquerdo: Título Campeonatos */}
            <div className="flex items-center gap-4 self-start md:self-auto">
                <div className="w-1.5 h-16 bg-gradient-to-b from-yellow-500 to-yellow-700 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)]"></div>
                <div className="flex flex-col gap-1">
                    <Link href="/campeonato" className="group cursor-pointer block w-fit">
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter flex items-center gap-2 group-hover:text-green-500 transition-colors">
                            CAMPEONATOS
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </h1>
                    </Link>
                    <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] mt-1 uppercase">
                        Temporada 2025
                    </p>
                </div>
            </div>

            {/* Lado Direito: BOTÃO SALA DE TROFÉUS (NOVO) */}
            <Link 
                href="/campeoes" 
                className="group flex items-center gap-3 bg-[#1a1a1a] border border-yellow-500/30 px-5 py-3 rounded-full hover:bg-yellow-500/10 hover:border-yellow-500 transition-all duration-300 shadow-lg hover:shadow-yellow-500/20"
            >
                <div className="bg-yellow-500/20 p-1.5 rounded-full group-hover:scale-110 transition-transform">
                    <span className="text-lg">🏆</span>
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest leading-none mb-1">Galeria de</span>
                    <span className="text-sm font-black text-white uppercase tracking-wide leading-none group-hover:text-yellow-400">Troféus</span>
                </div>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-yellow-500 transition-colors ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-0">

          {/* === ESQUERDA: RANKING GERAL === */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative group">
              
              <div className="bg-[#151515] p-6 flex justify-between items-center border-b border-white/5">
                <h2 className="text-sm font-black flex items-center gap-3 text-white uppercase tracking-widest">
                  <span className="text-lg text-yellow-500">🏆</span> Ranking da Temporada
                </h2>
                <span className="text-[9px] font-bold text-yellow-500/80 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-widest bg-yellow-500/5">
                  Top 5
                </span>
              </div>
              
              <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0a0a0a] text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      <tr>
                        <th className="p-5 w-[15%] text-center">Pos</th>
                        <th className="p-5 w-[55%]">Clube</th>
                        <th className="p-5 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {tabelaOficial.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-500 text-xs uppercase">
                                Nenhum time classificado ainda.
                            </td>
                        </tr>
                      ) : (
                        tabelaOficial.map((time: any) => {
                            const isLeader = time.pos === 1;
                            
                            return (
                                <tr key={time.pos} className={`group transition-all duration-300 ${isLeader ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : 'hover:bg-white/[0.02]'}`}>
                                  
                                  <td className={`p-5 text-center relative ${isLeader ? 'border-l-2 border-yellow-500' : 'border-l-2 border-transparent'}`}>
                                    <span className={`font-black text-xl leading-none ${isLeader ? 'text-yellow-500 drop-shadow-md scale-110' : 'text-white'}`}>
                                        {time.pos}º
                                    </span>
                                  </td>
                                  
                                  <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`relative ${isLeader ? 'scale-110 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'opacity-70 group-hover:opacity-100'}`}>
                                            <img src={time.escudo} alt={time.time} className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className={`font-bold text-sm ${isLeader ? 'text-white' : 'text-gray-300'}`}>{time.time}</div>
                                            <div className="text-[9px] uppercase font-bold text-gray-600">{time.cartoleiro}</div>
                                        </div>
                                    </div>
                                  </td>
                                  
                                  <td className="p-5 text-right">
                                     <span className={`font-mono font-black text-lg ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
                                        {Number(time.pontos).toFixed(2)}
                                     </span>
                                  </td>
                                </tr>
                            )
                          })
                      )}
                    </tbody>
                  </table>
              </div>

              <div className="p-4 border-t border-white/5 bg-[#0a0a0a] text-center">
                <Link href="/ranking" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition duration-300 group">
                  Ver Classificação Completa <span className="text-yellow-500 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </section>
          </div>

          {/* === DIREITA: RECORDES (MANTIDO) === */}
          <div className="space-y-8" id="recordes">
            <Link href="/recordes" className="block group">
                <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-blue-900/10">
                
                    {/* Header Recordes */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                        <h3 className="font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest text-xs group-hover:text-blue-300 transition-colors">
                            ⚡ Recordes
                        </h3>
                        <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest border border-blue-500/20 px-2 py-1 rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                            Ver Todos
                        </span>
                    </div>
                    
                    <div className="divide-y divide-white/[0.03]">
                        {recordes.length === 0 ? (
                            <div className="p-10 text-center text-gray-600 text-[10px] font-bold uppercase border-dashed">Aguardando jogos.</div>
                        ) : (
                            recordes.map((recorde: any, index: number) => (
                            <div key={index} className="flex items-center p-5 hover:bg-white/[0.04] transition-colors">
                                <div className={`font-black text-xl w-8 text-center ${index === 0 ? 'text-blue-500' : 'text-gray-700'}`}>
                                {index + 1}
                                </div>
                                <img src={recorde.escudo} alt={recorde.time} className="w-10 h-10 object-contain mx-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-200 text-xs truncate">{recorde.time}</div>
                                    <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wide truncate">
                                        {recorde.liga} • R{recorde.rodada}
                                    </div>
                                </div>
                                <div className="text-right pl-3">
                                    <div className="font-mono font-black text-green-500 text-sm">{Number(recorde.pontos).toFixed(1)}</div>
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </div>
            </Link>

             <div className="bg-blue-900/5 border border-blue-900/20 p-6 rounded-2xl flex gap-4 items-start opacity-60 hover:opacity-100 transition-opacity cursor-help">
                <span className="text-xl">💡</span>
                <div>
                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-1">Info</h4>
                    <p className="text-blue-200/50 text-[10px] leading-relaxed font-medium">
                      Recordes são atualizados automaticamente ao fim de cada rodada oficial.
                    </p>
                </div>
             </div>
          </div>

        </div>
    </div>
  )
}