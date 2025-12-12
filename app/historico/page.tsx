import Link from 'next/link'
import { buscarHistoricoPorAno } from '@/app/actions'

export default async function DetalheHistoricoPage({ params }: { params: { ano: string } }) {
  // Em Next.js 15+, params é uma Promise que precisa ser aguardada
  const p = await params;
  const ano = Number(p.ano);
  
  const dados = await buscarHistoricoPorAno(ano)

  if (!dados) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                <span className="text-4xl block mb-2">📂</span>
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Histórico não encontrado.</p>
                <Link href="/historico" className="text-blue-500 hover:text-blue-400 text-xs font-bold mt-4 block transition">
                    ← Voltar
                </Link>
            </div>
        </div>
      )
  }

  const ranking = dados.ranking_json || []
  const campeao = ranking[0]

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-blue-500/30">
        
        {/* --- HEADER --- */}
        <div className="relative pt-12 pb-24 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed border-b border-gray-800">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-[#050505]"></div>
            
            <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
                
                <Link href="/historico" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition mb-8 border border-gray-800 px-4 py-2 rounded-full hover:bg-white/10 hover:border-white/20">
                    <span>←</span> Voltar ao Arquivo
                </Link>

                <div className="flex flex-col items-center gap-4">
                    <span className="px-4 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        Arquivo Oficial
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter flex items-center gap-4">
                        Ranking {ano}
                    </h1>
                </div>

                {/* Card Destaque do Campeão */}
                {campeao && (
                    <div className="mt-10 inline-flex items-center gap-5 bg-[#121212] border border-yellow-500/30 p-4 pr-8 rounded-2xl shadow-2xl shadow-yellow-900/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 flex items-center justify-center bg-black rounded-xl border border-white/10 relative z-10">
                             <img src={campeao.escudo} alt="Escudo" className="w-12 h-12 object-contain" />
                        </div>
                        <div className="text-left relative z-10">
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider mb-0.5">Grande Campeão</p>
                            <p className="text-xl font-black text-white leading-none">{campeao.time}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- LISTA DE TIMES --- */}
        <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-20 space-y-3">
            {ranking.map((time: any, index: number) => {
                // Estilos de Pódio
                let cardStyle = "bg-[#111] border-gray-800"
                let posStyle = "text-gray-600"
                let ptsStyle = "text-white"
                let medalha = null
                
                if (index === 0) { // 1º
                    cardStyle = "bg-gradient-to-r from-yellow-900/30 to-[#0a0a0a] border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] scale-[1.03] z-30"
                    posStyle = "text-yellow-500"
                    ptsStyle = "text-yellow-400"
                    medalha = <span className="absolute -top-4 -left-2 text-5xl drop-shadow-xl">🥇</span>
                } else if (index === 1) { // 2º
                    cardStyle = "bg-gradient-to-r from-gray-800/40 to-[#111] border-gray-500/50 z-20"
                    posStyle = "text-gray-300"
                    ptsStyle = "text-gray-200"
                    medalha = <span className="absolute -top-3 -left-2 text-3xl drop-shadow-lg">🥈</span>
                } else if (index === 2) { // 3º
                    cardStyle = "bg-gradient-to-r from-orange-900/30 to-[#111] border-orange-700/50 z-10"
                    posStyle = "text-orange-400"
                    ptsStyle = "text-orange-200"
                    medalha = <span className="absolute -top-3 -left-2 text-3xl drop-shadow-lg">🥉</span>
                }

                return (
                    <div 
                        key={index} 
                        className={`relative flex items-center p-4 md:p-5 rounded-2xl border transition-all duration-300 hover:border-gray-600 hover:bg-[#151515] group ${cardStyle}`}
                    >
                        {medalha}

                        <div className={`font-black text-3xl w-14 text-center ${posStyle} italic mr-2`}>
                            {index + 1}º
                        </div>

                        <div className="relative">
                            <img 
                                src={time.escudo} 
                                alt={time.time} 
                                className={`object-contain drop-shadow-md transition-all duration-300 ${index < 3 ? 'w-16 h-16' : 'w-12 h-12 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`} 
                            />
                        </div>

                        <div className="flex-1 ml-5 min-w-0">
                            <h2 className={`font-black text-base md:text-lg truncate leading-tight ${index === 0 ? 'text-yellow-100' : 'text-white'}`}>
                                {time.time}
                            </h2>
                            <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-widest truncate mt-0.5">
                                {time.cartoleiro}
                            </p>
                        </div>

                        <div className="text-right pl-4">
                            <div className={`font-black text-xl md:text-3xl tracking-tighter ${ptsStyle}`}>
                                {Number(time.pontos).toFixed(2)}
                            </div>
                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">
                                Pontos
                            </div>
                        </div>
                    </div>
                )
            })}
            
            <div className="pt-12 pb-10 text-center">
                <p className="text-gray-700 text-[10px] uppercase font-bold tracking-widest">
                    Registro Permanente • Salvo em {new Date(dados.data_salvamento).toLocaleDateString('pt-BR')}
                </p>
            </div>
        </div>
    </div>
  )
}