import { buscarTodosRecordes } from '@/app/actions'
import Link from 'next/link'

export const revalidate = 60

export default async function RecordesPage() {
  const recordes = await buscarTodosRecordes()
  
  // Separa o Top 3 do resto
  const [primeiro, segundo, terceiro, ...resto] = recordes || []

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
      
      {/* CABEÇALHO COM VOLTAR */}
      <div className="flex items-center justify-between mb-12">
        <Link href="/" className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar
        </Link>
        <div className="text-right">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Hall da Fama</h1>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-[0.3em]">Maiores Pontuações</p>
        </div>
      </div>

      {(!recordes || recordes.length === 0) ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <p className="text-gray-500">Nenhum recorde registrado ainda.</p>
        </div>
      ) : (
        <>
          {/* === PÓDIO (TOP 3) === */}
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 mb-16 px-4">
            
            {/* 2º LUGAR */}
            {segundo && (
                <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3 group">
                    <div className="mb-4 relative">
                         <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <img src={segundo.escudo} alt={segundo.time} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-lg transform group-hover:-translate-y-2 transition-transform" />
                         <div className="absolute -bottom-3 -right-2 bg-gray-300 text-black font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#121212]">2º</div>
                    </div>
                    <div className="bg-[#1a1a1a] border-t-4 border-gray-400 w-full rounded-t-2xl p-6 text-center h-40 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-400/10 to-transparent"></div>
                        <h3 className="text-white font-bold truncate text-lg relative z-10">{segundo.time}</h3>
                        <p className="text-gray-500 text-xs uppercase font-bold mb-2 relative z-10">Rodada {segundo.rodada}</p>
                        <span className="text-3xl font-black text-gray-300 relative z-10">{Number(segundo.pontos).toFixed(1)}</span>
                    </div>
                </div>
            )}

            {/* 1º LUGAR */}
            {primeiro && (
                <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 z-10 group">
                    <div className="mb-4 relative">
                        <div className="absolute inset-0 bg-yellow-500/40 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                        <svg className="w-12 h-12 text-yellow-500 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <img src={primeiro.escudo} alt={primeiro.time} className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute -bottom-3 -right-2 bg-yellow-500 text-black font-black text-sm w-10 h-10 flex items-center justify-center rounded-full border-4 border-[#121212]">1º</div>
                    </div>
                    <div className="bg-[#1a1a1a] border-t-4 border-yellow-500 w-full rounded-t-2xl p-8 text-center h-52 flex flex-col justify-center shadow-[0_-10px_40px_rgba(234,179,8,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"></div>
                        <h3 className="text-white font-black truncate text-xl md:text-2xl mb-1 relative z-10">{primeiro.time}</h3>
                        <p className="text-yellow-500/80 text-xs uppercase font-bold mb-3 relative z-10 tracking-wider">MVP da Temporada</p>
                        <span className="text-5xl font-black text-white relative z-10 drop-shadow-md">{Number(primeiro.pontos).toFixed(1)}</span>
                        <p className="text-gray-600 text-[10px] uppercase font-bold mt-2 relative z-10">Rodada {primeiro.rodada} • {primeiro.liga}</p>
                    </div>
                </div>
            )}

            {/* 3º LUGAR */}
            {terceiro && (
                <div className="order-3 md:order-3 flex flex-col items-center w-full md:w-1/3 group">
                     <div className="mb-4 relative">
                         <div className="absolute inset-0 bg-orange-700/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <img src={terceiro.escudo} alt={terceiro.time} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-lg transform group-hover:-translate-y-2 transition-transform" />
                         <div className="absolute -bottom-3 -right-2 bg-orange-700 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#121212]">3º</div>
                    </div>
                    <div className="bg-[#1a1a1a] border-t-4 border-orange-800 w-full rounded-t-2xl p-6 text-center h-32 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-orange-800/10 to-transparent"></div>
                        <h3 className="text-white font-bold truncate text-lg relative z-10">{terceiro.time}</h3>
                        <p className="text-gray-500 text-xs uppercase font-bold mb-2 relative z-10">Rodada {terceiro.rodada}</p>
                        <span className="text-3xl font-black text-orange-200/80 relative z-10">{Number(terceiro.pontos).toFixed(1)}</span>
                    </div>
                </div>
            )}
          </div>

          {/* === LISTA DO RESTANTE === */}
          <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-4 bg-[#151515] border-b border-white/5 flex items-center gap-2">
                <span className="text-blue-500 text-xs font-black uppercase tracking-widest">Outros Destaques</span>
            </div>
            <div className="divide-y divide-white/[0.03]">
                {resto.map((rec: any, idx: number) => (
                    <div key={idx} className="flex items-center p-4 hover:bg-white/[0.02] transition-colors group">
                        <div className="w-10 font-bold text-gray-600 text-center">{idx + 4}º</div>
                        
                        <img src={rec.escudo} alt={rec.time} className="w-10 h-10 object-contain mx-4 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100" />
                        
                        <div className="flex-1">
                            <h4 className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">{rec.time}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase font-bold bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">{rec.liga}</span>
                                <span className="text-[10px] uppercase font-bold text-gray-600">Rodada {rec.rodada}</span>
                            </div>
                        </div>

                        <div className="text-right pr-2">
                            <span className="text-xl font-black text-white">{Number(rec.pontos).toFixed(1)}</span>
                            <span className="text-[9px] block text-gray-600 font-bold uppercase">Pts</span>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}