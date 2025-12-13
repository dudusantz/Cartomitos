import { buscarTodosRecordes } from '@/app/actions'
import Link from 'next/link'
import { cookies } from 'next/headers'
import BotaoSalvarRanking from '@/app/components/BotaoSalvarRanking'
import { Trophy, History, Crown } from 'lucide-react'

// CORREÇÃO CRÍTICA: Força a renderização dinâmica.
// Isso garante que o servidor leia os cookies (login de admin) em tempo real.
// Se deixar 'revalidate', ele cacheia a página como "deslogado" e o botão nunca aparece.
export const dynamic = 'force-dynamic'

export default async function RecordesPage() {
  const recordes = await buscarTodosRecordes()
  
  // 1. Verifica cookie de admin em tempo real
  const cookieStore = await cookies()
  const isAdmin = cookieStore.has('admin_session')

  // Separa o Top 3 do resto
  const [primeiro, segundo, terceiro, ...resto] = recordes || []

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-yellow-500/30">
      
      {/* --- HEADER --- */}
      <div className="relative pt-12 pb-32 bg-[#080808] border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/10 via-[#050505] to-[#050505]"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-20"> 
            
            {/* Navegação Superior */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                <Link 
                    href="/" 
                    className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest self-start md:self-auto"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar
                </Link>
                
                <div className="flex flex-wrap items-center gap-3 justify-center">
                    <Link 
                        href="/historico?tipo=recordes" 
                        className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 backdrop-blur-sm"
                    >
                        <History size={14} /> Arquivo Histórico
                    </Link>

                    {/* Botão Salvar (APENAS PARA ADMIN LOGADO e SE TIVER RECORDES) */}
                    {isAdmin && recordes && recordes.length > 0 && (
                        <BotaoSalvarRanking 
                            dados={recordes} 
                            anoAtual={new Date().getFullYear()} 
                            tipo="recordes" 
                            tituloPadrao={`Recordes ${new Date().getFullYear()}`}
                        />
                    )}
                </div>
            </div>

            {/* Título Principal */}
            <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-4 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full">
                    <Trophy size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Maiores Pontuadores da Temporada</span>
                </div>
                <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4">
                    Hall da Fama
                </h1>
                <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                    Os recordes são atualizados em tempo real conforme os jogos das ligas de <strong>Pontos Corridos</strong> ativas são finalizados.
                </p>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-12">
        
        {(!recordes || recordes.length === 0) ? (
            <div className="text-center py-32 bg-[#121212] rounded-3xl border border-dashed border-white/10">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="text-gray-600 opacity-50" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ainda sem recordes</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Para aparecer aqui, o campeonato deve ser de <strong>Pontos Corridos</strong> e estar <strong>Ativo</strong>. Ligas finalizadas ou Mata-Mata/Copa não contam para o recorde.
                </p>
            </div>
        ) : (
            <>
            {/* === PÓDIO (TOP 3) === */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-12 px-4">
                
                {/* 2º LUGAR */}
                {segundo && (
                    <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3 group">
                        <div className="mb-4 relative">
                            <div className="absolute inset-0 bg-gray-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <img src={segundo.escudo} alt={segundo.time} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-2xl transform group-hover:-translate-y-2 transition-transform duration-500" />
                            <div className="absolute -bottom-3 -right-2 bg-gray-400 text-black font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#050505] shadow-lg">2º</div>
                        </div>
                        <div className="bg-[#121212] border-t-2 border-gray-600 w-full rounded-2xl p-6 text-center h-44 flex flex-col justify-center relative overflow-hidden shadow-2xl group-hover:bg-[#1a1a1a] transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-600/5 to-transparent"></div>
                            <h3 className="text-white font-bold truncate text-lg relative z-10 mb-1">{segundo.time}</h3>
                            <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
                                <span className="text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{segundo.liga}</span>
                            </div>
                            <span className="text-4xl font-black text-gray-300 relative z-10 tracking-tighter">{Number(segundo.pontos).toFixed(2)}</span>
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">Pontos</span>
                        </div>
                    </div>
                )}

                {/* 1º LUGAR */}
                {primeiro && (
                    <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 z-10 group scale-105 md:scale-110">
                        <div className="mb-6 relative">
                            <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-700 animate-pulse-slow"></div>
                            <Crown className="w-8 h-8 text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" fill="currentColor" />
                            <img src={primeiro.escudo} alt={primeiro.time} className="w-28 h-28 md:w-36 md:h-36 object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute -bottom-4 -right-2 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-black text-sm w-12 h-12 flex items-center justify-center rounded-full border-4 border-[#050505] shadow-xl">1º</div>
                        </div>
                        <div className="bg-[#121212] border-t-4 border-yellow-500 w-full rounded-2xl p-8 text-center h-56 flex flex-col justify-center shadow-[0_20px_50px_-10px_rgba(234,179,8,0.15)] relative overflow-hidden group-hover:bg-[#151515] transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"></div>
                            <h3 className="text-white font-black truncate text-2xl md:text-3xl mb-1 relative z-10">{primeiro.time}</h3>
                            <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-yellow-500/20">{primeiro.liga}</span>
                            </div>
                            <span className="text-6xl font-black text-white relative z-10 tracking-tighter drop-shadow-lg">{Number(primeiro.pontos).toFixed(2)}</span>
                            <span className="text-[10px] text-yellow-500/50 font-bold uppercase tracking-[0.3em] mt-2">Recorde Absoluto</span>
                        </div>
                    </div>
                )}

                {/* 3º LUGAR */}
                {terceiro && (
                    <div className="order-3 md:order-3 flex flex-col items-center w-full md:w-1/3 group">
                        <div className="mb-4 relative">
                            <div className="absolute inset-0 bg-orange-700/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <img src={terceiro.escudo} alt={terceiro.time} className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 drop-shadow-lg transform group-hover:-translate-y-2 transition-transform duration-500" />
                            <div className="absolute -bottom-3 -right-2 bg-orange-700 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-[#050505] shadow-lg">3º</div>
                        </div>
                        <div className="bg-[#121212] border-t-2 border-orange-800 w-full rounded-2xl p-6 text-center h-44 flex flex-col justify-center relative overflow-hidden shadow-2xl group-hover:bg-[#1a1a1a] transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-800/10 to-transparent"></div>
                            <h3 className="text-white font-bold truncate text-lg relative z-10 mb-1">{terceiro.time}</h3>
                            <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
                                <span className="text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{terceiro.liga}</span>
                            </div>
                            <span className="text-4xl font-black text-orange-200/80 relative z-10 tracking-tighter">{Number(terceiro.pontos).toFixed(2)}</span>
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">Pontos</span>
                        </div>
                    </div>
                )}
            </div>

            {/* === LISTA DO RESTANTE === */}
            {resto.length > 0 && (
                <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-5 bg-[#151515] border-b border-white/5 flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Outros Destaques</span>
                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Top 50</span>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {resto.map((rec: any, idx: number) => (
                            <div key={idx} className="flex items-center p-4 hover:bg-white/[0.02] transition-colors group">
                                <div className="w-12 font-bold text-gray-600 text-center text-sm">{idx + 4}º</div>
                                
                                <img src={rec.escudo} alt={rec.time} className="w-10 h-10 object-contain mx-4 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100" />
                                
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors truncate">{rec.time}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] uppercase font-bold bg-white/5 text-gray-500 px-1.5 py-0.5 rounded truncate max-w-[120px]">{rec.liga}</span>
                                        <span className="text-[9px] uppercase font-bold text-gray-600">R{rec.rodada}</span>
                                    </div>
                                </div>

                                <div className="text-right pr-2">
                                    <span className="text-lg font-black text-white">{Number(rec.pontos).toFixed(2)}</span>
                                    <span className="text-[8px] block text-gray-600 font-bold uppercase">Pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>
        )}
      </div>
    </div>
  )
}