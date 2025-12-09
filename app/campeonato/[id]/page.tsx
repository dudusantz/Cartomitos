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
  excluirMataMata,
  gerarJogosPontosCorridos, atualizarRodadaPontosCorridos, buscarTabelaPontosCorridos
} from '../../actions' // Ajustado o caminho de importação
import { supabase } from '@/lib/supabase'
import MataMataBracket from '@/app/components/MataMataBracket'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // DADOS
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([]) 
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any>({}) 
  const [tabelaPontos, setTabelaPontos] = useState<any[]>([])
  
  // UI
  const [tabAtiva, setTabAtiva] = useState<string>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  // MODAIS
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ titulo: '', mensagem: '', tipo: 'info' as any, onConfirm: () => {} })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // RODADAS
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaCartolaInput, setRodadaCartolaInput] = useState('')
  const [rodadaView, setRodadaView] = useState(1)
  
  // Inputs Mata-Mata
  const [rodadaIdaCartola, setRodadaIdaCartola] = useState('')
  const [rodadaVoltaCartola, setRodadaVoltaCartola] = useState('')

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
    setTodosTimes(await listarTodosTimes())
    const jogos = await listarPartidas(campeonatoId)
    setPartidas(jogos)

    if (dadosLiga?.tipo === 'pontos_corridos') {
        const _tabela = await buscarTabelaPontosCorridos(campeonatoId)
        setTabelaPontos(_tabela)
        if (tabAtiva === 'jogos') setTabAtiva('classificacao')
    }
    else if (dadosLiga?.tipo === 'copa') {
        const _grupos = await buscarTabelaGrupos(campeonatoId)
        setGrupos(_grupos)
        if (Object.keys(_grupos).length > 0 && tabAtiva === 'jogos') {
             const temMataMata = jogos.some((j:any) => j.rodada > 30);
             if(!temMataMata) setTabAtiva('grupos');
        }
    }
  }

  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)

  // CONFIGURAÇÃO DE RODADAS
  const jogosDaRodadaView = partidas.filter(j => j.rodada === rodadaView);
  const totalRodadas = partidas.length > 0 ? Math.max(...partidas.map(p => p.rodada)) : 1;

  const RODADAS_CORTE = liga?.tipo === 'copa' ? 6 : 0; 
  const totalRodadasGrupos = RODADAS_CORTE > 0 ? RODADAS_CORTE : 6;

  const jogosMataMata = partidas
    .filter(p => p.rodada > RODADAS_CORTE)
    .map(p => ({ ...p, rodada: p.rodada - RODADAS_CORTE }));
  
  const fasesDisponiveisMataMata = [...new Set(jogosMataMata.map(p => p.rodada))].sort((a, b) => a - b);
  const fasesIdaParaSelect = fasesDisponiveisMataMata.filter(r => r % 2 !== 0);

  function getGrupoDoJogo(timeId: number) {
    if (liga?.tipo === 'pontos_corridos') return '-';
    const time = timesLiga.find(t => t.time_id === timeId);
    return time?.grupo || '?';
  }

  function isFaseJogoUnico(fase: number) {
      const temVolta = fasesDisponiveisMataMata.includes(fase + 1);
      return !temVolta;
  }

  // --- AÇÕES ---
  function moverTime(index: number, direcao: number) {
    const novaLista = [...timesLiga]; const itemMovido = novaLista[index];
    novaLista.splice(index, 1); novaLista.splice(index + direcao, 0, itemMovido);
    setTimesLiga(novaLista);
  }
  async function handleAdicionarTime() {
    if (!selecionadoId) return
    await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    setSelecionadoId(''); carregarDados(); toast.success("Adicionado!");
  }
  async function handleRemoverTime(timeId: number) {
    abrirConfirmacao("Remover", "Confirma?", async () => {
        await removerTimeDaLiga(campeonatoId, timeId); carregarDados(); toast.success("Removido")
    }, 'perigo')
  }
  async function handleZerarTudo() {
    abrirConfirmacao("Resetar", "Apagar tudo?", async () => {
        await zerarJogos(campeonatoId); carregarDados(); setGrupos({}); setTabelaPontos([]); toast.success("Liga resetada.")
    }, 'perigo')
  }
  async function salvarEdicao(jogoId: number) {
    await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    setEditingId(null); carregarDados(); toast.success("Salvo!")
  }
  function abrirEdicao(jogo: any) {
    setEditingId(jogo.id); setTempCasa(String(jogo.placar_casa ?? 0)); setTempVisitante(String(jogo.placar_visitante ?? 0))
  }

  // Ações Pontos Corridos
  async function handleGerarPontosCorridos() {
      if (timesLiga.length < 2) return toast.error("Adicione mais times.");
      abrirConfirmacao("Gerar Tabela", "Criar todos contra todos (Ida e Volta)?", async () => {
          const res = await gerarJogosPontosCorridos(campeonatoId);
          if (res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg);
      }, 'sucesso')
  }
  async function handleAtualizarRodadaPontosCorridos() {
      if (!rodadaCartolaInput) return toast.error("Informe a rodada.");
      setLoading(true);
      const res = await atualizarRodadaPontosCorridos(campeonatoId, rodadaView, Number(rodadaCartolaInput));
      if (res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg);
      setLoading(false);
  }

  // Ações Copa/Mata-Mata
  async function handleSortearGrupos() { 
      const numPotes = 4; const timesPorPote = Math.ceil(timesLiga.length / numPotes);
      const potes = []; for (let i = 0; i < numPotes; i++) { const slice = timesLiga.slice(i * timesPorPote, (i + 1) * timesPorPote); potes.push(slice.map(t => t.time_id)); }
      await sortearGrupos(campeonatoId, numPotes, potes); carregarDados(); setTabAtiva('grupos');
  }
  async function handleGerarRodadas() { await gerarJogosFaseGrupos(campeonatoId); carregarDados(); setRodadaView(1); }
  async function handleAtualizarPontuacoesGrupos() { await atualizarRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartolaInput)); carregarDados(); }
  async function handleGerarMataMataCopa() { await gerarMataMataCopa(campeonatoId); carregarDados(); }
  async function handleExcluirMataMata() { await excluirMataMata(campeonatoId, RODADAS_CORTE + 1); carregarDados(); }
  
  async function handleAtualizarPontuacoesMataMata() {
    const jogoUnico = isFaseJogoUnico(Number(faseAtual));
    if (!rodadaIdaCartola && !rodadaVoltaCartola) return toast.error("Informe a rodada do Cartola."); 
    setLoading(true);
    const rodadaLigaIda = Number(faseAtual) + RODADAS_CORTE;
    const rVolta = jogoUnico ? 0 : Number(rodadaVoltaCartola);
    const res = await atualizarRodadaMataMata(campeonatoId, rodadaLigaIda, Number(rodadaIdaCartola), rVolta); 
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); } 
    setLoading(false);
  }
  
  async function handleAvancarFase() {
      const rodadaReal = Number(faseAtual) + RODADAS_CORTE;
      abrirConfirmacao("Fechar Confronto", "Próxima fase?", async () => {
          const res = await avancarFaseMataMata(campeonatoId, rodadaReal); if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
      }, 'sucesso')
  }
  async function handleGerarComSeeds(aleatorio = false) { 
      const ids = aleatorio ? [] : timesLiga.map(t => t.time_id);
      await gerarMataMataInteligente(campeonatoId, ids, aleatorio); carregarDados(); setTabAtiva('jogos');
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
      <ModalConfirmacao isOpen={modalOpen} titulo={modalConfig.titulo} mensagem={modalConfig.mensagem} onConfirm={modalConfig.onConfirm} onCancel={() => setModalOpen(false)} tipo={modalConfig.tipo} />

      {editingId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#121212] p-8 rounded-2xl border border-gray-800 w-96 shadow-2xl shadow-black">
                <h3 className="text-center font-bold text-white mb-6 uppercase">Editar Placar</h3>
                <div className="flex justify-center items-center gap-4 mb-8">
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 text-4xl font-bold text-center rounded-xl text-white" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-2xl text-gray-600 font-bold">X</span>
                    <input type="number" className="w-20 h-20 bg-black border border-gray-700 text-4xl font-bold text-center rounded-xl text-white" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-bold text-gray-400 transition">CANCELAR</button>
                    <button onClick={() => salvarEdicao(editingId)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-black shadow-lg shadow-yellow-900/20 transition">SALVAR</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-6 md:p-10 border-b border-gray-800 bg-[#080808]">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <Link href="/admin/ligas" className="text-gray-500 text-xs font-bold hover:text-white transition mb-2 block uppercase tracking-wider">← Voltar</Link>
                <h1 className="text-5xl font-black tracking-tighter text-white mb-2">{liga?.nome}</h1>
                <span className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1 rounded-full uppercase font-bold tracking-widest">{liga?.tipo?.replace('_', ' ')}</span>
            </div>
            
            <div className="flex gap-2 bg-[#121212] p-1.5 rounded-xl border border-gray-800">
                {liga?.tipo === 'pontos_corridos' ? (
                    <button onClick={() => setTabAtiva('classificacao')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'classificacao' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>Classificação & Jogos</button>
                ) : (
                    <>
                        {liga?.tipo === 'copa' && <button onClick={() => setTabAtiva('grupos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'grupos' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}>Fase de Grupos</button>}
                        <button onClick={() => setTabAtiva('jogos')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'jogos' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}>{liga?.tipo === 'copa' ? 'Mata-Mata' : 'Chaveamento'}</button>
                        <button onClick={() => setTabAtiva('sorteio')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'sorteio' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}>Config</button>
                    </>
                )}
                <button onClick={() => setTabAtiva('times')} className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${tabAtiva === 'times' ? 'bg-yellow-600 text-black' : 'text-gray-500 hover:text-white'}`}>Times</button>
            </div>
          </div>
      </div>

      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        
        {/* ABA PONTOS CORRIDOS */}
        {tabAtiva === 'classificacao' && liga?.tipo === 'pontos_corridos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center bg-[#121212] p-5 rounded-2xl border border-gray-800">
                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">Tabela Oficial</h3>
                        <div className="flex gap-2">
                            {partidas.length === 0 && <button onClick={handleGerarPontosCorridos} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Gerar Tabela</button>}
                            <button onClick={handleZerarTudo} className="text-red-500 hover:bg-red-900/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Resetar</button>
                        </div>
                    </div>
                    <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black text-gray-500 uppercase font-bold border-b border-gray-800">
                                <tr>
                                    <th className="py-3 pl-4 text-center">Pos</th>
                                    <th className="py-3">Clube</th>
                                    <th className="py-3 text-center">PTS</th>
                                    <th className="py-3 text-center text-gray-600">J</th>
                                    <th className="py-3 text-center text-gray-600">V</th>
                                    <th className="py-3 text-center text-gray-600">E</th>
                                    <th className="py-3 text-center text-gray-600">D</th>
                                    <th className="py-3 text-center text-gray-600">SG</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tabelaPontos.map((time, idx) => (
                                    <tr key={time.id} className="hover:bg-white/5 transition">
                                        <td className={`py-3 pl-4 text-center font-bold ${idx < 4 ? 'text-blue-400' : 'text-gray-500'}`}>{idx + 1}</td>
                                        <td className="py-3 flex items-center gap-3">
                                            <img src={time.times.escudo} className="w-6 h-6 object-contain" />
                                            <span className="font-bold text-gray-300">{time.times.nome}</span>
                                        </td>
                                        <td className="py-3 text-center font-black text-white bg-white/5">{time.pts}</td>
                                        <td className="py-3 text-center text-gray-500">{time.pj}</td>
                                        <td className="py-3 text-center text-gray-500">{time.v}</td>
                                        <td className="py-3 text-center text-gray-500">{time.e}</td>
                                        <td className="py-3 text-center text-gray-500">{time.d}</td>
                                        <td className="py-3 text-center text-gray-500 font-bold">{time.sg}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tabelaPontos.length === 0 && <div className="p-10 text-center text-gray-600">Gere a tabela para começar.</div>}
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5 sticky top-6">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Jogos</h3>
                            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                                <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded">‹</button>
                                <span className="text-xs font-bold px-3 text-blue-500 uppercase">R{rodadaView}</span>
                                <button onClick={() => setRodadaView(r => Math.min(totalRodadas, r + 1))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded">›</button>
                            </div>
                        </div>
                        <div className="mb-4 bg-black border border-gray-800 p-3 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Cartola:</span>
                                <input type="number" className="w-12 bg-[#121212] border border-gray-700 rounded text-center text-xs font-bold text-white p-1.5 focus:border-blue-600 outline-none" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                            </div>
                            <button onClick={handleAtualizarRodadaPontosCorridos} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition">
                                {loading ? '...' : 'Atualizar'}
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {jogosDaRodadaView.length === 0 && <p className="text-center text-gray-600 text-xs py-4">Sem jogos.</p>}
                            {jogosDaRodadaView.map(jogo => (
                                <div key={jogo.id} onClick={() => abrirEdicao(jogo)} className="bg-black border border-gray-800 p-3 rounded-xl flex flex-col gap-2 hover:border-blue-500/50 cursor-pointer transition">
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2 w-[40%]">
                                            <img src={jogo.casa.escudo} className="w-6 h-6 object-contain" />
                                            <span className="text-[10px] font-bold text-gray-300 truncate">{jogo.casa.nome}</span>
                                        </div>
                                        <div className="bg-[#121212] border border-gray-800 px-2 py-1 rounded text-xs font-mono font-bold text-white whitespace-nowrap">
                                            {jogo.placar_casa ?? '-'} : {jogo.placar_visitante ?? '-'}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 w-[40%]">
                                            <span className="text-[10px] font-bold text-gray-300 truncate text-right">{jogo.visitante.nome}</span>
                                            <img src={jogo.visitante.escudo} className="w-6 h-6 object-contain" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ABA GRUPOS (COPA) */}
        {tabAtiva === 'grupos' && liga?.tipo === 'copa' && (
            <div className="animate-fadeIn">
                {Object.keys(grupos).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 border border-gray-800 border-dashed rounded-3xl bg-[#080808]">
                        <span className="text-6xl mb-4 opacity-20">🎲</span>
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Sorteio Pendente</h3>
                        <p className="text-gray-500 text-sm mb-6">Configure os potes na aba "Config" e realize o sorteio.</p>
                        <button onClick={() => setTabAtiva('sorteio')} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold transition">Ir para Configuração</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex justify-between items-center bg-[#121212] p-5 rounded-2xl border border-gray-800 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status: Em Andamento</span>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleSortearGrupos} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition">Re-sortear</button>
                                    <button onClick={handleGerarRodadas} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-green-900/20 flex items-center gap-2">Gerar Jogos</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {Object.keys(grupos).sort().map(letra => (
                                    <div key={letra} className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 font-black text-center border-b border-gray-700">
                                            <span className="text-cartola-gold tracking-[0.2em] text-sm">GRUPO {letra}</span>
                                        </div>
                                        <div className="w-full overflow-hidden">
                                            <table className="w-full text-left text-[10px] table-fixed">
                                                <thead className="bg-black/40 text-gray-500 uppercase font-bold tracking-wider border-b border-gray-800">
                                                    <tr>
                                                        <th className="py-2 text-center w-[5%]">#</th>
                                                        <th className="py-2 px-1 w-[22%]">Time</th> 
                                                        <th className="py-2 text-center text-white font-extrabold w-[8%]">PTS</th>
                                                        <th className="py-2 text-center w-[6%]">J</th>
                                                        <th className="py-2 text-center w-[6%]">V</th>
                                                        <th className="py-2 text-center w-[6%]">E</th>
                                                        <th className="py-2 text-center w-[6%]">D</th>
                                                        <th className="py-2 text-center w-[8%]">PP</th>
                                                        <th className="py-2 text-center w-[8%]">PC</th>
                                                        <th className="py-2 text-center font-bold w-[10%] text-gray-300">SP</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {grupos[letra].map((time: any, idx: number) => (
                                                        <tr key={time.id} className="hover:bg-white/5 transition group">
                                                            <td className={`py-2 text-center font-black ${idx < 2 ? 'text-green-500' : 'text-gray-600'}`}>{idx + 1}</td>
                                                            <td className="py-2 px-1">
                                                                <div className="flex items-center gap-1 overflow-hidden">
                                                                    <img src={time.times.escudo} className="w-5 h-5 object-contain shrink-0" />
                                                                    <span className="font-bold text-gray-200 truncate block">{time.times.nome}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 text-center font-black text-white bg-white/5">{time.pts}</td>
                                                            <td className="py-2 text-center text-gray-400">{time.pj}</td>
                                                            <td className="py-2 text-center text-gray-400">{time.v}</td>
                                                            <td className="py-2 text-center text-gray-500">{time.e}</td>
                                                            <td className="py-2 text-center text-gray-500">{time.d}</td>
                                                            <td className="py-2 text-center text-gray-500 font-mono">{time.pp}</td>
                                                            <td className="py-2 text-center text-gray-500 font-mono">{time.pc}</td>
                                                            <td className="py-2 text-center font-bold text-gray-300">{time.sp}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            {partidas.length > 0 ? (
                                <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5 sticky top-6 shadow-xl">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Jogos
                                        </h3>
                                        <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
                                            <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} disabled={rodadaView === 1} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">‹</button>
                                            <span className="text-[10px] font-bold px-3 text-yellow-500 uppercase tracking-wider">R{rodadaView}</span>
                                            <button onClick={() => setRodadaView(r => Math.min(totalRodadasGrupos, r + 1))} disabled={rodadaView === totalRodadasGrupos} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30">›</button>
                                        </div>
                                    </div>
                                    <div className="mb-4 bg-black border border-gray-800 p-3 rounded-xl flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cartola:</span>
                                            <input type="number" placeholder="#" className="w-12 bg-[#121212] border border-gray-700 rounded text-center text-xs font-bold text-white p-1.5 focus:border-yellow-600 outline-none transition" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                                        </div>
                                        <button onClick={handleAtualizarPontuacoesGrupos} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-900/20">
                                            {loading ? '...' : 'Atualizar'}
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {jogosDaRodadaView.map((jogo: any) => (
                                            <div key={jogo.id} onClick={() => abrirEdicao(jogo)} className="bg-black border border-gray-800 p-3 rounded-xl flex flex-col gap-3 hover:border-yellow-600/50 cursor-pointer transition group relative overflow-hidden">
                                                <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                                                    <span className="text-[9px] font-bold text-gray-500 bg-[#121212] px-2 py-0.5 rounded border border-gray-800">GRUPO {getGrupoDoJogo(jogo.time_casa)}</span>
                                                    <span className={`text-[8px] uppercase font-bold tracking-wider ${jogo.status === 'finalizado' ? 'text-green-500' : 'text-gray-600'}`}>{jogo.status === 'finalizado' ? 'FINALIZADO' : 'EDITAR'}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex flex-col items-center gap-1 w-[35%]">
                                                        <img src={jogo.casa.escudo} className="w-8 h-8 object-contain" />
                                                        <span className="text-[9px] font-bold text-gray-400 truncate w-full text-center">{jogo.casa.nome}</span>
                                                    </div>
                                                    <div className="bg-[#121212] border border-gray-800 px-3 py-1 rounded-lg text-sm font-black font-mono text-white group-hover:text-yellow-500 transition whitespace-nowrap shadow-inner">
                                                        {jogo.placar_casa ?? '-'} <span className="text-gray-600 mx-1">:</span> {jogo.placar_visitante ?? '-'}
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1 w-[35%]">
                                                        <img src={jogo.visitante.escudo} className="w-8 h-8 object-contain" />
                                                        <span className="text-[9px] font-bold text-gray-400 truncate w-full text-center">{jogo.visitante.nome}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-10 border border-gray-800 rounded-2xl bg-[#121212] text-gray-500 text-sm">Gere as rodadas para ver os jogos aqui.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ABA JOGOS (MATA-MATA) */}
        {tabAtiva === 'jogos' && liga?.tipo !== 'pontos_corridos' && (
            <div className="animate-fadeIn space-y-8">
                {jogosMataMata.length === 0 ? (
                    <div className="text-center py-32 border border-gray-800 border-dashed rounded-3xl bg-[#080808]">
                        <p className="text-gray-500 mb-6 text-lg">A fase de grupos ainda está rolando.</p>
                        <button onClick={handleGerarMataMataCopa} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold transition text-sm uppercase tracking-widest shadow-lg shadow-yellow-900/20">⚡ Gerar Fase Final (Mata-Mata)</button>
                    </div>
                ) : (
                    <>
                        <div className="bg-[#121212] rounded-2xl border border-gray-800 p-6 flex flex-wrap gap-6 items-end shadow-xl">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2 tracking-widest">Fase Atual</label>
                                <select className="bg-black p-4 rounded-xl w-full border border-gray-700 font-bold text-white focus:border-yellow-600 outline-none transition" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                                    {fasesDisponiveisMataMata.map(f => (
                                        <option key={f} value={f}>{f % 2 !== 0 ? `Rodada ${f} (Ida)` : `Rodada ${f} (Volta)`}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end gap-3 bg-black p-2 rounded-xl border border-gray-800">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase pl-1">
                                      {isFaseJogoUnico(Number(faseAtual)) ? 'Cartola (Jogo Único)' : 'Cartola (Ida)'}
                                    </span>
                                    <input type="number" placeholder="#" className="w-16 bg-[#121212] border border-gray-700 rounded-lg text-center font-bold text-white p-2 focus:border-yellow-600 outline-none" value={rodadaIdaCartola} onChange={e => setRodadaIdaCartola(e.target.value)} />
                                </div>
                                {!isFaseJogoUnico(Number(faseAtual)) && (
                                  <div className="flex flex-col gap-1">
                                      <span className="text-[9px] text-gray-500 font-bold uppercase pl-1">Rodada Volta</span>
                                      <input type="number" placeholder="#" className="w-16 bg-[#121212] border border-gray-700 rounded-lg text-center font-bold text-white p-2 focus:border-yellow-600 outline-none" value={rodadaVoltaCartola} onChange={e => setRodadaVoltaCartola(e.target.value)} />
                                  </div>
                                )}
                                <button onClick={handleAtualizarPontuacoesMataMata} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 h-[42px] rounded-lg font-bold text-xs text-white uppercase tracking-wider transition">Atualizar</button>
                            </div>
                            <button onClick={handleAvancarFase} className="bg-green-600 px-8 py-3.5 rounded-xl font-bold hover:bg-green-500 transition text-xs uppercase tracking-widest text-white shadow-lg shadow-green-900/20">Fechar & Avançar ➜</button>
                            <button onClick={handleExcluirMataMata} className="text-red-500 hover:text-red-400 border border-red-900/30 hover:bg-red-900/10 px-4 py-3.5 rounded-xl transition text-xs font-bold uppercase tracking-widest">Limpar</button>
                        </div>
                        <div className="mt-10 overflow-x-auto pb-10"><MataMataBracket partidas={jogosMataMata} /></div>
                    </>
                )}
            </div>
        )}

        {/* ABA CONFIG */}
        {tabAtiva === 'sorteio' && (
            <div className="bg-[#121212] p-10 rounded-3xl border border-gray-800 animate-fadeIn shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Configuração de Potes</h2>
                        <p className="text-gray-500 text-sm">Defina a ordem de força para o sorteio.</p>
                    </div>
                    {liga?.tipo !== 'copa' && (
                        <button onClick={() => handleGerarComSeeds(false)} className="bg-green-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500 transition text-white">Gerar Chave</button>
                    )}
                </div>
                <div className="bg-black/50 rounded-2xl border border-gray-800 divide-y divide-gray-800 max-h-[600px] overflow-y-auto custom-scrollbar">
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
            <div className="bg-[#121212] border border-gray-800 p-10 rounded-3xl animate-fadeIn shadow-2xl">
                <div className="flex gap-4 mb-10">
                    <div className="relative flex-1">
                        <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 p-4 rounded-xl text-left flex justify-between items-center focus:border-yellow-600 outline-none transition text-gray-300">
                            {timeSelecionadoObjeto ? (<div className="flex items-center gap-3"><img src={timeSelecionadoObjeto.escudo} className="w-6 h-6" /> <span className="font-bold">{timeSelecionadoObjeto.nome}</span></div>) : "Selecionar time para adicionar..."} 
                            <span className="text-gray-500">▼</span>
                        </button>
                        {menuAberto && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-gray-700 rounded-xl max-h-80 overflow-y-auto z-50 shadow-2xl">
                                {timesDisponiveis.map(t => (
                                    <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full p-4 hover:bg-black text-left flex gap-3 items-center border-b border-gray-800 last:border-0 transition text-gray-300">
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
                        <div key={item.id} className="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800 hover:border-gray-600 transition group">
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