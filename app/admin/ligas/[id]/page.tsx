'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  listarTimesDoCampeonato, listarTodosTimes, 
  atualizarConfiguracaoLiga, gerarMataMataInteligente, 
  gerarMataMataCopa 
} from '../../../actions'
import { supabase } from '@/lib/supabase'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'

// IMPORTAÇÃO DOS PAINÉIS
import PainelPontosCorridos from '@/app/components/PainelPontosCorridos'
import PainelMataMata from '@/app/components/PainelMataMata'
import PainelFaseGrupos from '@/app/components/PainelFaseGrupos'
import PainelTimes from '@/app/components/PainelTimes'

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([]) 
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [tabAtiva, setTabAtiva] = useState<string>('times')
  const [finalUnica, setFinalUnica] = useState(false)
  const [seeds, setSeeds] = useState<any[]>([]) 
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})

  useEffect(() => { if (id) carregarDados() }, [id])

  async function carregarDados() {
    const { data } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(data)
    setFinalUnica(data?.final_unica || false)
    
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times)
    setSeeds([..._times])
    setTodosTimes(await listarTodosTimes())

    // Define aba padrão
    if (data?.tipo === 'pontos_corridos' && tabAtiva === 'times') setTabAtiva('classificacao')
    else if (data?.tipo === 'mata_mata' && tabAtiva === 'times') setTabAtiva('jogos')
    else if (data?.tipo === 'copa' && tabAtiva === 'times') setTabAtiva('grupos')
  }

  function moverSeed(index: number, direcao: number) {
    const novosSeeds = [...seeds];
    const item = novosSeeds[index];
    novosSeeds.splice(index, 1);
    novosSeeds.splice(index + direcao, 0, item);
    setSeeds(novosSeeds);
  }

  async function handleGerarMataMataOrdenado() {
    const ids = seeds.map(s => s.time_id);
    const res = await gerarMataMataInteligente(campeonatoId, ids, false);
    if(res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('jogos'); } else toast.error(res.msg);
  }

  async function handleSalvarConfig() {
      await atualizarConfiguracaoLiga(campeonatoId, finalUnica)
      toast.success("Salvo")
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
        <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />

        {/* HEADER */}
        <div className="p-8 border-b border-gray-800 bg-[#080808]">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <Link href="/admin/ligas" className="text-gray-500 text-xs font-bold hover:text-white uppercase mb-2 block transition">← Voltar</Link>
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{liga?.nome}</h1>
                    <span className="text-[10px] bg-gray-800 border border-gray-700 px-3 py-1 rounded-full uppercase font-bold text-gray-300 tracking-widest">{liga?.tipo?.replace('_', ' ')}</span>
                </div>
                
                <div className="flex gap-2 bg-[#121212] p-1.5 rounded-xl border border-gray-800 shadow-xl">
                    {liga?.tipo === 'pontos_corridos' && (
                        <button onClick={() => setTabAtiva('classificacao')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'classificacao' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Tabela</button>
                    )}
                    {liga?.tipo === 'mata_mata' && (
                        <button onClick={() => setTabAtiva('jogos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'jogos' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Chaveamento</button>
                    )}
                    {liga?.tipo === 'copa' && (
                        <>
                            <button onClick={() => setTabAtiva('grupos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'grupos' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Grupos</button>
                            <button onClick={() => setTabAtiva('jogos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'jogos' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Mata-Mata</button>
                        </>
                    )}
                    
                    <button onClick={() => setTabAtiva('times')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'times' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Times</button>
                    
                    {liga?.tipo !== 'pontos_corridos' && (
                        <button onClick={() => setTabAtiva('config')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider ${tabAtiva === 'config' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Config</button>
                    )}
                </div>
            </div>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto">
            
            {/* PAINÉIS */}
            {tabAtiva === 'classificacao' && liga?.tipo === 'pontos_corridos' && (
                <PainelPontosCorridos campeonatoId={campeonatoId} times={timesLiga} />
            )}

            {tabAtiva === 'jogos' && liga?.tipo === 'mata_mata' && (
                <PainelMataMata campeonatoId={campeonatoId} rodadasCorte={0} />
            )}

            {tabAtiva === 'jogos' && liga?.tipo === 'copa' && (
                <div>
                    <div className="flex justify-between items-center mb-6 bg-[#121212] p-4 rounded-xl border border-gray-800">
                        <h3 className="font-bold text-white uppercase tracking-wider">Fase Final</h3>
                        <button onClick={async () => { await gerarMataMataCopa(campeonatoId); toast.success("Gerado!"); carregarDados(); }} className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded text-xs font-bold uppercase transition">Gerar Chave Final</button>
                    </div>
                    <PainelMataMata campeonatoId={campeonatoId} rodadasCorte={6} />
                </div>
            )}

            {tabAtiva === 'grupos' && <PainelFaseGrupos campeonatoId={campeonatoId} times={timesLiga} />}

            {tabAtiva === 'times' && (
                <PainelTimes campeonatoId={campeonatoId} timesLiga={timesLiga} todosTimes={todosTimes} aoAtualizar={carregarDados} />
            )}

            {/* ABA CONFIG */}
            {tabAtiva === 'config' && (
                <div className="bg-[#121212] p-8 rounded-3xl border border-gray-800 max-w-4xl mx-auto animate-fadeIn">
                    <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Configurações</h3>
                    
                    <div className="flex justify-between items-center mb-8 p-4 bg-black rounded-xl border border-gray-800">
                        <div>
                            <span className="font-bold block text-white text-sm">Final em Jogo Único</span>
                        </div>
                        <input type="checkbox" checked={finalUnica} onChange={e => { setFinalUnica(e.target.checked); atualizarConfiguracaoLiga(campeonatoId, e.target.checked); }} className="w-6 h-6 accent-green-500 cursor-pointer" />
                    </div>
                    
                    {/* Seeds */}
                    {liga?.tipo === 'mata_mata' && (
                        <div className="border-t border-gray-800 pt-8">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h4 className="text-white font-bold uppercase text-sm tracking-widest">Ranking Inicial (Seeds)</h4>
                                    <p className="text-gray-500 text-xs mt-1">
                                        Ordene os times. O 1º enfrenta o último, etc.
                                    </p>
                                </div>
                                <button onClick={handleGerarMataMataOrdenado} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold text-xs uppercase transition shadow-lg shadow-blue-900/20">
                                    Gerar Chave com esta Ordem
                                </button>
                            </div>

                            <div className="bg-black/50 border border-gray-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                                {seeds.map((item, index) => {
                                    const time = item.times || {};
                                    return (
                                    <div key={item.time_id} className="flex items-center justify-between p-3 border-b border-gray-800/50 hover:bg-white/[0.02]">
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono font-bold text-blue-500 w-6 text-right">#{index + 1}</span>
                                            <img src={time.escudo || '/shield-placeholder.png'} className="w-8 h-8 object-contain" />
                                            <span className="font-bold text-gray-300">{time.nome || 'Time'}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => moverSeed(index, -1)} disabled={index === 0} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-30">▲</button>
                                            <button onClick={() => moverSeed(index, 1)} disabled={index === seeds.length - 1} className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-30">▼</button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  )
}