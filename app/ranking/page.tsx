import Link from 'next/link'
import { buscarRankingCompleto } from '../actions'

export const revalidate = 60

export default async function RankingGeral() {
  const ranking = await buscarRankingCompleto()

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-cartola-gold selection:text-black">
      
      {/* --- HEADER ESTILIZADO --- */}
      <div className="relative pt-12 pb-16 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-[#050505]"></div>
        
        <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition mb-6 border border-gray-800 px-4 py-2 rounded-full hover:bg-white/10 hover:border-white/20">
            <span>←</span> Voltar ao Início
          </Link>
          
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2 flex items-center justify-center gap-4">
            <span className="text-6xl">🏆</span> Ranking Geral
          </h1>
          <p className="text-gray-400 text-lg font-medium">Classificação oficial acumulada da temporada</p>
        </div>
      </div>

      {/* --- LISTA DE TIMES (LEADERBOARD) --- */}
      <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-20 space-y-3">
        
        {ranking.map((time: any, index: number) => {
          // Lógica de Estilo para o TOP 3
          let cardStyle = "bg-[#111] border-gray-800"
          let posStyle = "text-gray-600"
          let ptsStyle = "text-white"
          let medalha = null
          
          if (index === 0) { // 1º LUGAR (OURO)
            cardStyle = "bg-gradient-to-r from-yellow-900/40 to-[#111] border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] scale-[1.02] z-30"
            posStyle = "text-yellow-500"
            ptsStyle = "text-yellow-400"
            medalha = <span className="absolute -top-3 -left-3 text-4xl drop-shadow-lg">🥇</span>
          } else if (index === 1) { // 2º LUGAR (PRATA)
            cardStyle = "bg-gradient-to-r from-gray-800/40 to-[#111] border-gray-500/50"
            posStyle = "text-gray-300"
            ptsStyle = "text-gray-200"
            medalha = <span className="absolute -top-3 -left-3 text-3xl drop-shadow-lg">🥈</span>
          } else if (index === 2) { // 3º LUGAR (BRONZE)
            cardStyle = "bg-gradient-to-r from-orange-900/30 to-[#111] border-orange-700/50"
            posStyle = "text-orange-400"
            ptsStyle = "text-orange-200"
            medalha = <span className="absolute -top-3 -left-3 text-3xl drop-shadow-lg">🥉</span>
          }

          return (
            <div 
              key={index} 
              className={`relative flex items-center p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:border-gray-600 group ${cardStyle}`}
            >
              {medalha}

              {/* Posição */}
              <div className={`font-black text-3xl w-16 text-center ${posStyle} italic`}>
                {index + 1}º
              </div>

              {/* Escudo */}
              <div className="relative">
                <img 
                  src={time.escudo} 
                  alt={time.time} 
                  className={`object-contain drop-shadow-lg ${index < 3 ? 'w-14 h-14' : 'w-12 h-12 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition'}`} 
                />
              </div>

              {/* Informações */}
              <div className="flex-1 ml-4 min-w-0">
                <h2 className={`font-bold text-lg truncate leading-tight ${index === 0 ? 'text-yellow-100' : 'text-white'}`}>
                  {time.time}
                </h2>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider truncate">
                  {time.cartoleiro}
                </p>
              </div>

              {/* Pontuação */}
              <div className="text-right pl-4">
                <div className={`font-black text-2xl tracking-tight ${ptsStyle}`}>
                  {time.pontos.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">
                  Pontos
                </div>
              </div>

            </div>
          )
        })}

        <div className="pt-10 pb-20 text-center text-gray-600 text-sm">
          <p>Atualizado automaticamente via API Cartola FC</p>
        </div>

      </div>
    </div>
  )
}