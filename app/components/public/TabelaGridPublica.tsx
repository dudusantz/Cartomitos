'use client'

import { useState, useEffect } from 'react'
import { buscarTabelaGrid } from '../../actions'
import { ChevronRight } from 'lucide-react'

export default function TabelaGridPublica({ campeonatoId }: { campeonatoId: number }) {
  const [dados, setDados] = useState<{ ranking: any[], rodadas: number[] }>({ ranking: [], rodadas: [] })
  const [loading, setLoading] = useState(true)
  const [visaoTabela, setVisaoTabela] = useState<'geral' | number>('geral')

  useEffect(() => {
      async function load() {
          const res = await buscarTabelaGrid(campeonatoId)
          setDados(res)
          setLoading(false)
      }
      load()
  }, [campeonatoId])

  const formatDecimal = (val: number) => {
      if (val === undefined || val === null) return '-';
      return val % 1 !== 0 ? val.toFixed(1) : val;
  };

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse text-xs uppercase tracking-widest">Carregando ranking...</div>

  const rankingExibido = [...dados.ranking].sort((a, b) => {
      if (visaoTabela === 'geral') return b.pts - a.pts;
      const ptsA = a.historico[visaoTabela] || 0;
      const ptsB = b.historico[visaoTabela] || 0;
      return ptsB - ptsA;
  });

  return (
      <div className="animate-fadeIn max-w-[100vw] overflow-hidden">
          <div className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              
              <div className="bg-[#1a1a1a] px-6 py-4 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                      <h3 className="text-white font-black uppercase tracking-widest text-sm">
                          {visaoTabela === 'geral' ? 'Classificação Geral' : `Classificação Rodada ${visaoTabela}`}
                      </h3>
                  </div>

                  <div className="flex items-center gap-1 bg-black p-1 rounded-full border border-gray-800 overflow-x-auto max-w-full scrollbar-hide">
                      {/* MUDADO PARA YELLOW */}
                      <button 
                          onClick={() => setVisaoTabela('geral')}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition whitespace-nowrap ${visaoTabela === 'geral' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                          Geral
                      </button>
                      
                      {dados.rodadas.length > 0 && <div className="w-px h-3 bg-gray-800 mx-1"></div>}

                      {dados.rodadas.map(r => (
                          <button 
                              key={r}
                              onClick={() => setVisaoTabela(r)}
                              className={`min-w-[28px] h-7 flex items-center justify-center rounded-full text-[10px] font-bold transition ${visaoTabela === r ? 'bg-white text-black' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                          >
                              {r}
                          </button>
                      ))}
                  </div>
              </div>
              
              <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                          <tr>
                              <th className="py-4 pl-6 w-[60px] text-center bg-black sticky left-0 z-20 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">#</th>
                              <th className="py-4 px-4 w-[250px] bg-black sticky left-[60px] z-20 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Clube</th>
                              
                              {visaoTabela === 'geral' ? (
                                  <>
                                    <th className="py-4 px-4 text-center">Rodadas</th>
                                    <th className="py-4 px-4 text-center">Média</th>
                                    <th className="py-4 px-6 text-center w-[120px] text-white">Total</th>
                                  </>
                              ) : (
                                  <th className="py-4 px-6 text-center text-white">Pontuação R{visaoTabela}</th>
                              )}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40">
                          {rankingExibido.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="py-12 text-center text-gray-600 italic">
                                      Nenhum dado registrado.
                                  </td>
                              </tr>
                          ) : (
                              rankingExibido.map((t, i) => {
                                  const time = t.times;
                                  const media = t.pj > 0 ? (t.pts / t.pj) : 0;
                                  const valor = visaoTabela === 'geral' ? t.pts : (t.historico[visaoTabela] || 0);
                                  
                                  return (
                                      <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors h-14">
                                          <td className="py-2 pl-6 text-center font-bold text-gray-500 relative bg-[#121212] sticky left-0 z-10 group-hover:bg-[#1a1a1a]">
                                              {i === 0 && <div className="absolute left-0 top-3 bottom-3 w-1 bg-yellow-500 rounded-r"></div>}
                                              {i + 1}º
                                          </td>

                                          <td className="py-2 px-4 bg-[#121212] sticky left-[60px] z-10 group-hover:bg-[#1a1a1a] border-r border-gray-800/50 shadow-[2px_0_10px_rgba(0,0,0,0.3)]">
                                              <div className="flex items-center gap-3">
                                                  <img src={time?.escudo} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                                                  <div className="truncate max-w-[200px]">
                                                      <span className="font-bold text-gray-300 group-hover:text-white transition block text-sm">{time?.nome}</span>
                                                      <span className="text-[9px] text-gray-600 font-bold uppercase">{time?.nome_cartola}</span>
                                                  </div>
                                              </div>
                                          </td>

                                          {visaoTabela === 'geral' ? (
                                              <>
                                                  <td className="py-2 px-4 text-center text-gray-600 font-mono text-xs">{t.pj}</td>
                                                  <td className="py-2 px-4 text-center text-gray-500 font-mono text-xs">{formatDecimal(media)}</td>
                                                  <td className="py-2 px-6 text-center">
                                                      {/* MUDADO PARA YELLOW */}
                                                      <span className="text-yellow-400 font-black text-sm bg-yellow-500/5 px-3 py-1.5 rounded-lg border border-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.1)] block">
                                                          {formatDecimal(valor)}
                                                      </span>
                                                  </td>
                                              </>
                                          ) : (
                                              <td className="py-2 px-6 text-center">
                                                  <span className="text-white font-bold text-sm bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 block">
                                                      {formatDecimal(valor)}
                                                  </span>
                                              </td>
                                          )}
                                      </tr>
                                  )
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  )
}