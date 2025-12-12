import Link from 'next/link'
import { buscarMaioresPontuadores, buscarLigaOficial } from '@/app/actions'

// Atualiza a cada 60 segundos
export const revalidate = 60

export default async function Home() {
  const recordes = await buscarMaioresPontuadores() || []
  const tabelaOficial = await buscarLigaOficial() || []

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
        

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
                        <th className="p-5 w-[15%] text-center">Posição</th>
                        <th className="p-5 w-[55%]">Clube</th>
                        <th className="p-5 text-right">Pontuação</th>
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
                                    <div className="flex flex-col items-center justify-center">
                                        <span className={`font-black text-2xl leading-none ${isLeader ? 'text-yellow-500 drop-shadow-md scale-110' : time.pos <= 3 ? 'text-white' : 'text-gray-600'}`}>
                                            {time.pos}º
                                        </span>
                                    </div>
                                  </td>
                                  
                                  <td className="p-5">
                                    <div className="flex items-center gap-5">
                                        <div className={`relative transition-all duration-500 ${isLeader ? 'scale-110 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                            <img src={time.escudo} alt={time.time} className="w-12 h-12 object-contain" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-0.5">
                                            <div className={`font-bold text-sm ${isLeader ? 'text-white' : 'text-gray-300'}`}>{time.time}</div>
                                            <div className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${isLeader ? 'text-yellow-500/70' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                                {time.cartoleiro}
                                            </div>
                                        </div>
                                    </div>
                                  </td>
                                  
                                  <td className="p-5 text-right">
                                     <div className="flex flex-col items-end">
                                         <span className={`font-mono font-black text-lg ${isLeader ? 'text-yellow-400 drop-shadow-sm' : 'text-white'}`}>
                                            {Number(time.pontos).toFixed(2)}
                                         </span>
                                         <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Pts</span>
                                     </div>
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

          {/* === DIREITA: RECORDES (AGORA O CARD TODO É CLICÁVEL) === */}
          <div className="space-y-8" id="recordes">
            <Link href="/recordes" className="block group">
                <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-blue-900/10">
                
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                        <h3 className="font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest text-xs group-hover:text-blue-300 transition-colors">
                            ⚡ Recordes
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </h3>
                        <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest border border-blue-500/20 px-2 py-1 rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                            Ver Todos
                        </span>
                    </div>
                    
                    {/* Lista */}
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