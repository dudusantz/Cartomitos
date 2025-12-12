import Link from 'next/link'
import { buscarRankingCompleto } from '@/app/actions' // Caminho absoluto para evitar erros
import { supabase } from '@/lib/supabase' // Importação correta para checar admin
import BotaoSalvarRanking from '../components/BotaoSalvarRanking'

export const revalidate = 60

export default async function RankingGeral() {
  const ranking = await buscarRankingCompleto()
  
  // Verifica se é admin usando o Supabase (mais seguro e consistente com o resto do app)
  const { data: { session } } = await supabase.auth.getSession()
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-cartola-gold selection:text-black">
      
      {/* --- HEADER --- */}
      <div className="relative pt-8 pb-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-[#050505]"></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          
          {/* Barra de Navegação */}
          <div className="flex justify-between items-center mb-10">
              <Link href="/" className="text-gray-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2">
                <span>←</span> Início
              </Link>

              <Link href="/historico" className="bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-blue-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 shadow-lg">
                <span>📜</span> Arquivo de Rankings
              </Link>
          </div>
          
          {/* Título Principal */}
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
              <span className="text-yellow-500 text-6xl md:text-7xl drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🏆</span> 
              Ranking Geral
            </h1>
            <p className="text-gray-500 text-sm md:text-base font-bold uppercase tracking-widest mt-2">
                Classificação Oficial da Temporada
            </p>
          </div>

          {/* Botão de Salvar (Apenas Admin) */}
          {isAdmin && ranking && ranking.length > 0 && (
             <div className="flex justify-center mt-8">
                <BotaoSalvarRanking 
                    ranking={ranking}
                    // ADICIONADO: Props obrigatórios para o salvamento funcionar
                    tipo="ranking"
                    tituloPadrao={`Ranking Geral ${new Date().getFullYear()}`}
                />
             </div>
          )}
        </div>
      </div>

      {/* --- LISTA DE TIMES (PÓDIO PRESERVADO) --- */}
      <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-20 space-y-3">
        
        {ranking.map((time: any, index: number) => {
          let cardStyle = "bg-[#111] border-gray-800"
          let posStyle = "text-gray-600"
          let ptsStyle = "text-white"
          let medalha = null
          
          if (index === 0) { // 1º LUGAR (OURO)
            cardStyle = "bg-gradient-to-r from-yellow-900/30 to-[#0a0a0a] border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] scale-[1.03] z-30"
            posStyle = "text-yellow-500"
            ptsStyle = "text-yellow-400"
            medalha = <span className="absolute -top-4 -left-2 text-5xl drop-shadow-xl filter grayscale-0">🥇</span>
          } else if (index === 1) { // 2º LUGAR (PRATA)
            cardStyle = "bg-gradient-to-r from-gray-800/40 to-[#111] border-gray-500/50 z-20"
            posStyle = "text-gray-300"
            ptsStyle = "text-gray-200"
            medalha = <span className="absolute -top-3 -left-2 text-3xl drop-shadow-lg">🥈</span>
          } else if (index === 2) { // 3º LUGAR (BRONZE)
            cardStyle = "bg-gradient-to-r from-orange-900/30 to-[#111] border-orange-700/50 z-10"
            posStyle = "text-orange-400"
            ptsStyle = "text-orange-200"
            medalha = <span className="absolute -top-3 -left-2 text-3xl drop-shadow-lg">🥉</span>
          }

          return (
            <div 
              key={index} 
              className={`relative flex items-center p-4 md:p-5 rounded-2xl border transition-all duration-300 hover:border-gray-600 group ${cardStyle}`}
            >
              {medalha}

              {/* Posição */}
              <div className={`font-black text-3xl w-14 text-center ${posStyle} italic mr-2`}>
                {index + 1}º
              </div>

              {/* Escudo */}
              <div className="relative">
                <img 
                  src={time.escudo} 
                  alt={time.time} 
                  className={`object-contain drop-shadow-md transition-all duration-300 ${index < 3 ? 'w-16 h-16' : 'w-12 h-12 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`} 
                />
              </div>

              {/* Informações */}
              <div className="flex-1 ml-5 min-w-0">
                <h2 className={`font-black text-base md:text-lg truncate leading-tight ${index === 0 ? 'text-yellow-100' : 'text-white'}`}>
                  {time.time}
                </h2>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-widest truncate mt-0.5">
                  {time.cartoleiro}
                </p>
              </div>

              {/* Pontuação */}
              <div className="text-right pl-4">
                <div className={`font-black text-xl md:text-3xl tracking-tighter ${ptsStyle}`}>
                  {time.pontos.toFixed(2)}
                </div>
                <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">
                  Pontos
                </div>
              </div>

            </div>
          )
        })}

        <div className="pt-12 pb-20 text-center">
          <p className="text-gray-700 text-[10px] uppercase font-bold tracking-widest">
            Atualizado automaticamente via API Cartola FC
          </p>
        </div>

      </div>
    </div>
  )
}