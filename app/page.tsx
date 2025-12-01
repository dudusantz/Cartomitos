import Link from 'next/link'
import Image from 'next/image' // Importante para o Logo
import { listarCampeonatos, buscarMaioresPontuadores, buscarLigaOficial } from './actions'

export default async function Home() {
  const ligas = await listarCampeonatos()
  const recordes = await buscarMaioresPontuadores()
  const tabelaOficial = await buscarLigaOficial()

  return (
    <div className="min-h-screen font-sans">
      
      {/* --- NAVBAR (Cabeçalho) --- */}
      <nav className="border-b border-gray-800 bg-cartola-card/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
          
          {/* LOGO DO GRUPO */}
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Logo CartoMitos" 
              width={200} 
              height={200}
              className="w-auto h-20 md:h-24 drop-shadow-[0_0_10px_rgba(255,193,7,0.3)]"
            />
          </div>

          {/* MENU (Links Dourados) */}
          <div className="hidden md:flex gap-8 text-sm font-bold text-gray-300">
            <Link href="/" className="hover:text-cartola-gold transition tracking-widest">INÍCIO</Link>
            <Link href="#campeonatos" className="hover:text-cartola-gold transition tracking-widest">CAMPEONATOS</Link>
            <Link href="#recordes" className="hover:text-cartola-gold transition tracking-widest">RECORDES</Link>
          </div>

          {/* BOTÃO ADMIN (Dourado e Preto) */}
          <Link 
            href="/admin" 
            className="bg-cartola-gold hover:bg-yellow-400 text-cartola-dark px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-yellow-500/20 transition-transform transform hover:scale-105"
          >
            Área Admin
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* === COLUNA DA ESQUERDA === */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabela Oficial */}
           <section className="bg-cartola-card rounded-xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-gradient-to-r from-cartola-blue to-cartola-card p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  🎩 Ranking de pontos
                </h2>
                <span className="text-[10px] font-bold bg-cartola-gold text-cartola-dark px-2 py-1 rounded uppercase">
                  Top 5 Atual
                </span>
              </div>
              
              <table className="w-full text-left">
                <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-4">Pos</th>
                    <th className="p-4">Time</th>
                    <th className="p-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {tabelaOficial.map((time: any) => (
                    <tr key={time.pos} className="hover:bg-gray-800/50 transition">
                      <td className={`p-4 font-bold ${time.pos === 1 ? 'text-cartola-gold text-xl' : 'text-gray-500'}`}>
                        {time.pos}º
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <img src={time.escudo} alt={time.time} className="w-10 h-10 object-contain" />
                        <div>
                          <div className="font-bold text-white">{time.time}</div>
                          <div className="text-xs text-gray-400">{time.cartoleiro}</div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-cartola-gold font-bold text-lg">
                        {time.pontos.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* BOTÃO VER COMPLETO */}
              <div className="p-4 border-t border-gray-700 bg-black/20 text-center">
                <Link 
                  href="/ranking" 
                  className="inline-block text-sm font-bold text-gray-400 hover:text-white hover:underline transition"
                >
                  Ver Ranking Completo →
                </Link>
              </div>
            </section>

             {/* Campeonatos Ativos */}
             <section id="campeonatos">
              <h2 className="text-xl font-bold mb-4 border-l-4 border-cartola-green pl-3 text-white">
                Nossos Campeonatos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ligas.length === 0 && <p className="text-gray-500 col-span-2">Nenhum campeonato criado ainda.</p>}
                
                {ligas.map(liga => (
                  <Link key={liga.id} href={`/campeonato/${liga.id}`} className="group">
                    <div className="bg-cartola-card p-6 rounded-lg border border-gray-700 hover:border-cartola-green transition-all h-full shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-cartola-green/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-cartola-blue text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          {liga.tipo.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500 text-xs font-mono">{liga.ano}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-cartola-green transition-colors">
                        {liga.nome}
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">Clique para ver a tabela e jogos</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

          </div>

          {/* === COLUNA DA DIREITA === */}
          <div className="space-y-8" id="recordes">
            
            {/* Recordes */}
            <div className="bg-cartola-card rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-cartola-gold/20 to-cartola-card p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-cartola-gold flex items-center gap-2 uppercase tracking-wide text-sm">
                  🏆 Recordes da Temporada
                </h3>
              </div>
              
              <div className="divide-y divide-gray-800">
                {recordes.length === 0 && (
                   <div className="p-6 text-center text-gray-500 text-sm">Nenhum jogo finalizado.</div>
                )}

                {recordes.map((recorde, index) => (
                  <div key={index} className="flex items-center p-4 hover:bg-gray-800/50 transition">
                    <div className={`font-black text-2xl w-8 text-center ${index === 0 ? 'text-cartola-gold' : 'text-gray-600'}`}>
                      {index + 1}
                    </div>
                    
                    <img src={recorde.escudo} className="w-10 h-10 mx-3" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{recorde.time}</div>
                      <div className="text-xs text-gray-400">
                        {recorde.liga} • Rodada {recorde.rodada}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-cartola-green text-lg">
                        {recorde.pontos.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">Pontos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso */}
             <div className="bg-cartola-blue/20 border border-cartola-blue p-4 rounded-lg flex gap-3 items-start">
                <span className="text-xl">⚽</span>
                <p className="text-blue-200 text-xs leading-relaxed">
                  <strong>Dica:</strong> Para aparecer nos recordes, a rodada precisa estar finalizada no sistema.
                </p>
             </div>

          </div>

        </div>
      </main>
    </div>
  )
}