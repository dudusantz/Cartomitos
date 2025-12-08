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
  
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([]) 
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any>({}) 
  const [numGrupos, setNumGrupos] = useState(4)

  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'times' | 'sorteio' | 'grupos'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ titulo: '', mensagem: '', tipo: 'info' as any, onConfirm: () => {} })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

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

  function moverTime(index: number, direcao: number) {
    const novaLista = [...timesLiga];
    const itemMovido = novaLista[index];
    novaLista.splice(index, 1);
    novaLista.splice(index + direcao, 0, itemMovido);
    setTimesLiga(novaLista);
  }
  async function handleAdicionarTime() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { setSelecionadoId(''); carregarDados(); toast.success("Adicionado!"); }
  }
  async function handleRemoverTime(timeId: number) {
    abrirConfirmacao("Remover Time", "Confirma?", async () => {
        const res = await removerTimeDaLiga(campeonatoId, timeId)
        if (res.success) { carregarDados(); toast.success("Removido") }
    }, 'perigo')
  }
  async function handleZerarTudo() {
    abrirConfirmacao("Resetar Liga", "Apagar TUDO?", async () => {
        await zerarJogos(campeonatoId)
        carregarDados()
        setGrupos({}) 
        toast.success("Liga resetada.")
    }, 'perigo')
  }
  async function salvarEdicao(jogoId: number) {
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Salvo!") }
  }
  function abrirEdicao(jogo: any) {
    setEditingId(jogo.id)
    setTempCasa(String(jogo.placar_casa ?? 0))
    setTempVisitante(String(jogo.placar_visitante ?? 0))
  }
  async function handleGerarComSeeds(aleatorio = false) {
    abrirConfirmacao("Gerar Chave", "Gerar?", async () => {
        const idsOrdenados = aleatorio ? [] : timesLiga.map(t => t.time_id); 
        const res = await gerarMataMataInteligente(campeonatoId, idsOrdenados, aleatorio);
        if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('jogos'); } else { toast.error(res.msg); }
    }, 'perigo')
  }
  async function handleAtualizarRodada() {
    toast.loading("Atualizando...")
    const res = await atualizarRodadaMataMata(campeonatoId, Number(faseAtual), Number(rodadaIda), Number(rodadaVolta))
    toast.dismiss()
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
  }

  async function handleSortearGrupos() {
    if (timesLiga.length === 0) return toast.error("Adicione times antes de sortear!");
    const numPotes = 4; 
    const timesPorPote = Math.ceil(timesLiga.length / numPotes);
    const potes = [];
    for (let i = 0; i < numPotes; i++) {
        const slice = timesLiga.slice(i * timesPorPote, (i + 1) * timesPorPote);
        potes.push(slice.map(t => t.time_id));
    }

    abrirConfirmacao("Sortear Grupos", "Distribuir times?", async () => {
        const res = await sortearGrupos(campeonatoId, numPotes, potes);
        if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('grupos'); } else { toast.error(res.msg); }
    }, 'info')
  }

  async function handleGerarRodadas() {
     abrirConfirmacao("Gerar Rodadas", "Criar confrontos?", async () => {
        const res = await gerarJogosFaseGrupos(campeonatoId);
        if (res.success) { toast.success(res.msg); carregarDados(); setRodadaView(1); } else { toast.error(res.msg); }
     }, 'sucesso')
  }

  async function handleAtualizarPontuacoesGrupos() {
    if (!rodadaCartolaInput) return toast.error("Informe a rodada.");
    setLoading(true);
    const res = await atualizarRodadaGrupos(campeonatoId, rodadaView, Number(rodadaCartolaInput));
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
    setLoading(false);
  }

  async function handleGerarMataMataCopa() {
      const gruposKeys = Object.keys(grupos);
      if (gruposKeys.length === 0) return toast.error("Sem grupos.");
      
      abrirConfirmacao(
          "Gerar Mata-Mata",
          "Isso cruzará os 1º vs 2º de cada grupo.",
          async () => {
              const res = await gerarMataMataCopa(campeonatoId);
              if(res.success) { toast.success(res.msg); carregarDados(); } 
              else { toast.error(res.msg); }
          },
          'sucesso'
      )
  }

  async function handleExcluirMataMata() {
      abrirConfirmacao("Limpar Mata-Mata", "Apagar jogos da fase final? Grupos serão mantidos.", async () => {
          // Calcula onde começa o mata-mata
          const rodadaInicio = RODADAS_CORTE + 1;
          const res = await excluirMataMata(campeonatoId, rodadaInicio);
          if(res.success) { toast.success(res.msg); carregarDados(); } 
          else { toast.error(res.msg); }
      }, 'perigo')
  }

  async function handleAtualizarPontuacoesMataMata() {
    if (!rodadaCartolaInput) return toast.error("Informe a rodada.");
    setLoading(true);
    const rodadaReal = Number(faseAtual) + RODADAS_CORTE;
    const res = await atualizarRodadaGrupos(campeonatoId, rodadaReal, Number(rodadaCartolaInput)); 
    if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
    setLoading(false);
  }

  async function handleAvancarFase() {
      const rodadaReal = Number(faseAtual) + RODADAS_CORTE;
      abrirConfirmacao("Fechar Confronto", "Gerar próxima fase?", async () => {
          const res = await avancarFaseMataMata(campeonatoId, rodadaReal);
          if (res.success) { toast.success(res.msg); carregarDados(); } else { toast.error(res.msg); }
      }, 'sucesso')
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto text-white pb-20 font-sans min-h-screen bg-[#0a0a0a]">
      <ModalConfirmacao isOpen={modalOpen} titulo={modalConfig.titulo} mensagem={modalConfig.mensagem} onConfirm={modalConfig.onConfirm} onCancel={() => setModalOpen(false)} tipo={modalConfig.tipo} />

      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 w-96 shadow-2xl">
                <h3 className="text-center font-bold text-white mb-6 text-xl">Editar Placar</h3>
                <div className="flex justify-center items-center gap-4 mb-8">
                    <input type="number" className="w-20 h-20 bg-black border border-gray-600 focus:border-blue-500 text-4xl font-bold text-center rounded-xl outline-none transition" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                    <span className="text-2xl text-gray-500 font-bold">X</span>
                    <input type="number" className="w-20 h-20 bg-black border border-gray-600 focus:border-blue-500 text-4xl font-bold text-center rounded-xl outline-none transition" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-bold text-gray-300 transition">Cancelar</button>
                    <button onClick={() => salvarEdicao(editingId)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold text-white shadow-lg transition">Salvar</button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <Link href="/admin/ligas" className="text-gray-500 text-xs mb-1 block hover:text-white transition">← Voltar</Link>
          <h1 className="text-4xl font-extrabold tracking-tight">{liga?.nome}</h1>
          <span className="text-xs bg-blue-900/50 text-blue-200 border border-blue-800 px-2 py-1 rounded uppercase font-bold tracking-wider mt-2 inline-block">{liga?.tipo?.replace('_', ' ')}</span>
        </div>
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-800">
           {liga?.tipo === 'copa' && (
             <button onClick={() => setTabAtiva('grupos')} className={`px-4 py-2 rounded-md font-bold text-xs transition ${tabAtiva === 'grupos' ? 'bg-yellow-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                Fase de Grupos
             </button>
           )}
           <button onClick={() => setTabAtiva('jogos')} className={`px-4 py-2 rounded-md font-bold text-xs transition ${tabAtiva === 'jogos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                {liga?.tipo === 'copa' ? 'Mata-Mata' : 'Chaveamento'}
           </button>
           <button onClick={() => setTabAtiva('sorteio')} className={`px-4 py-2 rounded-md font-bold text-xs transition ${tabAtiva === 'sorteio' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                Ranking/Potes
           </button>
           <button onClick={() => setTabAtiva('times')} className={`px-4 py-2 rounded-md font-bold text-xs transition ${tabAtiva === 'times' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                Participantes
           </button>
        </div>
      </div>

      {tabAtiva === 'grupos' && (
        <div className="animate-fadeIn">
            {Object.keys(grupos).length === 0 ? (
                <div className="text-center py-24 border border-gray-800 border-dashed rounded-2xl bg-[#111]">
                    <div className="text-4xl mb-4">🎲</div>
                    <p className="text-gray-400 font-bold mb-2">Nenhum grupo sorteado.</p>
                    <p className="text-gray-600 text-sm">Configure os times na aba "Ranking/Potes" e clique em "Sortear Grupos" abaixo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-wrap justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase de Grupos Ativa</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSortearGrupos} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg font-bold text-xs transition">
                                    🔄 Re-sortear
                                </button>
                                <button onClick={handleGerarRodadas} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-xs transition shadow-lg shadow-green-900/20 flex items-center gap-2">
                                    📅 Gerar Rodadas
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {Object.keys(grupos).sort().map(letra => (
                                <div key={letra} className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 font-black text-center border-b border-gray-700">
                                        <span className="text-cartola-gold tracking-[0.2em] text-sm">GRUPO {letra}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[10px] md:text-xs">
                                            <thead className="bg-black/40 text-gray-500 uppercase font-bold tracking-wider border-b border-gray-800">
                                                <tr>
                                                    <th className="p-3 w-8 text-center">#</th>
                                                    <th className="p-3 min-w-[120px]">Time</th> 
                                                    <th className="p-3 text-center text-white font-extrabold" title="Pontos">PTS</th>
                                                    <th className="p-3 text-center" title="Jogos">J</th>
                                                    <th className="p-3 text-center" title="Vitórias">V</th>
                                                    <th className="p-3 text-center" title="Empates">E</th>
                                                    <th className="p-3 text-center" title="Derrotas">D</th>
                                                    <th className="p-3 text-center" title="Pontos Pró">PP</th>
                                                    <th className="p-3 text-center" title="Pontos Contra">PC</th>
                                                    <th className="p-3 text-center font-bold" title="Saldo de Pontos">SP</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {grupos[letra].map((time: any, idx: number) => (
                                                    <tr key={time.id} className="hover:bg-white/5 transition group">
                                                        <td className={`p-3 text-center font-black ${idx < 2 ? 'text-green-500' : 'text-gray-600'}`}>
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-3 flex items-center gap-2">
                                                            <img src={time.times.escudo} className="w-6 h-6 object-contain shrink-0" />
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-200 leading-tight whitespace-normal">{time.times.nome}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center font-black text-white bg-white/5">{time.pts}</td>
                                                        <td className="p-3 text-center text-gray-400">{time.pj}</td>
                                                        <td className="p-3 text-center text-gray-400">{time.v}</td>
                                                        <td className="p-3 text-center text-gray-500">{time.e}</td>
                                                        <td className="p-3 text-center text-gray-500">{time.d}</td>
                                                        <td className="p-3 text-center text-gray-500 font-mono">{time.pp}</td>
                                                        <td className="p-3 text-center text-gray-500 font-mono">{time.pc}</td>
                                                        <td className="p-3 text-center font-bold text-gray-300">{time.sp}</td>
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
                            <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">⚽ Jogos</h3>
                                    <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-700">
                                        <button onClick={() => setRodadaView(r => Math.max(1, r - 1))} disabled={rodadaView === 1} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30 text-xs">‹</button>
                                        <span className="text-[10px] font-bold px-2 text-cartola-gold uppercase tracking-wider">Rodada {rodadaView}</span>
                                        <button onClick={() => setRodadaView(r => Math.min(totalRodadasGrupos, r + 1))} disabled={rodadaView === totalRodadasGrupos} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30 text-xs">›</button>
                                    </div>
                                </div>
                                <div className="mb-4 bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Cartola R:</span>
                                        <input type="number" placeholder="#" className="w-10 bg-black border border-gray-700 rounded text-center text-xs font-bold text-white p-1 focus:border-blue-500 outline-none" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                                    </div>
                                    <button onClick={handleAtualizarPontuacoesGrupos} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded transition disabled:opacity-50">
                                        {loading ? '...' : 'Atualizar'}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {jogosDaRodadaView.length === 0 && <p className="text-center text-gray-500 py-4 text-xs">Sem jogos nesta rodada.</p>}
                                    {jogosDaRodadaView.map((jogo: any) => (
                                        <div key={jogo.id} onClick={() => abrirEdicao(jogo)} className="bg-black border border-gray-800 p-3 rounded-lg flex flex-col gap-2 hover:border-blue-500 cursor-pointer transition group">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded">GRUPO {getGrupoDoJogo(jogo.time_casa)}</span>
                                                <span className="text-[8px] text-gray-500 uppercase font-bold">{jogo.status === 'finalizado' ? 'FIM' : 'EDITAR'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 w-[45%] overflow-hidden"><img src={jogo.casa.escudo} className="w-5 h-5 object-contain shrink-0" /><span className="text-[10px] font-bold text-gray-300 truncate leading-tight">{jogo.casa.nome}</span></div>
                                                <div className="bg-gray-900 px-2 py-1 rounded text-xs font-bold font-mono text-white group-hover:text-blue-400 transition whitespace-nowrap min-w-[30px] text-center">{jogo.placar_casa ?? '-'} <span className="text-gray-600">:</span> {jogo.placar_visitante ?? '-'}</div>
                                                <div className="flex items-center gap-2 w-[45%] justify-end overflow-hidden"><span className="text-[10px] font-bold text-gray-300 truncate text-right leading-tight">{jogo.visitante.nome}</span><img src={jogo.visitante.escudo} className="w-5 h-5 object-contain shrink-0" /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-6 border border-gray-800 rounded-xl bg-[#111] text-gray-500 text-sm">Gere as rodadas para ver os jogos aqui.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn space-y-8">
            {jogosMataMata.length === 0 ? (
                <div className="text-center py-20 border border-gray-800 border-dashed rounded-2xl bg-[#111]">
                    <p className="text-gray-500 mb-4">A fase de grupos ainda está rolando ou não foi gerada a fase final.</p>
                    <button onClick={handleGerarMataMataCopa} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition">
                        ⚡ Gerar Fase Final (Mata-Mata)
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 flex flex-wrap gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Rodada do Mata-Mata</label>
                            <select className="bg-black p-3 rounded-lg w-full border border-gray-700 font-bold text-white focus:border-blue-500 outline-none" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                                {fasesDisponiveisMataMata.map(f => (
                                    <option key={f} value={f}>{f % 2 !== 0 ? `Rodada ${f} (Ida)` : `Rodada ${f} (Volta)`}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Cartola R:</span>
                            <input type="number" className="w-12 bg-black border border-gray-700 rounded text-center font-bold text-white p-2" value={rodadaCartolaInput} onChange={e => setRodadaCartolaInput(e.target.value)} />
                            <button onClick={handleAtualizarPontuacoesMataMata} disabled={loading} className="bg-blue-600 px-4 py-2 rounded font-bold text-xs hover:bg-blue-500">Atualizar</button>
                        </div>
                        <button onClick={handleAvancarFase} className="bg-green-600 px-6 py-3 rounded-lg font-bold hover:bg-green-500 transition text-sm">Fechar Confronto & Avançar ➜</button>
                        <button onClick={handleExcluirMataMata} className="text-red-500 hover:text-red-400 border border-red-900/30 hover:border-red-500 px-4 py-2 rounded-lg transition text-xs">Limpar Mata-Mata</button>
                    </div>
                    <div className="mt-8 overflow-x-auto"><MataMataBracket partidas={jogosMataMata} /></div>
                </>
            )}
        </div>
      )}

      {tabAtiva === 'sorteio' && (
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 animate-fadeIn">
            <div className="flex justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">{liga?.tipo === 'copa' ? 'Definição dos Potes' : 'Ranking Inicial (Seeds)'}</h2>
                    <p className="text-gray-400 text-xs mt-1">{liga?.tipo === 'copa' ? "A ordem define os potes (Cabeças de chave no topo)." : "A ordem define os seeds."}</p>
                </div>
                {liga?.tipo !== 'copa' && (
                    <div className="flex gap-2">
                        <button onClick={() => handleGerarComSeeds(true)} className="bg-purple-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-purple-500 transition">🎲 Aleatório</button>
                        <button onClick={() => handleGerarComSeeds(false)} className="bg-green-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-500 transition">⚡ Gerar Chave</button>
                    </div>
                )}
            </div>
            <div className="bg-black/40 rounded-xl border border-gray-700 divide-y divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                {timesLiga.map((item, index) => (
                    <div key={item.times.id} className="grid grid-cols-12 items-center p-3 hover:bg-white/5 transition">
                        <div className="col-span-1 text-center font-mono text-cartola-gold">#{index + 1}</div>
                        <div className="col-span-1"><img src={item.times.escudo} className="w-8 h-8 object-contain" /></div>
                        <div className="col-span-8 font-bold text-sm">{item.times.nome}</div>
                        <div className="col-span-2 flex gap-1 justify-center">
                            <button onClick={() => moverTime(index, -1)} disabled={index === 0} className="px-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30">▲</button>
                            <button onClick={() => moverTime(index, 1)} disabled={index === timesLiga.length - 1} className="px-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30">▼</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {tabAtiva === 'times' && (
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl animate-fadeIn">
            <div className="flex gap-2 mb-8">
                <div className="relative flex-1">
                    <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 p-4 rounded-lg text-left flex justify-between items-center focus:border-blue-500 outline-none transition">
                        {timeSelecionadoObjeto ? (<div className="flex items-center gap-2"><img src={timeSelecionadoObjeto.escudo} className="w-6 h-6" /> {timeSelecionadoObjeto.nome}</div>) : "Selecionar time..."} 
                        <span className="text-gray-500">▼</span>
                    </button>
                    {menuAberto && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-60 overflow-y-auto z-50 shadow-xl">
                            {timesDisponiveis.map(t => (
                                <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full p-3 hover:bg-gray-700 text-left flex gap-2 items-center border-b border-gray-700/50 last:border-0 transition">
                                    <img src={t.escudo} className="w-6 h-6" /> {t.nome}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={handleAdicionarTime} disabled={!selecionadoId} className="bg-green-600 px-6 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition">Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {timesLiga.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-gray-600 transition group">
                        <div className="flex items-center gap-3"><img src={item.times.escudo} className="w-8 h-8 object-contain" /><span className="font-bold text-sm text-gray-200 group-hover:text-white transition">{item.times.nome}</span></div>
                        <button onClick={() => handleRemoverTime(item.times.id)} className="text-gray-600 hover:text-red-500 p-2 transition">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  )
}