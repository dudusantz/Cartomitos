'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  adicionarTimeAoCampeonato, listarTimesDoCampeonato, listarTodosTimes, listarPartidas,
  zerarJogos, removerTimeDaLiga, 
  gerarMataMataInteligente, avancarFaseMataMata, atualizarRodadaMataMata, atualizarPlacarManual,
  gerarFaseGrupos, buscarTabelaGrupos
} from '../../../actions' 
import { supabase } from '@/lib/supabase'
// Certifique-se de que estes componentes existem na pasta components
import MataMataBracket from '@/app/components/MataMataBracket'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // DADOS
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([]) // Ranking/Seeds/Potes
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])
  
  // DADOS DA COPA
  const [grupos, setGrupos] = useState<any>({}) // { A: [...], B: [...] }
  const [numGrupos, setNumGrupos] = useState(4) // Padrão 4 grupos

  // UI
  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'times' | 'sorteio' | 'grupos'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)

  // MODAL & EDIÇÃO
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ titulo: '', mensagem: '', tipo: 'info' as any, onConfirm: () => {} })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // RODADAS
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')

  function abrirConfirmacao(titulo: string, msg: string, acao: () => void, tipo: 'info'|'perigo'|'sucesso' = 'info') {
    setModalConfig({ titulo, mensagem: msg, onConfirm: () => { acao(); setModalOpen(false); }, tipo })
    setModalOpen(true)
  }

  useEffect(() => { if (id) carregarDados() }, [id])

  async function carregarDados() {
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)
    
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times) 
    
    // Lógica de Redirecionamento Inicial
    if (dadosLiga?.tipo === 'mata_mata' && _times.length === 0) setTabAtiva('times')
    
    // SE FOR COPA: Carrega os grupos
    if (dadosLiga?.tipo === 'copa') {
        const _grupos = await buscarTabelaGrupos(campeonatoId)
        setGrupos(_grupos)
        // Se já tem grupos, foca na aba grupos. Se não tem times, foca em times.
        if (Object.keys(_grupos).length > 0 && tabAtiva === 'jogos') setTabAtiva('grupos')
        else if (_times.length === 0) setTabAtiva('times')
    }

    setTodosTimes(await listarTodosTimes())
    const jogos = await listarPartidas(campeonatoId)
    setPartidas(jogos)

    if (jogos.length > 0) {
        const maxFase = Math.max(...jogos.map((j: any) => j.rodada))
        setFaseAtual(String(maxFase))
    }
  }

  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)
  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b)

  // --- ACTIONS ---

  function moverTime(index: number, direcao: number) {
    const novaLista = [...timesLiga];
    const itemMovido = novaLista[index];
    novaLista.splice(index, 1);
    novaLista.splice(index + direcao, 0, itemMovido);
    setTimesLiga(novaLista);
  }

  // GERAÇÃO COPA: SORTEIO DE GRUPOS
  async function handleSortearGrupos() {
    if (timesLiga.length === 0) return toast.error("Adicione times antes de sortear!");
    if (timesLiga.length % numGrupos !== 0) return toast.error(`Erro: ${timesLiga.length} times não podem ser divididos igualmente em ${numGrupos} grupos.`);
    
    const timesPorPote = numGrupos; 
    const numPotes = timesLiga.length / numGrupos;
    
    // Cria os potes baseados na lista de Ranking/Seeds que você ordenou
    const potes = [];
    for (let i = 0; i < numPotes; i++) {
        const slice = timesLiga.slice(i * timesPorPote, (i + 1) * timesPorPote);
        potes.push(slice.map(t => t.time_id));
    }

    abrirConfirmacao(
        "Sortear Grupos", 
        `Criar ${numGrupos} grupos com ${numPotes} times cada? Isso apagará jogos existentes.`, 
        async () => {
            const res = await gerarFaseGrupos(campeonatoId, numGrupos, potes);
            if (res.success) { 
                toast.success("Grupos sorteados e jogos gerados!"); 
                carregarDados(); 
                setTabAtiva('grupos'); 
            } else { 
                toast.error(res.msg); 
            }
        }, 
        'perigo'
    )
  }

  // GERAÇÃO MATA-MATA (Apenas se for torneio puro)
  async function handleGerarComSeeds(aleatorio = false) {
    const msg = aleatorio ? "Sorteio aleatório?" : "Usar ordem da lista como Seeds?";
    abrirConfirmacao("Gerar Chaveamento", msg, async () => {
        const idsOrdenados = aleatorio ? [] : timesLiga.map(t => t.time_id); 
        const res = await gerarMataMataInteligente(campeonatoId, idsOrdenados, aleatorio);
        if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('jogos'); } else { toast.error(res.msg); }
    }, 'perigo')
  }

  async function handleAtualizarRodada() {
    if (!rodadaIda && !rodadaVolta) return toast.error("Preencha as rodadas!")
    toast.loading("Atualizando...")
    const res = await atualizarRodadaMataMata(campeonatoId, Number(faseAtual), Number(rodadaIda), Number(rodadaVolta))
    toast.dismiss()
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
  }

  async function handleAdicionarTime() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { setSelecionadoId(''); carregarDados(); toast.success("Adicionado!"); }
  }

  async function handleRemoverTime(timeId: number) {
    abrirConfirmacao("Remover Time", "Confirma remoção?", async () => {
        const res = await removerTimeDaLiga(campeonatoId, timeId)
        if (res.success) { carregarDados(); toast.success("Removido") }
    }, 'perigo')
  }

  async function handleZerarTudo() {
    abrirConfirmacao("Resetar Liga", "Apagar tudo?", async () => {
        await zerarJogos(campeonatoId)
        carregarDados()
        setGrupos({}) // Limpa visual dos grupos
        toast.success("Liga resetada.")
    }, 'perigo')
  }

  async function handleAvancarFase() {
    abrirConfirmacao("Avançar Fase", "Gerar próxima fase?", async () => {
        const res = await avancarFaseMataMata(campeonatoId, Number(faseAtual))
        if (res.success) { toast.success(res.msg); carregarDados() } else { toast.error(res.msg) }
    }, 'sucesso')
  }

  async function salvarEdicao(jogoId: number) {
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Salvo!") }
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto text-white pb-20 font-sans min-h-screen bg-[#0a0a0a]">
      <ModalConfirmacao isOpen={modalOpen} titulo={modalConfig.titulo} mensagem={modalConfig.mensagem} onConfirm={modalConfig.onConfirm} onCancel={() => setModalOpen(false)} tipo={modalConfig.tipo} />

      {/* MODAL EDITAR PLACAR */}
      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-80">
                <h3 className="text-center font-bold text-white mb-4">Editar Placar</h3>
                <div className="flex justify-center items-center gap-2 mb-6">
                    <input type="number" className="w-16 h-16 bg-black border border-blue-500 text-3xl font-bold text-center rounded" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-2xl text-gray-500">x</span>
                    <input type="number" className="w-16 h-16 bg-black border border-blue-500 text-3xl font-bold text-center rounded" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => salvarEdicao(editingId)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded font-bold">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold">Cancelar</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <Link href="/admin/ligas" className="text-gray-500 text-xs mb-1 block">← Voltar</Link>
          <h1 className="text-4xl font-extrabold">{liga?.nome}</h1>
          <span className="text-xs bg-blue-900 px-2 py-1 rounded uppercase">{liga?.tipo?.replace('_', ' ')}</span>
        </div>
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-800">
           {/* Botão FASE DE GRUPOS (Só aparece na Copa) */}
           {liga?.tipo === 'copa' && (
             <button onClick={() => setTabAtiva('grupos')} className={`px-4 py-2 rounded font-bold text-xs transition ${tabAtiva === 'grupos' ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-white'}`}>
                Fase de Grupos
             </button>
           )}
           <button onClick={() => setTabAtiva('jogos')} className={`px-4 py-2 rounded font-bold text-xs transition ${tabAtiva === 'jogos' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}>
                {liga?.tipo === 'copa' ? 'Mata-Mata' : 'Chaveamento'}
           </button>
           <button onClick={() => setTabAtiva('sorteio')} className={`px-4 py-2 rounded font-bold text-xs transition ${tabAtiva === 'sorteio' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}>
                Ranking/Potes
           </button>
           <button onClick={() => setTabAtiva('times')} className={`px-4 py-2 rounded font-bold text-xs transition ${tabAtiva === 'times' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}>
                Participantes
           </button>
        </div>
      </div>

      {/* ABA 1: FASE DE GRUPOS (COPA) */}
      {tabAtiva === 'grupos' && (
        <div className="animate-fadeIn space-y-8">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-wrap gap-6 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Nº de Grupos</label>
                    <select className="bg-black p-3 rounded w-40 border border-gray-700 text-white font-bold" value={numGrupos} onChange={e => setNumGrupos(Number(e.target.value))}>
                        <option value={2}>2 Grupos (A-B)</option>
                        <option value={4}>4 Grupos (A-D)</option>
                        <option value={8}>8 Grupos (A-H)</option>
                    </select>
                </div>
                <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Info do Sorteio</p>
                    <div className="text-sm text-gray-400 bg-black/50 p-3 rounded border border-gray-800">
                        {timesLiga.length > 0 ? (
                            <>Serão <strong>{timesLiga.length / numGrupos} times</strong> por grupo. Distribuição baseada nos Potes (Ranking).</>
                        ) : "Adicione times primeiro."}
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex gap-2">
                        <input type="number" placeholder="Ida" className="bg-black p-3 rounded w-20 border border-gray-700 text-center" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                        <input type="number" placeholder="Volta" className="bg-black p-3 rounded w-20 border border-gray-700 text-center" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                    </div>
                    <button onClick={handleAtualizarRodada} className="bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded font-bold text-sm shadow-lg">Atualizar Pontos</button>
                </div>
                <button onClick={handleSortearGrupos} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded shadow-lg flex items-center gap-2">🎲 Realizar Sorteio</button>
            </div>
            
            {/* Lista dos Grupos */}
            {Object.keys(grupos).length === 0 ? (
                <div className="text-center py-20 border border-gray-800 border-dashed rounded-2xl bg-[#111]">
                    <p className="text-gray-500">Nenhum grupo sorteado. Configure acima e clique em Sorteio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.keys(grupos).sort().map(letra => (
                        <div key={letra} className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                            <div className="bg-gray-800/50 px-4 py-3 font-black text-center border-b border-gray-800">GRUPO {letra}</div>
                            <div className="divide-y divide-gray-800">
                                {grupos[letra].map((time: any, idx: number) => (
                                    <div key={time.id} className="p-3 flex items-center justify-between hover:bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono font-bold text-sm w-5 text-center ${idx < 2 ? 'text-green-400' : 'text-gray-600'}`}>{idx + 1}º</span>
                                            <img src={time.times.escudo} className="w-6 h-6 object-contain" />
                                            <span className="text-xs font-bold text-gray-200 truncate w-24">{time.times.nome}</span>
                                        </div>
                                        <div className="text-right font-mono text-xs text-gray-400">
                                            <span className="font-bold text-white mr-2">{time.pts}p</span>
                                            <span>{time.sp}S</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* ABA 2: MATA-MATA (BRACKET) */}
      {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn space-y-8">
            <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Fase Atual</label>
                    <select className="bg-black p-3 rounded w-full border border-gray-700 font-bold text-white" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                        {fasesDisponiveis.map(f => <option key={f} value={f}>{f}ª Fase (Mata-Mata)</option>)}
                        {fasesDisponiveis.length === 0 && <option>Aguardando Definição</option>}
                    </select>
                </div>
                <div className="flex gap-2">
                    <input type="number" placeholder="Ida" className="bg-black p-3 rounded w-20 border border-gray-700 text-center" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                    <input type="number" placeholder="Volta" className="bg-black p-3 rounded w-20 border border-gray-700 text-center" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                </div>
                <button onClick={handleAtualizarRodada} className="bg-blue-600 px-6 py-3 rounded font-bold hover:bg-blue-500">Atualizar</button>
                
                {fasesDisponiveis.length > 0 && Number(faseAtual) === Math.max(...fasesDisponiveis) && (
                     <button onClick={handleAvancarFase} className="bg-gray-800 px-4 py-3 rounded font-bold hover:bg-gray-700 text-sm border border-gray-600">Próxima Fase ➜</button>
                )}
                <button onClick={handleZerarTudo} className="text-red-500 underline text-xs ml-auto">Resetar</button>
            </div>
            
            <div className="mt-8 overflow-x-auto">
                {partidas.length === 0 ? (
                    <div className="text-gray-500 italic w-full text-center py-20 bg-[#111] rounded-xl border border-gray-800 border-dashed">
                        {liga?.tipo === 'copa' ? "O mata-mata será gerado após o fim da fase de grupos." : "Nenhum chaveamento. Vá na aba 'Ranking/Potes'."}
                    </div>
                ) : (
                    <MataMataBracket partidas={partidas} />
                )}
            </div>
        </div>
      )}

      {/* ABA 3: RANKING / POTES */}
      {tabAtiva === 'sorteio' && (
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 animate-fadeIn">
            <div className="flex justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">{liga?.tipo === 'copa' ? 'Definição dos Potes' : 'Ranking Inicial (Seeds)'}</h2>
                    <p className="text-gray-400 text-xs mt-1">
                        {liga?.tipo === 'copa' ? "A ordem define os potes (Cabeças de chave no topo)." : "A ordem define os seeds para o chaveamento olímpico."}
                    </p>
                </div>
                {liga?.tipo !== 'copa' && (
                    <div className="flex gap-2">
                        <button onClick={() => handleGerarComSeeds(true)} className="bg-purple-600 px-4 py-2 rounded font-bold text-xs hover:bg-purple-500">🎲 Aleatório</button>
                        <button onClick={() => handleGerarComSeeds(false)} className="bg-green-600 px-4 py-2 rounded font-bold text-xs hover:bg-green-500">⚡ Gerar Chave</button>
                    </div>
                )}
            </div>
            
            <div className="bg-black/40 rounded-xl border border-gray-700 divide-y divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                {timesLiga.map((item, index) => (
                    <div key={item.times.id} className="grid grid-cols-12 items-center p-3 hover:bg-white/5">
                        <div className="col-span-1 text-center font-mono text-cartola-gold">#{index + 1}</div>
                        <div className="col-span-1"><img src={item.times.escudo} className="w-8 h-8 object-contain" /></div>
                        <div className="col-span-8 font-bold text-sm">{item.times.nome}</div>
                        <div className="col-span-2 flex gap-1 justify-center">
                            <button onClick={() => moverTime(index, -1)} disabled={index === 0} className="px-2 bg-gray-700 rounded hover:bg-gray-600">▲</button>
                            <button onClick={() => moverTime(index, 1)} disabled={index === timesLiga.length - 1} className="px-2 bg-gray-700 rounded hover:bg-gray-600">▼</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* ABA 4: TIMES */}
      {tabAtiva === 'times' && (
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl animate-fadeIn">
            <div className="flex gap-2 mb-8">
                <div className="relative flex-1">
                    <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 p-4 rounded text-left flex justify-between items-center">
                        {timeSelecionadoObjeto ? (<div className="flex items-center gap-2"><img src={timeSelecionadoObjeto.escudo} className="w-6 h-6" /> {timeSelecionadoObjeto.nome}</div>) : "Selecionar time..."} 
                        <span>▼</span>
                    </button>
                    {menuAberto && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded max-h-60 overflow-y-auto z-50">
                            {timesDisponiveis.map(t => (
                                <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full p-3 hover:bg-gray-700 text-left flex gap-2 items-center border-b border-gray-700/50">
                                    <img src={t.escudo} className="w-6 h-6" /> {t.nome}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={handleAdicionarTime} disabled={!selecionadoId} className="bg-green-600 px-6 rounded font-bold hover:bg-green-500">Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {timesLiga.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-black/40 rounded border border-gray-800 hover:border-gray-600">
                        <div className="flex items-center gap-3"><img src={item.times.escudo} className="w-8 h-8 object-contain" /><span className="font-bold text-sm">{item.times.nome}</span></div>
                        <button onClick={() => handleRemoverTime(item.times.id)} className="text-gray-500 hover:text-red-500">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  )
}