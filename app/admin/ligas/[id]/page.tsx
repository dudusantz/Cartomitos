'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  listarTimesDoCampeonato, listarTodosTimes, 
  atualizarConfiguracaoLiga, gerarMataMataInteligente, 
  gerarMataMataCopa, buscarTabelaGrupos 
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
  
  // Estado para visualização dos classificados da Copa
  const [pote1, setPote1] = useState<any[]>([])
  const [pote2, setPote2] = useState<any[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})

  useEffect(() => { if (id) carregarDados() }, [id])

  async function carregarDados() {
    const { data } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(data)
    setFinalUnica(data?.final_unica || false)
    
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times)
    setTodosTimes(await listarTodosTimes())

    // Se for Copa, calcula os classificados para preview
    if (data?.tipo === 'copa') {
        const grupos = await buscarTabelaGrupos(campeonatoId);
        processarClassificados(grupos);
        if (tabAtiva === 'times') setTabAtiva('grupos');
    } else if (data?.tipo === 'pontos_corridos' && tabAtiva === 'times') {
        setTabAtiva('classificacao');
    } else if (data?.tipo === 'mata_mata' && tabAtiva === 'times') {
        setTabAtiva('jogos');
    }
  }

  function processarClassificados(grupos: any) {
    const p1: any[] = [];
    const p2: any[] = [];
    
    Object.keys(grupos).forEach(letra => {
        const time1 = grupos[letra][0]; // 1º Colocado
        const time2 = grupos[letra][1]; // 2º Colocado
        
        if (time1) p1.push({ ...time1, gp_origem: letra });
        if (time2) p2.push({ ...time2, gp_origem: letra });
    });

    // Ordenar Pote 1 (Melhores Campanhas)
    p1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
    
    setPote1(p1);
    setPote2(p2);
  }

  async function handleGerarCopa() {
    setModalConfig({
        titulo: "Gerar Chave Final",
        mensagem: "O sistema usará as regras: 1º vs 2º, trava de grupos e melhores campanhas em lados opostos. Confirmar?",
        onConfirm: async () => {
            const res = await gerarMataMataCopa(campeonatoId);
            if (res.success) {
                toast.success(res.msg);
                carregarDados();
                setModalOpen(false);
            } else {
                toast.error(res.msg);
            }
        },
        tipo: 'info'
    });
    setModalOpen(true);
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

            {/* VISUALIZAÇÃO ESPECIAL DA COPA (SORTEIO DIRIGIDO) */}
            {tabAtiva === 'jogos' && liga?.tipo === 'copa' && (
                <div>
                    {/* Painel de Controle do Sorteio */}
                    <div className="mb-8 bg-[#121212] p-6 rounded-3xl border border-gray-800">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Fase Final (Mata-Mata)</h3>
                                <p className="text-gray-400 text-xs max-w-2xl">
                                    O sistema utilizará a classificação da Fase de Grupos. <br/>
                                    <span className="text-yellow-500">Regras:</span> 1º vs 2º Colocado. Times do mesmo grupo não se enfrentam agora. 
                                    A Melhor e a Segunda melhor campanha ficam em chaves opostas.
                                </p>
                            </div>
                            <button onClick={handleGerarCopa} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-4 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-yellow-900/20 tracking-widest flex items-center gap-2">
                                <span>⚡</span> Gerar Chave Final
                            </button>
                        </div>

                        {/* Visualização dos Potes (Classificados) */}
                        {pote1.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                                
                                {/* POTE 1 */}
                                <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pote 1</span>
                                        <h4 className="text-xs font-bold text-gray-300 uppercase">Líderes (Decidem em Casa)</h4>
                                    </div>
                                    <div className="space-y-1">
                                        {pote1.map((t, idx) => (
                                            <div key={t.time_id} className={`flex justify-between items-center p-2 rounded ${idx < 2 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-mono font-bold text-[10px] w-4 ${idx < 2 ? 'text-yellow-500' : 'text-gray-500'}`}>#{idx + 1}</span>
                                                    <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-5 h-5 object-contain" />
                                                    <span className="text-xs font-bold text-gray-300">{t.times?.nome}</span>
                                                </div>
                                                <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                                                    <span title="Grupo Origem">Gr.{t.gp_origem}</span>
                                                    <span className="text-white font-bold">{t.pts}pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-2 text-center">Ordenados por melhor campanha geral.</p>
                                </div>

                                {/* POTE 2 */}
                                <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pote 2</span>
                                        <h4 className="text-xs font-bold text-gray-300 uppercase">Desafiantes (Mandam Ida)</h4>
                                    </div>
                                    <div className="space-y-1">
                                        {pote2.map((t, idx) => (
                                            <div key={t.time_id} className="flex justify-between items-center p-2 rounded bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-[10px] w-4 text-gray-500">-</span>
                                                    <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-5 h-5 object-contain" />
                                                    <span className="text-xs font-bold text-gray-300">{t.times?.nome}</span>
                                                </div>
                                                <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                                                    <span title="Grupo Origem">Gr.{t.gp_origem}</span>
                                                    <span className="text-white font-bold">{t.pts}pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-2 text-center">Sorteados contra o Pote 1 (Exceto mesmo grupo).</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Componente que exibe a chave */}
                    <PainelMataMata campeonatoId={campeonatoId} rodadasCorte={6} />
                </div>
            )}

            {tabAtiva === 'grupos' && <PainelFaseGrupos campeonatoId={campeonatoId} times={timesLiga} />}

            {tabAtiva === 'times' && (
                <PainelTimes campeonatoId={campeonatoId} timesLiga={timesLiga} todosTimes={todosTimes} aoAtualizar={carregarDados} />
            )}

            {/* ABA CONFIG - AGORA LIMPA */}
            {tabAtiva === 'config' && (
                <div className="bg-[#121212] p-8 rounded-3xl border border-gray-800 max-w-4xl mx-auto animate-fadeIn">
                    <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Configurações</h3>
                    
                    <div className="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
                        <div>
                            <span className="font-bold block text-white text-sm">Final em Jogo Único</span>
                            <span className="text-gray-500 text-xs">Se ativado, a final será decidida em apenas uma partida.</span>
                        </div>
                        <input type="checkbox" checked={finalUnica} onChange={e => { setFinalUnica(e.target.checked); atualizarConfiguracaoLiga(campeonatoId, e.target.checked); }} className="w-6 h-6 accent-green-500 cursor-pointer" />
                    </div>
                    
                    {/* A lista de ordenação manual foi removida daqui */}
                </div>
            )}
        </div>
    </div>
  )
}