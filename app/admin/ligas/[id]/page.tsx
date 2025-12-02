'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  adicionarTimeAoCampeonato, listarTimesDoCampeonato, listarTodosTimes, listarPartidas,
  zerarJogos, removerTimeDaLiga, 
  gerarMataMataInteligente, avancarFaseMataMata, atualizarRodadaMataMata, atualizarPlacarManual
} from '../../../actions' 
import { supabase } from '@/lib/supabase'

// IMPORTS ATUALIZADOS DA PASTA COMPONENTS
import MataMataBracket from '@/app/components/MataMataBracket'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // --- DADOS ---
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([]) 
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])

  // --- UI ---
  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'times' | 'sorteio'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  
  // --- MODAL DE CONFIRMAÇÃO ---
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({
    titulo: '', mensagem: '', tipo: 'info' as 'info'|'perigo'|'sucesso', onConfirm: () => {}
  })

  function abrirConfirmacao(titulo: string, msg: string, acao: () => void, tipo: 'info'|'perigo'|'sucesso' = 'info') {
    setModalConfig({ titulo, mensagem: msg, onConfirm: () => { acao(); setModalOpen(false); }, tipo })
    setModalOpen(true)
  }

  // --- EDIÇÃO PLACAR ---
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // --- RODADAS ---
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')

  useEffect(() => { if (id) carregarDados() }, [id])

  async function carregarDados() {
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)
    
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times) 
    
    if (dadosLiga?.tipo === 'mata_mata' && _times.length === 0) setTabAtiva('times')

    setTodosTimes(await listarTodosTimes())
    const jogos = await listarPartidas(campeonatoId)
    setPartidas(jogos)

    if (jogos.length > 0) {
        const maxFase = Math.max(...jogos.map((j: any) => j.rodada))
        setFaseAtual(String(maxFase))
    }
  }

  // --- HELPERS ---
  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)
  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b)

  // ==========================================================
  // HANDLERS (AÇÕES)
  // ==========================================================

  function moverTime(index: number, direcao: number) {
    const novaLista = [...timesLiga];
    const itemMovido = novaLista[index];
    novaLista.splice(index, 1);
    novaLista.splice(index + direcao, 0, itemMovido);
    setTimesLiga(novaLista);
  }

  // GERAÇÃO COM SEEDS (COM MODAL)
  async function handleGerarComSeeds(aleatorio = false) {
    const msg = aleatorio 
       ? "Isso vai apagar a chave atual e criar novos confrontos totalmente ALEATÓRIOS. Os dados atuais serão perdidos. Tem certeza?"
       : "Isso vai apagar a chave atual e criar novos confrontos baseados na ordem de SEEDS que você definiu. Os dados atuais serão perdidos.";

    abrirConfirmacao(
        "Gerar Novo Chaveamento",
        msg,
        async () => {
            const idsOrdenados = aleatorio ? [] : timesLiga.map(t => t.time_id); 
            const res = await gerarMataMataInteligente(campeonatoId, idsOrdenados, aleatorio);
            if (res.success) {
                toast.success(res.msg);
                carregarDados();
                setTabAtiva('jogos');
            } else {
                toast.error(res.msg);
            }
        },
        'perigo'
    )
  }

  async function handleAtualizarRodada() {
    if (!rodadaIda && !rodadaVolta) return toast.error("Preencha a rodada do Cartola para Ida ou Volta")
    toast.loading("Atualizando pontuações...")
    const res = await atualizarRodadaMataMata(campeonatoId, Number(faseAtual), Number(rodadaIda), Number(rodadaVolta))
    toast.dismiss()
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
  }

  async function handleAdicionarTime() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { setSelecionadoId(''); carregarDados(); toast.success("Time adicionado!"); }
  }

  // REMOVER TIME (COM MODAL)
  async function handleRemoverTime(timeId: number) {
    abrirConfirmacao(
        "Remover Time",
        "Tem certeza que deseja remover este time da liga? Isso pode afetar o histórico de jogos.",
        async () => {
            const res = await removerTimeDaLiga(campeonatoId, timeId)
            if (res.success) { carregarDados(); toast.success("Time removido") }
        },
        'perigo'
    )
  }

  // RESETAR LIGA (COM MODAL)
  async function handleZerarTudo() {
    abrirConfirmacao(
        "Resetar Liga Inteira",
        "ATENÇÃO: Isso apagará TODOS os jogos, fases e históricos de confronto desta liga. Essa ação é irreversível.",
        async () => {
            await zerarJogos(campeonatoId)
            carregarDados()
            toast.success("Liga resetada com sucesso.")
        },
        'perigo'
    )
  }

  // AVANÇAR FASE (COM MODAL)
  async function handleAvancarFase() {
    abrirConfirmacao(
        "Avançar de Fase",
        "Deseja gerar os jogos da próxima fase com base nos vencedores atuais?",
        async () => {
            const res = await avancarFaseMataMata(campeonatoId, Number(faseAtual))
            if (res.success) { toast.success(res.msg); carregarDados() } else { toast.error(res.msg) }
        },
        'sucesso'
    )
  }

  async function salvarEdicao(jogoId: number) {
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Placar salvo!") }
  }

  // ==========================================================
  // RENDER (INTERFACE)
  // ==========================================================
  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto text-white pb-20 font-sans min-h-screen bg-[#0a0a0a]">
      
      {/* COMPONENTE MODAL GLOBAL */}
      <ModalConfirmacao 
        isOpen={modalOpen}
        titulo={modalConfig.titulo}
        mensagem={modalConfig.mensagem}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalOpen(false)}
        tipo={modalConfig.tipo}
      />

      {/* MODAL PLACAR MANUAL */}
      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl w-80">
                <h3 className="text-center font-bold text-white mb-4">Editar Placar</h3>
                <div className="flex justify-center items-center gap-2 mb-6">
                    <input type="number" className="w-16 h-16 bg-black border border-blue-500 text-3xl font-bold text-center rounded focus:outline-none" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-2xl text-gray-500">x</span>
                    <input type="number" className="w-16 h-16 bg-black border border-blue-500 text-3xl font-bold text-center rounded focus:outline-none" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => salvarEdicao(editingId)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded font-bold transition">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold transition">Cancelar</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <Link href="/admin/ligas" className="text-gray-500 hover:text-white text-xs mb-2 block">← Voltar</Link>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">{liga?.nome}</h1>
          <span className="inline-block mt-2 text-[10px] bg-red-900/30 text-red-400 border border-red-900 px-2 py-1 rounded uppercase font-bold tracking-wider">
            {liga?.tipo?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-800">
           <button onClick={() => setTabAtiva('jogos')} className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition ${tabAtiva === 'jogos' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white'}`}>Chaveamento</button>
           <button onClick={() => setTabAtiva('sorteio')} className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition ${tabAtiva === 'sorteio' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white'}`}>Ranking/Seeds</button>
           <button onClick={() => setTabAtiva('times')} className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition ${tabAtiva === 'times' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white'}`}>Participantes</button>
        </div>
      </div>

      {/* ABA JOGOS (BRACKET) */}
      {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn space-y-8">
            <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row gap-8 items-end relative z-10">
                    <div className="w-full lg:w-1/4">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Fase do Torneio</label>
                        <select className="w-full bg-black border border-gray-700 text-white text-lg font-bold p-3 rounded-lg focus:border-blue-500 outline-none" value={faseAtual} onChange={(e) => setFaseAtual(e.target.value)}>
                            {fasesDisponiveis.map(f => <option key={f} value={f}>{f}ª Fase</option>)}
                            {fasesDisponiveis.length === 0 && <option>Sem jogos</option>}
                        </select>
                    </div>
                    <div className="flex-1 w-full bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1 block">Rodada Cartola (IDA)</label>
                            <input type="number" placeholder="Ex: 10" className="w-full bg-black border border-gray-700 text-white font-mono font-bold p-2 rounded focus:border-blue-500 outline-none" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1 block">Rodada Cartola (VOLTA)</label>
                            <input type="number" placeholder="Ex: 11" className="w-full bg-black border border-gray-700 text-white font-mono font-bold p-2 rounded focus:border-blue-500 outline-none" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleAtualizarRodada} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-blue-900/20 w-full md:w-auto h-10">Atualizar Pontos</button>
                        </div>
                    </div>
                    {fasesDisponiveis.length > 0 && Number(faseAtual) === Math.max(...fasesDisponiveis) && (
                        <div>
                            <button onClick={handleAvancarFase} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-6 rounded-lg transition text-xs border border-gray-700">Forçar Próxima ➜</button>
                        </div>
                    )}
                    <div className="ml-auto">
                        <button onClick={handleZerarTudo} className="text-red-500 text-xs hover:text-red-400 underline decoration-red-900">Resetar Liga</button>
                    </div>
                </div>
            </div>
            <div className="mt-8 pb-20 overflow-x-auto">
                {partidas.length === 0 ? (
                    <div className="text-gray-500 italic w-full text-center py-10 bg-[#111] rounded-xl border border-gray-800 border-dashed">
                        Nenhum chaveamento gerado ainda. Vá na aba "Ranking/Seeds" e gere.
                    </div>
                ) : (
                    <MataMataBracket partidas={partidas} />
                )}
            </div>
        </div> 
      )}

      {/* === ABA RANKING/SEEDS === */}
      {tabAtiva === 'sorteio' && (
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 animate-fadeIn max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Ranking Inicial (Seeds)</h2>
                    <p className="text-gray-400 text-xs mt-1">Ordene ou sorteie os times. Os primeiros (Seeds altos) ganham vantagem.</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => handleGerarComSeeds(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-purple-900/20 uppercase tracking-wider text-xs flex items-center gap-2">
                        <span>🎲</span> Sorteio Aleatório
                    </button>
                    <button onClick={() => handleGerarComSeeds(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-green-900/20 uppercase tracking-wider text-xs flex items-center gap-2">
                        <span>⚡</span> Gerar por Ranking
                    </button>
                </div>
            </div>
            <div className="bg-black/40 rounded-xl border border-gray-700 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-800/50 p-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                    <div className="col-span-1 text-center">Seed</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-8">Time</div>
                    <div className="col-span-2 text-center">Mover</div>
                </div>
                <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {timesLiga.length === 0 && <p className="text-center py-8 text-gray-500">Adicione times na aba Participantes primeiro.</p>}
                    {timesLiga.map((item, index) => (
                        <div key={item.times.id} className="grid grid-cols-12 items-center p-3 hover:bg-white/5 transition group">
                            <div className="col-span-1 text-center font-mono font-bold text-cartola-gold text-lg">#{index + 1}</div>
                            <div className="col-span-1 flex justify-center"><img src={item.times.escudo} className="w-8 h-8 object-contain" /></div>
                            <div className="col-span-8 font-bold text-gray-200 pl-2">{item.times.nome}<span className="block text-[10px] text-gray-500 font-normal uppercase">{item.times.nome_cartola}</span></div>
                            <div className="col-span-2 flex justify-center gap-1">
                                <button onClick={() => moverTime(index, -1)} disabled={index === 0} className="p-2 bg-gray-800 hover:bg-blue-600 rounded text-gray-400 hover:text-white disabled:opacity-30 transition">▲</button>
                                <button onClick={() => moverTime(index, 1)} disabled={index === timesLiga.length - 1} className="p-2 bg-gray-800 hover:bg-blue-600 rounded text-gray-400 hover:text-white disabled:opacity-30 transition">▼</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg text-blue-200 text-xs">
                <strong>Como funciona:</strong> O sistema ajusta para a potência de 2 mais próxima. <br/>
                Os Seeds #1, #2... ganham "Bye" (folga) na 1ª rodada para preencher as vagas vazias e esperam na Fase 2.
            </div>
        </div>
      )}

      {/* === ABA TIMES === */}
      {tabAtiva === 'times' && (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><span className="text-green-500">🛡️</span> Gerenciar Participantes</h2>
                <div className="flex gap-2 mb-8">
                    <div className="relative flex-1">
                        <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 text-left px-4 py-4 rounded-xl flex items-center justify-between hover:border-gray-500 transition">
                            {timeSelecionadoObjeto ? (
                                <div className="flex items-center gap-3"><img src={timeSelecionadoObjeto.escudo} className="w-8 h-8" /><span className="font-bold text-white text-lg">{timeSelecionadoObjeto.nome}</span></div>
                            ) : <span className="text-gray-500">Selecione um time para adicionar...</span>}
                            <span className="text-gray-500">▼</span>
                        </button>
                        {menuAberto && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                                {timesDisponiveis.map(t => (
                                    <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 border-b border-gray-700/50 text-left transition"><img src={t.escudo} className="w-8 h-8" /><div className="font-bold text-white">{t.nome}</div></button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleAdicionarTime} disabled={!selecionadoId} className="bg-green-600 px-8 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 transition text-lg">Adicionar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {timesLiga.length === 0 && <p className="text-gray-500 col-span-2 text-center py-4">Nenhum time na liga ainda.</p>}
                    {timesLiga.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-gray-600 transition group">
                            <div className="flex items-center gap-3"><img src={item.times.escudo} className="w-10 h-10 object-contain" /><span className="font-bold text-gray-200">{item.times.nome}</span></div>
                            <button onClick={() => handleRemoverTime(item.times.id)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">🗑️</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}