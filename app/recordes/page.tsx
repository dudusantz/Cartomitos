import { buscarTodosRecordes } from '@/app/actions'
import Link from 'next/link'
import { cookies } from 'next/headers' // <--- IMPORTANTE: Usar cookies para verificar admin
import BotaoSalvarRanking from '../components/BotaoSalvarRanking'

export const revalidate = 60

export default async function RecordesPage() {
  const recordes = await buscarTodosRecordes()
  
  // 1. Verifica se o cookie de admin existe (Lógica mais robusta para o seu caso)
  const cookieStore = await cookies()
  const isAdmin = cookieStore.has('admin_session') // Verifica se o cookie 'admin_session' existe

  // Separa o Top 3 do resto
  const [primeiro, segundo, terceiro, ...resto] = recordes || []

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-blue-500/30">
      
      {/* --- HEADER --- */}
      <div className="relative pt-8 pb-12 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-[#050505]"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-20"> 
            
            {/* Barra de Navegação */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                
                {/* Botão Voltar */}
                <Link 
                    href="/" 
                    className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest self-start md:self-auto cursor-pointer"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar
                </Link>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Botão Ver Histórico */}
                    <Link 
                        href="/historico?tipo=recordes" 
                        className="order-3 md:order-1 bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-blue-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                        <span>📜</span> Arquivo de Recordes
                    </Link>

                    {/* Botão Salvar (APENAS SE O COOKIE DE ADMIN EXISTIR) */}
                    {isAdmin && recordes && recordes.length > 0 && (
                        <div className="order-2 md:order-3">
                            <BotaoSalvarRanking 
                                ranking={recordes} 
                                tipo="recordes" 
                                tituloPadrao={`Recordes ${new Date().getFullYear()}`}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Título Principal */}
            <div className="text-center md:text-right">
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2">Hall da Fama</h1>
                <p className="text-xs md:text-sm text-blue-400 font-bold uppercase tracking-[0.3em]">Maiores Pontuações</p>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-8">
        {(!recordes || recordes.length === 0) ? (
            <div className="text-center py-20 bg-[#121212] rounded-3xl border border-dashed border-white/10">
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
                        <div className="bg-[#1a1a1a] border-t-4 border-gray-400 w-full rounded-t-2xl p-6 text-center h-40 flex flex-col justify-center relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-400/10 to-transparent"></div>
                            <h3 className="text-white font-bold truncate text-lg relative z-10">{segundo.time}</h3>
                            <p className="text-gray-500 text-xs uppercase font-bold mb-2 relative z-10">Rodada {segundo.rodada}</p>
                            <span className="text-3xl font-black text-gray-300 relative z-10">{Number(segundo.pontos).toFixed(2)}</span>
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
                            <span className="text-5xl font-black text-white relative z-10 drop-shadow-md">{Number(primeiro.pontos).toFixed(2)}</span>
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
                        <div className="bg-[#1a1a1a] border-t-4 border-orange-800 w-full rounded-t-2xl p-4 text-center h-32 flex flex-col justify-center relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-800/10 to-transparent"></div>
                            <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2 relative z-10 mb-1">
                                {terceiro.time}
                            </h3>
                            <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 relative z-10">Rodada {terceiro.rodada}</p>
                            <span className="text-2xl font-black text-orange-200/80 relative z-10">{Number(terceiro.pontos).toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* === LISTA DO RESTANTE === */}
            <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
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
                                <span className="text-xl font-black text-white">{Number(rec.pontos).toFixed(2)}</span>
                                <span className="text-[9px] block text-gray-600 font-bold uppercase">Pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            </>
        )}
      </div>
    </div>
  )
}