import { buscarGaleriaDeTrofeus } from '@/app/actions'
import Link from 'next/link'

export const revalidate = 60

export default async function CampeoesPage() {
  const campeoes = await buscarGaleriaDeTrofeus()
  
  // Destaca o Top 3
  const [primeiro, segundo, terceiro, ...resto] = campeoes || []

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
        <Link href="/" className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar
        </Link>
        <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3 justify-end">
                Sala de Troféus <span className="text-yellow-500 text-4xl">🏆</span>
            </h1>
            <p className="text-xs text-yellow-600 font-bold uppercase tracking-[0.3em] mt-1">Os Reis da Temporada</p>
        </div>
      </div>

      {(!campeoes || campeoes.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-400">Galeria Vazia</h2>
          <p className="text-gray-600 text-sm mt-2">Finalize os campeonatos para ver os vencedores aqui.</p>
        </div>
      ) : (
        <>
            {/* === PÓDIO DOS CAMPEÕES === */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 mb-16 px-4">
                
                {/* 2º Lugar */}
                {segundo && (
                    <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3 group">
                        <div className="mb-4 relative">
                            <img src={segundo.escudo} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-lg group-hover:-translate-y-2 transition-transform" />
                            <div className="absolute -bottom-3 -right-2 bg-gray-400 text-black font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#121212]">2º</div>
                        </div>
                        <div className="bg-[#1a1a1a] border-t-4 border-gray-400 w-full rounded-t-2xl p-6 text-center h-48 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-400/10 to-transparent"></div>
                            <h3 className="text-white font-bold truncate text-lg relative z-10">{segundo.nome}</h3>
                            <span className="text-4xl font-black text-gray-300 relative z-10 mt-2">{segundo.titulos.length}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest relative z-10">Títulos</span>
                        </div>
                    </div>
                )}

                {/* 1º Lugar */}
                {primeiro && (
                    <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 z-10 group">
                        <div className="mb-4 relative">
                            <div className="absolute inset-0 bg-yellow-500/40 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                            <img src={primeiro.escudo} className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-2xl group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute -bottom-3 -right-2 bg-yellow-500 text-black font-black text-sm w-10 h-10 flex items-center justify-center rounded-full border-4 border-[#121212]">1º</div>
                        </div>
                        <div className="bg-[#1a1a1a] border-t-4 border-yellow-500 w-full rounded-t-2xl p-8 text-center h-64 flex flex-col justify-center shadow-[0_-10px_40px_rgba(234,179,8,0.1)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"></div>
                            <h3 className="text-white font-black truncate text-xl md:text-2xl mb-1 relative z-10">{primeiro.nome}</h3>
                            <p className="text-yellow-500/80 text-xs uppercase font-bold mb-4 relative z-10 tracking-wider">O Maior Campeão</p>
                            <span className="text-6xl font-black text-white relative z-10 drop-shadow-md">{primeiro.titulos.length}</span>
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest relative z-10 mt-1">Títulos Conquistados</span>
                        </div>
                    </div>
                )}

                {/* 3º Lugar */}
                {terceiro && (
                    <div className="order-3 md:order-3 flex flex-col items-center w-full md:w-1/3 group">
                        <div className="mb-4 relative">
                            <img src={terceiro.escudo} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-lg group-hover:-translate-y-2 transition-transform" />
                            <div className="absolute -bottom-3 -right-2 bg-orange-700 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#121212]">3º</div>
                        </div>
                        <div className="bg-[#1a1a1a] border-t-4 border-orange-800 w-full rounded-t-2xl p-6 text-center h-40 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-800/10 to-transparent"></div>
                            <h3 className="text-white font-bold truncate text-lg relative z-10">{terceiro.nome}</h3>
                            <span className="text-3xl font-black text-orange-200/80 relative z-10 mt-2">{terceiro.titulos.length}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest relative z-10">Títulos</span>
                        </div>
                    </div>
                )}
            </div>

            {/* === LISTA DETALHADA === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[primeiro, segundo, terceiro, ...resto].filter(Boolean).map((time, idx) => (
                    <div key={idx} className="bg-[#121212] border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:border-yellow-500/30 transition-colors group">
                        <span className="font-black text-2xl text-gray-700 w-8">{idx + 1}º</span>
                        <img src={time.escudo} className="w-16 h-16 object-contain grayscale group-hover:grayscale-0 transition-all" />
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">{time.nome}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {time.titulos.map((t: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded uppercase font-bold">
                                        🏆 {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="block text-3xl font-black text-white">{time.titulos.length}</span>
                             <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Taças</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}
    </div>
  )
}