import Link from 'next/link'
import { buscarHistoricoPorAno } from '@/app/actions'

export default async function DetalheHistoricoPage({ params }: { params: { ano: string } }) {
  const p = await params;
  const ano = Number(p.ano);
  
  const dados = await buscarHistoricoPorAno(ano)

  if (!dados) {
      return <div className="p-20 text-gray-500 text-center uppercase font-bold text-xs tracking-widest">Histórico não encontrado.</div>
  }

  const ranking = dados.ranking_json || []
  const campeao = ranking[0]

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 animate-fadeIn">
        <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6 border-b border-white/10 pb-8">
                <div className="flex items-center gap-4">
                    <Link href="/historico" className="bg-gray-800 hover:bg-gray-700 p-2.5 rounded-xl text-gray-400 hover:text-white transition">
                        ←
                    </Link>
                    <div>
                        <span className="text-blue-500 font-bold text-xs uppercase tracking-widest block mb-1">Arquivo Oficial</span>
                        {/* MUDANÇA AQUI: Ranking em vez de Temporada */}
                        <h1 className="text-4xl font-black uppercase tracking-tighter">Ranking {ano}</h1>
                    </div>
                </div>

                {/* Card do Campeão */}
                {campeao && (
                    <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-600/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4 min-w-[250px]">
                        <div className="text-3xl drop-shadow-md">🏆</div>
                        <div>
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Grande Campeão</p>
                            <p className="text-lg font-black text-white leading-none">{campeao.time}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabela */}
            <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-[#0a0a0a] text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-white/5">
                        <tr>
                            <th className="p-4 text-center w-16">#</th>
                            <th className="p-4">Time</th>
                            <th className="p-4 hidden sm:table-cell">Cartoleiro</th>
                            <th className="p-4 text-right">Pontos Finais</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {ranking.map((time: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                <td className={`p-4 text-center font-bold ${idx === 0 ? 'text-yellow-500 text-lg' : 'text-gray-600 group-hover:text-white'}`}>
                                    {idx + 1}º
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <img src={time.escudo} className={`w-8 h-8 object-contain ${idx > 0 ? 'opacity-70 grayscale group-hover:grayscale-0 group-hover:opacity-100' : ''} transition-all`} />
                                        <span className={`font-bold ${idx === 0 ? 'text-yellow-500' : 'text-gray-300 group-hover:text-white'}`}>
                                            {time.time}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 text-xs uppercase font-bold tracking-wider hidden sm:table-cell">
                                    {time.cartoleiro}
                                </td>
                                <td className="p-4 text-right font-mono font-black text-white bg-white/[0.02]">
                                    {Number(time.pontos).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    </div>
  )
}