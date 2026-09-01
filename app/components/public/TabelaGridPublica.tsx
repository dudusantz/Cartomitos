'use client'

import { useState, useEffect } from 'react'
import { buscarTabelaGrid, buscarParciaisGrid } from '@/app/actions'
import { Trophy, RefreshCw, Zap, X } from 'lucide-react'
import toast from 'react-hot-toast'
import TeamLink from './TeamLink'

interface Props {
  campeonatoId: number
}

export default function TabelaGridPublica({ campeonatoId }: Props) {
  const [dados, setDados] = useState<{ ranking: any[], rodadas: number[] }>({ ranking: [], rodadas: [] })
  const [loading, setLoading] = useState(true)
  const [loadingParciais, setLoadingParciais] = useState(false)
  const [visaoTabela, setVisaoTabela] = useState<'geral' | 'aovivo' | number>('geral')
  const [parciaisAoVivo, setParciaisAoVivo] = useState<Record<number, number> | null>(null)

  useEffect(() => { 
      carregarDados() 
  }, [campeonatoId])

  async function carregarDados() {
    setLoading(true)
    const res = await buscarTabelaGrid(campeonatoId)
    setDados(res)
    setLoading(false)
  }

  async function handleBuscarParciais() {
      setLoadingParciais(true);
      const res = await buscarParciaisGrid(campeonatoId);
      setLoadingParciais(false);

      if (res.success && res.parciais) {
          const map: Record<number, number> = {};
          res.parciais.forEach((p: any) => {
              map[p.time_id] = p.parcial;
          });
          setParciaisAoVivo(map);
          setVisaoTabela('aovivo');
          toast.success("Parciais atualizadas!");
      } else {
          toast.error("Erro ao buscar parciais.");
      }
  }

  function limparParciais() {
      setParciaisAoVivo(null);
      setVisaoTabela('geral');
  }

  const formatDecimal = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return '-';
      return num.toFixed(2);
  };

  const rankingExibido = [...dados.ranking].sort((a, b) => {
      if (visaoTabela === 'aovivo') {
          const pA = parciaisAoVivo ? (parciaisAoVivo[a.time_id] || 0) : 0;
          const pB = parciaisAoVivo ? (parciaisAoVivo[b.time_id] || 0) : 0;
          return pB - pA;
      }
      if (visaoTabela === 'geral') return b.pts - a.pts;
      const ptsA = a.historico[visaoTabela] || 0;
      const ptsB = b.historico[visaoTabela] || 0;
      return ptsB - ptsA;
  });

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <RefreshCw className="animate-spin w-6 h-6 text-yellow-500" />
              <span className="text-xs font-bold uppercase tracking-widest">Carregando Ranking...</span>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
          <div className="flex flex-col gap-2 w-full md:w-auto">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500"/> 
                  {visaoTabela === 'geral' ? 'Classificação Geral' : visaoTabela === 'aovivo' ? 'Parciais Ao Vivo' : `Classificação Rodada ${visaoTabela}`}
              </h3>
              
              {/* Botão de Buscar Parciais para Mobile/Desktop */}
              <button 
                  onClick={handleBuscarParciais}
                  disabled={loadingParciais}
                  className="md:hidden w-full text-[10px] font-bold uppercase tracking-wide bg-green-900/20 text-green-400 border border-green-500/20 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-900/40 transition"
              >
                  {loadingParciais ? <RefreshCw className="animate-spin w-3 h-3"/> : <Zap size={12} fill="currentColor"/>}
                  Atualizar Parciais
              </button>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                  <button 
                      onClick={() => setVisaoTabela('geral')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition whitespace-nowrap ${visaoTabela === 'geral' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                      Geral
                  </button>

                  {/* Botão Desktop para Parciais */}
                  <button 
                      onClick={handleBuscarParciais}
                      disabled={loadingParciais}
                      className={`hidden md:flex px-3 py-1.5 rounded text-[10px] font-bold uppercase transition whitespace-nowrap items-center gap-1 ${visaoTabela === 'aovivo' ? 'bg-green-600 text-white' : 'text-green-500 hover:text-white hover:bg-green-900/20'}`}
                  >
                      {loadingParciais ? <RefreshCw className="animate-spin w-3 h-3"/> : <Zap size={10} fill="currentColor"/>}
                      Ao Vivo
                  </button>

                  {/* Se estiver vendo Ao Vivo, mostra opção de fechar */}
                  {visaoTabela === 'aovivo' && !loadingParciais && (
                      <button onClick={limparParciais} className="text-gray-500 hover:text-white px-2">
                          <X size={14} />
                      </button>
                  )}
                  
                  {dados.rodadas.length > 0 && <div className="w-px h-4 bg-gray-800 mx-1"></div>}

                  {dados.rodadas.map(r => (
                      <button 
                          key={r}
                          onClick={() => setVisaoTabela(r)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition ${visaoTabela === r ? 'bg-white text-black' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                      >
                          {r}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                      <tr>
                          <th className="py-4 pl-6 w-[50px] text-center bg-black sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Pos</th>
                          <th className="py-4 px-4 w-[200px] bg-black sticky left-[50px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Time</th>
                          
                          {/* Coluna Ao Vivo Extra */}
                          {parciaisAoVivo && (
                              <th className="py-4 px-4 text-center text-green-500 min-w-[80px] bg-green-900/10 border-b border-green-900/30">
                                  AO VIVO
                              </th>
                          )}

                          {dados.rodadas.map(r => (
                              <th key={r} className="py-4 px-4 text-center text-gray-600 min-w-[60px]">R{r}</th>
                          ))}
                          <th className="py-4 px-6 text-center text-white w-[100px]">Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                      {rankingExibido.length === 0 ? (
                          <tr><td colSpan={dados.rodadas.length + 4} className="py-12 text-center text-gray-600 italic">Nenhum dado registrado.</td></tr>
                      ) : (
                          rankingExibido.map((t, i) => {
                              const time = t.times;
                              
                              // Lógica de exibição da coluna principal (Total/Destaque)
                              let valorMostrado = 0;
                              if (visaoTabela === 'geral') valorMostrado = t.pts;
                              else if (visaoTabela === 'aovivo') valorMostrado = parciaisAoVivo ? (parciaisAoVivo[t.time_id] || 0) : 0;
                              else valorMostrado = t.historico[visaoTabela] || 0;

                              // Correção para total zerado (fallback visual)
                              if (visaoTabela === 'geral' && t.pts === 0) {
                                  const soma = Object.values(t.historico).reduce((acc: any, cur: any) => acc + Number(cur), 0);
                                  if (Number(soma) > 0) valorMostrado = Number(soma);
                              }
                              
                              return (
                                  <tr key={t.id} className="hover:bg-white/[0.02] transition group">
                                      <td className="py-4 pl-6 text-center font-bold text-gray-500 relative bg-[#121212] sticky left-0 z-10 group-hover:bg-[#1a1a1a]">
                                          {i + 1}º
                                      </td>
                                      
                                      <td className="py-4 px-4 bg-[#121212] sticky left-[50px] z-10 group-hover:bg-[#1a1a1a] border-r border-gray-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                                          <TeamLink team={time} className="flex items-center gap-3">
                                              <img src={time?.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain" />
                                              <div className="truncate max-w-[140px]">
                                                  <div className="font-bold text-gray-200 text-sm">{time?.nome}</div>
                                                  <div className="text-[10px] text-gray-600 uppercase font-bold tracking-wide">{time?.nome_cartola}</div>
                                              </div>
                                          </TeamLink>
                                      </td>

                                      {/* Coluna Ao Vivo Valor */}
                                      {parciaisAoVivo && (
                                          <td className="py-3 px-4 text-center font-mono font-bold text-green-400 bg-green-900/5">
                                              {formatDecimal(parciaisAoVivo[t.time_id] || 0)}
                                          </td>
                                      )}

                                      {dados.rodadas.map(r => (
                                          <td key={r} className="py-4 px-4 text-center font-mono text-gray-400">
                                              {formatDecimal(t.historico[r])}
                                          </td>
                                      ))}

                                      <td className="py-4 px-6 text-center">
                                          <span className={`font-black text-base px-3 py-1.5 rounded-lg border ${visaoTabela === 'geral' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : visaoTabela === 'aovivo' ? 'text-green-400 bg-green-900/20 border-green-500/30' : 'text-white bg-white/10 border-white/10'}`}>
                                              {formatDecimal(valorMostrado)}
                                          </span>
                                      </td>
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
