'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { atualizarRodadaGrid, buscarTabelaGrid, zerarJogos } from '@/app/actions'
import { ModalConfirmacao } from './ModalConfirmacao'
import { Trophy, RefreshCw, Trash2, Calendar, ChevronRight, ChevronLeft, Edit3, Filter } from 'lucide-react'

interface Props {
  campeonatoId: number
}

export default function PainelGrid({ campeonatoId }: Props) {
  const [dados, setDados] = useState<{ ranking: any[], rodadas: number[] }>({ ranking: [], rodadas: [] })
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  
  const [visaoTabela, setVisaoTabela] = useState<'geral' | number>('geral')
  const [proxRodada, setProxRodada] = useState(1)
  const [modoEdicaoManual, setModoEdicaoManual] = useState(false)
  const [rodadaInput, setRodadaInput] = useState('')

  useEffect(() => { 
      carregarDados() 
  }, [campeonatoId])

  async function carregarDados() {
    const res = await buscarTabelaGrid(campeonatoId)
    setDados(res)
    const ultima = res.rodadas.length > 0 ? Math.max(...res.rodadas) : 0
    setProxRodada(ultima + 1)
    setRodadaInput(String(ultima + 1))
  }

  function confirm(titulo: string, msg: string, action: () => void) {
    setModalConfig({ 
        titulo, descricao: msg, onConfirm: async () => { await action(); setModalOpen(false) }, 
        corBotao: 'red', textoBotao: 'Confirmar'
    })
    setModalOpen(true)
  }

  async function handleAtualizar() {
      const r = modoEdicaoManual ? Number(rodadaInput) : proxRodada;
      if(!r || r <= 0) return toast.error("Rodada inválida.");

      setLoading(true);
      const res = await atualizarRodadaGrid(campeonatoId, r);
      if(res.success) {
          toast.success(res.msg);
          await carregarDados();
          setModoEdicaoManual(false);
      } else {
          toast.error(res.msg);
      }
      setLoading(false);
  }

  async function handleReset() {
      confirm("Zerar Ranking", "Tem certeza? Isso apagará todo o histórico.", async () => {
          setLoading(true)
          await zerarJogos(campeonatoId)
          await carregarDados()
          setLoading(false)
          toast.success("Ranking zerado.")
      })
  }

  const formatDecimal = (val: number) => {
      if (val === undefined || val === null) return '-';
      return val % 1 !== 0 ? val.toFixed(1) : val;
  };

  const rankingExibido = [...dados.ranking].sort((a, b) => {
      if (visaoTabela === 'geral') return b.pts - a.pts;
      const ptsA = a.historico[visaoTabela] || 0;
      const ptsB = b.historico[visaoTabela] || 0;
      return ptsB - ptsA;
  });

  return (
    <div className="animate-fadeIn pb-20">
      <ModalConfirmacao isOpen={modalOpen} onClose={() => setModalOpen(false)} {...modalConfig} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl sticky top-6">
                  {/* CORRIGIDO PARA YELLOW */}
                  <div className="flex items-center gap-3 mb-4 text-yellow-500">
                      <Calendar size={20}/>
                      <h3 className="font-bold uppercase tracking-widest text-sm">Controle de Rodadas</h3>
                  </div>

                  {!modoEdicaoManual ? (
                      <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 rounded-xl p-5 text-center">
                          <span className="text-gray-500 text-xs uppercase font-bold tracking-wide">Próxima atualização</span>
                          <div className="text-5xl font-black text-white my-3">{proxRodada}ª</div>
                          <span className="text-gray-400 text-xs block mb-4">Rodada do Cartola</span>
                          
                          {/* CORRIGIDO PARA YELLOW */}
                          <button 
                            onClick={handleAtualizar} 
                            disabled={loading} 
                            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2"
                          >
                              {loading ? <RefreshCw className="animate-spin w-4 h-4"/> : 'Buscar Pontuações'}
                          </button>

                          <button 
                            onClick={() => { setModoEdicaoManual(true); setRodadaInput(String(proxRodada)); }}
                            className="mt-4 text-[10px] text-gray-500 underline hover:text-gray-300"
                          >
                            Preciso corrigir uma rodada anterior
                          </button>
                      </div>
                  ) : (
                      <div className="bg-[#1a1a1a] border border-yellow-500/20 rounded-xl p-5">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-yellow-500 text-xs font-bold uppercase">Modo Manual</span>
                              <button onClick={() => setModoEdicaoManual(false)} className="text-gray-500 hover:text-white text-xs">Cancelar</button>
                          </div>
                          <p className="text-gray-500 text-[10px] mb-3">Digite o número da rodada que deseja atualizar ou corrigir.</p>
                          <input 
                            type="number" 
                            className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg focus:border-yellow-500 outline-none font-bold text-center text-lg mb-3"
                            value={rodadaInput}
                            onChange={e => setRodadaInput(e.target.value)}
                          />
                          <button 
                            onClick={handleAtualizar}
                            disabled={loading || !rodadaInput}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold uppercase text-xs transition"
                          >
                             {loading ? '...' : 'Atualizar Forçado'}
                          </button>
                      </div>
                  )}
                  
                  <div className="border-t border-gray-800 pt-4 mt-6">
                      <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition text-[10px] font-bold uppercase">
                          <Trash2 size={12} /> Resetar Liga
                      </button>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2">
              <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                  
                  <div className="bg-[#1a1a1a] px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                      {/* CORRIGIDO PARA YELLOW */}
                      <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                          <Trophy size={16} className="text-yellow-500"/> 
                          {visaoTabela === 'geral' ? 'Classificação Geral' : `Classificação Rodada ${visaoTabela}`}
                      </h3>
                      
                      <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800 overflow-x-auto max-w-full">
                          {/* CORRIGIDO PARA YELLOW */}
                          <button 
                              onClick={() => setVisaoTabela('geral')}
                              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition whitespace-nowrap ${visaoTabela === 'geral' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}
                          >
                              Geral
                          </button>
                          
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
                  
                  <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                              <tr>
                                  <th className="py-4 pl-6 w-[50px] text-center bg-black sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Pos</th>
                                  <th className="py-4 px-4 w-[200px] bg-black sticky left-[50px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Time</th>
                                  {dados.rodadas.map(r => (
                                      <th key={r} className="py-4 px-4 text-center text-gray-600 min-w-[60px]">R{r}</th>
                                  ))}
                                  <th className="py-4 px-6 text-center text-white w-[100px]">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/50">
                              {rankingExibido.length === 0 ? (
                                  <tr><td colSpan={dados.rodadas.length + 3} className="py-8 text-center text-gray-600 italic">Nenhum dado registrado.</td></tr>
                              ) : (
                                  rankingExibido.map((t, i) => {
                                      const time = t.times;
                                      const valorMostrado = visaoTabela === 'geral' ? t.pts : (t.historico[visaoTabela] || 0);
                                      
                                      return (
                                          <tr key={t.id} className="hover:bg-white/[0.02] transition group">
                                              <td className="py-3 pl-6 text-center font-bold text-gray-500 relative bg-[#121212] sticky left-0 z-10 group-hover:bg-[#1a1a1a]">
                                                  {i + 1}º
                                              </td>
                                              
                                              <td className="py-3 px-4 bg-[#121212] sticky left-[50px] z-10 group-hover:bg-[#1a1a1a] border-r border-gray-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                                                  <div className="flex items-center gap-3">
                                                      <img src={time?.escudo || '/shield-placeholder.png'} className="w-6 h-6 object-contain" />
                                                      <div className="truncate max-w-[140px]">
                                                          <div className="font-bold text-gray-200">{time?.nome}</div>
                                                          <div className="text-[9px] text-gray-600 uppercase font-bold tracking-wide">{time?.nome_cartola}</div>
                                                      </div>
                                                  </div>
                                              </td>

                                              {dados.rodadas.map(r => (
                                                  <td key={r} className="py-3 px-4 text-center font-mono text-gray-400">
                                                      {formatDecimal(t.historico[r])}
                                                  </td>
                                              ))}

                                              {visaoTabela === 'geral' ? (
                                                  <td className="py-3 px-6 text-center">
                                                      {/* CORRIGIDO PARA YELLOW */}
                                                      <span className="text-yellow-400 font-black text-sm bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                                                          {formatDecimal(valorMostrado)}
                                                      </span>
                                                  </td>
                                              ) : (
                                                  <td className="py-3 px-6 text-center">
                                                      <span className="text-white font-bold text-sm bg-white/10 px-2 py-1 rounded">
                                                          {formatDecimal(valorMostrado)}
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
      </div>
    </div>
  )
}