'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  adicionarTimeAoCampeonato, listarTimesDoCampeonato, listarTodosTimes, listarPartidas,
  zerarJogos, removerTimeDaLiga, 
  gerarMataMataInteligente, avancarFaseMataMata, atualizarRodadaMataMata, atualizarPlacarManual,
  sortearGrupos, gerarJogosFaseGrupos, buscarTabelaGrupos, atualizarRodadaGrupos, gerarMataMataCopa,
  excluirMataMata
} from '../../../actions' 
import { supabase } from '@/lib/supabase'
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
  const [grupos, setGrupos] = useState<any>({}) 
  
  // --- UI ---
  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'times' | 'sorteio' | 'grupos'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  // --- MODAIS ---
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ titulo: '', mensagem: '', tipo: 'info' as any, onConfirm: () => {} })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // --- RODADAS ---
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaCartolaInput, setRodadaCartolaInput] = useState('')
  const [rodadaView, setRodadaView] = useState(1)
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
    
    if (dadosLiga?.tipo === 'copa') {
        const _grupos = await buscarTabelaGrupos(campeonatoId)
        setGrupos(_grupos)
        
        if (Object.keys(_grupos).length > 0 && tabAtiva === 'jogos') {
             const temMataMata = await listarPartidas(campeonatoId).then(p => p.some((j:any) => j.rodada > 6));
             if(!temMataMata) setTabAtiva('grupos');
        }
        else if (_times.length === 0) setTabAtiva('times')
    }

    setTodosTimes(await listarTodosTimes())
    const jogos = await listarPartidas(campeonatoId)
    setPartidas(jogos)
  }

  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)

  // --- CONFIGURAÇÃO DE RODADAS ---
  const timesPorGrupo = Object.values(grupos)[0] ? (grupos[Object.keys(grupos)[0]] as any[]).length : 4; 
  const maxRodadaGrupos = (timesPorGrupo - 1) * 2; 
  const RODADAS_CORTE = maxRodadaGrupos > 0 ? maxRodadaGrupos : 6;

  const jogosDaRodadaView = partidas.filter(j => j.rodada === rodadaView);
  const totalRodadasGrupos = partidas.length > 0 ? Math.max(...partidas.filter(p => p.rodada <= RODADAS_CORTE).map(p => p.rodada)) : 1;

  const jogosMataMata = partidas
    .filter(p => p.rodada > RODADAS_CORTE)
    .map(p => ({
      ...p,
      rodada: p.rodada - RODADAS_CORTE 
    }));
  
  const fasesDisponiveisMataMata = [...new Set(jogosMataMata.map(p => p.rodada))].sort((a, b) => a - b);

  function getGrupoDoJogo(timeId: number) {
    const time = timesLiga.find(t => t.time_id === timeId);
    return time?.grupo || '?';
  }

  // --- AÇÕES ---
  function moverTime(index: number, direcao: number) {
    const novaLista = [...timesLiga]; const itemMovido = novaLista[index];
    novaLista.splice(index, 1); novaLista.splice(index + direcao, 0, itemMovido);
    setTimesLiga(novaLista);
  }
  async function handleAdicionarTime() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { setSelecionadoId(''); carregarDados(); toast.success("Adicionado!"); }
  }
  async function handleRemoverTime(timeId: number) {
    abrirConfirmacao("Remover", "Confirma remover este time?", async () => {
        const res = await removerTimeDaLiga(campeonatoId, timeId); if (res.success) { carregarDados(); toast.success("Removido") }
    }, 'perigo')
  }
  async function handleZerarTudo() {
    abrirConfirmacao("Resetar", "Apagar TUDO da liga?", async () => {
        await zerarJogos(campeonatoId); carregarDados(); setGrupos({}); toast.success("Liga resetada.")
    }, 'perigo')
  }
  async function salvarEdicao(jogoId: number) {
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Placar salvo!") }
  }
  function abrirEdicao(jogo: any) {
    setEditingId(jogo.id); setTempCasa(String(jogo.placar_casa ?? 0)); setTempVisitante(String(jogo.placar_visitante ?? 0))
  }
  async function handleGerarComSeeds(aleatorio = false) {
    abrirConfirmacao("Gerar Chave", "Gerar chaveamento?", async () => {
        const idsOrdenados = aleatorio ? [] : timesLiga.map(t => t.time_id); 
        const res = await gerarMataMataInteligente(campeonatoId, idsOrdenados, aleatorio);
        if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('jogos'); } else { toast.error(res.msg); }
    }, 'perigo')
  }
  async function handleAtualizarRodada() {
    toast.loading("Atualizando..."); const res = await atualizarRodadaMataMata(campeonatoId, Number(faseAtual), Number(rodadaIda), Number(rodadaVolta));
    toast.dismiss(); if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
  }
  async function handleSortearGrupos() {
    if (timesLiga.length === 0) return toast.error("Adicione times!");
    const numPotes = 4; const timesPorPote = Math.ceil(timesLiga.length / numPotes);
    const potes = []; for (let i = 0; i < numPotes; i++) { const slice = timesLiga.slice(i * timesPorPote, (i + 1) * timesPorPote); potes.push(slice.map(t => t.time_id)); }
    abrirConfirmacao("Sortear", "Realizar sorteio?", async () => {
        const res = await sortearGrupos(campeonatoId, numPotes, potes); if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('grupos'); } else { toast.error(res.msg); }
    }, 'info')
  }
  async function handleGerarRodadas() {
     abrirConfirmacao("Gerar Jogos", "Criar confrontos?", async () => {
        const res = await gerarJogosFaseGrupos(campeonatoId); if (res.success) { toast.success(res.msg); carregarDados(); setRodadaView(1); } else { toast.error(res.msg); }
     }, 'sucesso')
  }
  async function handleAtualizarPontuacoesGrupos() {
    if (!rodadaCartolaInput) return toast.error("Informe a rodada."); setLoading(true);
    const res = await atualizarRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartolaInput));
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); } setLoading(false);
  }
  async function handleGerarMataMataCopa() {
      if (Object.keys(grupos).length === 0) return toast.error("Sem grupos.");
      abrirConfirmacao("Gerar Mata-Mata", "Classificar e cruzar?", async () => {
          const res = await gerarMataMataCopa(campeonatoId); if(res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
      }, 'sucesso')
  }
  async function handleExcluirMataMata() {
      abrirConfirmacao("Limpar Mata-Mata", "Apagar fase final?", async () => {
          const rodadaInicio = RODADAS_CORTE + 1; const res = await excluirMataMata(campeonatoId, rodadaInicio);
          if(res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
      }, 'perigo')
  }
  async function handleAtualizarPontuacoesMataMata() {
    if (!rodadaCartolaInput) return toast.error("Informe a rodada."); setLoading(true);
    const rodadaReal = Number(faseAtual) + RODADAS_CORTE;
    const res = await atualizarRodadaGrupos(campeonatoId, rodadaReal, Number(rodadaCartolaInput)); 
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); } setLoading(false);
  }
  async function handleAvancarFase() {
      const rodadaReal = Number(faseAtual) + RODADAS_CORTE;
      abrirConfirmacao("Fechar Confronto", "Próxima fase?", async () => {
          const res = await avancarFaseMataMata(campeonatoId, rodadaReal); if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
      }, 'sucesso')
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
      <ModalConfirmacao isOpen={modalOpen} titulo={modalConfig.titulo} mensagem={modalConfig.mensagem} onConfirm={modalConfig.onConfirm} onCancel={() => setModalOpen(false)} tipo={modalConfig.tipo} />

      {editingId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#121212] p-8 rounded-2xl border border-gray-800 w-96 shadow-2xl shadow-black">
                <h3 className="text-center font-bold text-white mb-6 text-xl uppercase tracking-widest">Editar Placar</h3>
                <div className="flex justify-center items-center gap-4 mb-8">
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 focus:border-yellow-600 text-4xl font-bold text-center rounded-xl outline-none transition text-white" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-2xl text-gray-600 font-bold">X</span>
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 focus:border-yellow-600 text-4xl font-bold text-center rounded-xl outline-none transition text-white" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-bold text-gray-400 transition">CANCELAR</button>
                    <button onClick={() => salvarEdicao(editingId)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-black shadow-lg shadow-yellow-900/20 transition">SALVAR</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-6 md:p-10 border-b border-white/10 bg-[#080808]">
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <Link href="/admin/ligas" className="text-gray-500 text-xs font-bold hover:text-white transition mb-2 block uppercase tracking-wider">← Voltar</Link>
                <h1 className="text-5xl font-black tracking-tighter text-white mb-2">{liga?.nome}</h1>
                <span className="text-[10px] bg-white/5 text-gray-300 border border-white/10 px-3 py-1 rounded-full uppercase font-bold tracking-widest">{liga?.tipo?.replace('_', ' ')}</span>
            </div>
            
            <div className="flex gap-2 bg-[#121212] p-1.5 rounded-xl border border-white/10">
                {liga?.tipo === 'copa' && (
                    <button onClick={() => setTabAtiva('grupos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'grupos' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Fase de Grupos</button>
                )}
                <button onClick={() => setTabAtiva('jogos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'jogos' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{liga?.tipo === 'copa' ? 'Mata-Mata' : 'Chaveamento'}</button>
                <button onClick={() => setTabAtiva('sorteio')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'sorteio' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Config</button>
                <button onClick={() => setTabAtiva('times')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'times' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Times</button>
            </div>
          </div>
      </div>

      <div className="p-6 md:p-10 max-w-[1920px] mx-auto">
        
        {/* ABA GRUPOS */}
        {tabAtiva === 'grupos' && (
            <div className="animate-fadeIn">
                {Object.keys(grupos).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 border border-white/10 border-dashed rounded-3xl bg-[#080808]">
                        <span className="text-6xl mb-4 opacity-20">🎲</span>
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Sorteio Pendente</h3>
                        <p className="text-gray-500 text-sm mb-6">Configure os potes na aba "Config" e realize o sorteio.</p>
                        <button onClick={() => setTabAtiva('sorteio')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-bold transition">Ir para Configuração</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                        
                        {/* COLUNA ESQUERDA: TABELAS (Agora ocupa 3 colunas para ser maior) */}
                        <div className="lg:col-span-3 space-y-8">
                            
                            <div className="flex justify-between items-center bg-[#121212] p-6 rounded-2xl border border-white/10 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse relative z-10"></div>
                                        <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 left-0 blur-sm"></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">Status: Fase de Grupos</span>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleSortearGrupos} className="bg-black hover:bg-gray-900 text-gray-400 border border-white/10 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition hover:text-white hover:border-white/30">Re-sortear</button>
                                    <button onClick={handleGerarRodadas} className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-green-900/20 flex items-center gap-2">
                                        <span className="text-lg">📅</span> Gerar Jogos
                                    </button>
                                </div>
                            </div>

                            {/* GRIDS DE GRUPOS - Aumentado o visual */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {Object.keys(grupos).sort().map(letra => (
                                    <div key={letra} className="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl hover:border-white/20 transition-colors">
                                        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0e0e0e] px-6 py-4 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-500 to-yellow-600"></div>
                                            <span className="text-white font-black tracking-[0.2em] text-lg flex items-center gap-2">
                                                GRUPO <span className="text-yellow-500 text-xl">{letra}</span>
                                            </span>
                                        </div>
                                        
                                        <div className="w-full">
                                            <table className="w-full text-left text-xs table-fixed">
                                                <thead className="bg-black text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                                                    <tr>
                                                        <th className="py-4 pl-4 w-[8%] text-center">#</th>
                                                        <th className="py-4 px-2 w-[30%]">Clube</th> 
                                                        <th className="py-4 text-center text-white font-black w-[10%] bg-white/[0.02]">PTS</th>
                                                        <th className="py-4 text-center w-[8%]">J</th>
                                                        <th className="py-4 text-center w-[8%]">V</th>
                                                        <th className="py-4 text-center w-[8%]">D</th>
                                                        <th className="py-4 text-center w-[10%]">GP</th>
                                                        <th className="py-4 pr-4 text-center font-bold w-[10%] text-gray-300">SG</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {grupos[letra].map((time: any, idx: number) => (
                                                        <tr key={time.id} className="group hover:bg-white/[0.03] transition duration-200">
                                                            <td className={`py-3 pl-4 text-center font-black text-sm ${idx < 2 ? 'text-green-500' : 'text-gray-600'}`}>
                                                                {idx + 1}
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <img src={time.times.escudo} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                                                                    <span className="font-bold text-gray-200 group-hover:text-white truncate block text-sm">{time.times.nome}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 text-center font-black text-white bg-white/[0.02] text-sm">{time.pts}</td>
                                                            <td className="py-3 text-center text-gray-400 font-mono">{time.pj}</td>
                                                            <td className="py-3 text-center text-gray-400 font-mono">{time.v}</td>
                                                            <td className="py-3 text-center text-gray-500 font-mono">{time.d}</td>
                                                            <td className="py-3 text-center text-gray-500 font-mono">{time.pp}</td>
                                                            <td className="py-3 pr-4 text-center font-bold text-gray-300">{time.sp}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COLUNA DIREITA: JOGOS (Fixo com scroll invisível) */}
                        <div className="lg:col-span-1">
                            {partidas.length > 0 ? (
                                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 sticky top-6 shadow-2xl h-fit max-h-[calc(100vh-100px)] flex flex-col">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span> Jogos
                                        </h3>
                                        
                                        <div className="flex items-center gap-1 bg-black p-1.5 rounded-lg border border-white/10">
                                            <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} disabled={rodadaView === 1} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition disabled:opacity-30">‹</button>
                                            <span className="text-xs font-black px-3 text-yellow-500 uppercase tracking-wider">R{rodadaView}</span>
                                            <button onClick={() => setRodadaView(r => Math.min(totalRodadasGrupos, r + 1))} disabled={rodadaView === totalRodadasGrupos} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition disabled:opacity-30">›</button>
                                        </div>
                                    </div>

                                    <div className="mb-4 bg-black/50 border border-white/10 p-3 rounded-xl flex items-center justify-between gap-2 shrink-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cartola:</span>
                                            <input type="number" placeholder="#" className="w-12 bg-[#121212] border border-white/20 rounded text-center text-xs font-bold text-white p-2 focus:border-yellow-600 outline-none transition" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                                        </div>
                                        <button onClick={handleAtualizarPontuacoesGrupos} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-900/20">
                                            {loading ? '...' : 'Atualizar'}
                                        </button>
                                    </div>

                                    {/* LISTA DE JOGOS COM SCROLLBAR OCULTA */}
                                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                        {jogosDaRodadaView.length === 0 && <p className="text-center text-gray-600 py-10 text-xs">Sem jogos nesta rodada.</p>}
                                        
                                        {jogosDaRodadaView.map((jogo: any) => (
                                            <div key={jogo.id} onClick={() => abrirEdicao(jogo)} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 hover:border-yellow-500/50 hover:bg-white/[0.02] cursor-pointer transition group relative overflow-hidden">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                    <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">GRUPO {getGrupoDoJogo(jogo.time_casa)}</span>
                                                    <span className={`text-[9px] uppercase font-black tracking-wider ${jogo.status === 'finalizado' ? 'text-green-500' : 'text-gray-600'}`}>{jogo.status === 'finalizado' ? 'FINALIZADO' : 'EDITAR'}</span>
                                                </div>
                                                
                                                <div className="flex items-center justify-between px-1 mt-1">
                                                    <div className="flex flex-col items-center gap-2 w-[35%]">
                                                        <img src={jogo.casa.escudo} className="w-10 h-10 object-contain drop-shadow-lg" />
                                                        <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center leading-tight">{jogo.casa.nome}</span>
                                                    </div>
                                                    
                                                    <div className="bg-[#0a0a0a] border border-white/10 px-3 py-1.5 rounded-lg text-lg font-black font-mono text-white group-hover:text-yellow-500 group-hover:border-yellow-500/30 transition whitespace-nowrap shadow-inner">
                                                        {jogo.placar_casa ?? '-'} <span className="text-gray-600 mx-1">:</span> {jogo.placar_visitante ?? '-'}
                                                    </div>

                                                    <div className="flex flex-col items-center gap-2 w-[35%]">
                                                        <img src={jogo.visitante.escudo} className="w-10 h-10 object-contain drop-shadow-lg" />
                                                        <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center leading-tight">{jogo.visitante.nome}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-10 border border-white/10 rounded-2xl bg-[#121212] text-gray-500 text-sm">Gere as rodadas para ver os jogos aqui.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ABA JOGOS (MATA-MATA) */}
        {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn space-y-8">
            {jogosMataMata.length === 0 ? (
                <div className="text-center py-32 border border-white/10 border-dashed rounded-3xl bg-[#080808]">
                    <p className="text-gray-500 mb-6 text-lg">A fase de grupos ainda está rolando.</p>
                    <button onClick={handleGerarMataMataCopa} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold transition text-sm uppercase tracking-widest shadow-lg shadow-yellow-900/20">⚡ Gerar Fase Final (Mata-Mata)</button>
                </div>
            ) : (
                <>
                    <div className="bg-[#121212] rounded-2xl border border-white/10 p-6 flex flex-wrap gap-6 items-end shadow-xl">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2 tracking-widest">Fase Atual</label>
                            <select className="bg-black p-4 rounded-xl w-full border border-gray-700 font-bold text-white focus:border-yellow-600 outline-none transition" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                                {fasesDisponiveisMataMata.map(f => (
                                    <option key={f} value={f}>{f % 2 !== 0 ? `Rodada ${f} (Ida)` : `Rodada ${f} (Volta)`}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3 bg-black p-2 rounded-xl border border-gray-800">
                            <span className="text-[10px] text-gray-500 font-bold uppercase pl-2">Cartola:</span>
                            <input type="number" className="w-14 bg-[#121212] border border-gray-700 rounded-lg text-center font-bold text-white p-2 focus:border-yellow-600 outline-none" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                            <button onClick={handleAtualizarPontuacoesMataMata} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold text-xs text-white uppercase tracking-wider transition">Atualizar</button>
                        </div>
                        <button onClick={handleAvancarFase} className="bg-green-600 px-8 py-3.5 rounded-xl font-bold hover:bg-green-500 transition text-xs uppercase tracking-widest text-white shadow-lg shadow-green-900/20">Fechar & Avançar ➜</button>
                        <button onClick={handleExcluirMataMata} className="text-red-500 hover:text-red-400 border border-red-900/30 hover:bg-red-900/10 px-4 py-3.5 rounded-xl transition text-xs font-bold uppercase tracking-widest">Limpar</button>
                    </div>
                    <div className="mt-10 overflow-x-auto pb-10"><MataMataBracket partidas={jogosMataMata} /></div>
                </>
            )}
        </div>
      )}

      {/* ABA SORTEIO */}
      {tabAtiva === 'sorteio' && (
        <div className="bg-[#121212] p-10 rounded-3xl border border-white/10 animate-fadeIn shadow-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Configuração de Potes</h2>
                    <p className="text-gray-500 text-sm">Defina a ordem de força (ranking) para o sorteio dos grupos.</p>
                </div>
                {liga?.tipo !== 'copa' && (
                    <button onClick={() => handleGerarComSeeds(false)} className="bg-green-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500 transition text-white">Gerar Chave</button>
                )}
            </div>
            <div className="bg-black/50 rounded-2xl border border-white/10 divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                {timesLiga.map((item, index) => (
                    <div key={item.times.id} className="grid grid-cols-12 items-center p-4 hover:bg-white/[0.02] transition">
                        <div className="col-span-1 text-center font-mono font-bold text-yellow-500">#{index + 1}</div>
                        <div className="col-span-1 flex justify-center"><img src={item.times.escudo} className="w-10 h-10 object-contain" /></div>
                        <div className="col-span-8 font-bold text-gray-200">{item.times.nome}</div>
                        <div className="col-span-2 flex gap-2 justify-end">
                            <button onClick={() => moverTime(index, -1)} disabled={index === 0} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">▲</button>
                            <button onClick={() => moverTime(index, 1)} disabled={index === timesLiga.length - 1} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">▼</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* ABA TIMES */}
      {tabAtiva === 'times' && (
        <div className="bg-[#121212] border border-white/10 p-10 rounded-3xl animate-fadeIn shadow-2xl">
            <div className="flex gap-4 mb-10">
                <div className="relative flex-1">
                    <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-white/20 p-4 rounded-xl text-left flex justify-between items-center focus:border-yellow-600 outline-none transition text-gray-300">
                        {timeSelecionadoObjeto ? (<div className="flex items-center gap-3"><img src={timeSelecionadoObjeto.escudo} className="w-6 h-6" /> <span className="font-bold">{timeSelecionadoObjeto.nome}</span></div>) : "Selecionar time para adicionar..."} 
                        <span className="text-gray-500">▼</span>
                    </button>
                    {menuAberto && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/20 rounded-xl max-h-80 overflow-y-auto z-50 shadow-2xl">
                            {timesDisponiveis.map(t => (
                                <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full p-4 hover:bg-black text-left flex gap-3 items-center border-b border-white/5 last:border-0 transition text-gray-300">
                                    <img src={t.escudo} className="w-6 h-6" /> {t.nome}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={handleAdicionarTime} disabled={!selecionadoId} className="bg-green-600 px-8 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-white uppercase tracking-widest text-xs">Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timesLiga.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-black rounded-xl border border-white/10 hover:border-white/30 transition group">
                        <div className="flex items-center gap-4">
                            <img src={item.times.escudo} className="w-10 h-10 object-contain grayscale group-hover:grayscale-0 transition" />
                            <span className="font-bold text-gray-400 group-hover:text-white transition">{item.times.nome}</span>
                        </div>
                        <button onClick={() => handleRemoverTime(item.times.id)} className="text-gray-600 hover:text-red-500 p-2 transition">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
      )}
      </div>
    </div>
  )
}