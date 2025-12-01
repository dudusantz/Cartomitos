'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  adicionarTimeAoCampeonato, listarTimesDoCampeonato, listarTodosTimes, listarPartidas,
  recalcularTabela, buscarTabela, zerarJogos, removerTimeDaLiga, 
  atualizarPlacarManual, gerarSorteioMataMata, adicionarFaseAvancada, avancarFaseMataMata,
  atualizarRodadaMataMata // Importe a nova função aqui
} from '../../../actions'
import { supabase } from '@/lib/supabase'

// --- CARD DE CONFRONTO (Ida e Volta Agrupados) ---
const CardConfronto = ({ jogos, onEdit }: { jogos: any[], onEdit: (j:any) => void }) => {
    if (!jogos || jogos.length === 0) return null;

    // Define times e jogos
    const jogo1 = jogos[0];
    const timeA = jogo1.casa;
    const timeB = jogo1.visitante;
    
    // Tenta achar Ida e Volta (Ida: A x B | Volta: B x A)
    const jogoIda = jogos.find(j => j.time_casa === timeA.id) || jogos[0];
    const jogoVolta = jogos.find(j => j.time_casa === timeB.id) || jogos[1];

    // Calcula Agregado
    const p1_A = jogoIda?.placar_casa ?? 0;
    const p1_B = jogoIda?.placar_visitante ?? 0;
    const p2_A = jogoVolta?.placar_visitante ?? 0;
    const p2_B = jogoVolta?.placar_casa ?? 0;

    const totalA = (jogoIda?.placar_casa !== null ? p1_A : 0) + (jogoVolta?.placar_visitante !== null ? p2_A : 0);
    const totalB = (jogoIda?.placar_visitante !== null ? p1_B : 0) + (jogoVolta?.placar_casa !== null ? p2_B : 0);

    const isFinalizado = jogoIda?.status === 'finalizado' && jogoVolta?.status === 'finalizado';
    const vencedorId = isFinalizado ? (totalA > totalB ? timeA.id : timeB.id) : null;

    return (
        <div className={`relative flex flex-col bg-[#1a1a1a] rounded-xl border transition-all duration-300 w-full mb-4 shadow-xl overflow-hidden ${isFinalizado ? 'border-gray-700 opacity-80 hover:opacity-100' : 'border-blue-900/50 shadow-blue-900/10'}`}>
            
            {/* Header do Card */}
            <div className="bg-black/40 px-3 py-2 flex justify-between items-center border-b border-gray-800">
                <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-500">
                    <span>AGREGADO</span>
                </div>
                {isFinalizado && <span className="text-[9px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900">Finalizado</span>}
            </div>

            {/* Placar Principal (Agregado) */}
            <div className="flex items-center justify-between p-4">
                {/* Time A */}
                <div className={`flex flex-col items-center gap-2 w-1/3 ${vencedorId === timeB.id ? 'opacity-30 grayscale' : ''}`}>
                    <img src={timeA?.escudo} className="w-12 h-12 object-contain drop-shadow-md" />
                    <span className="text-xs font-bold text-center leading-tight text-gray-200 truncate w-full">{timeA?.nome}</span>
                </div>

                {/* Placar */}
                <div className="flex flex-col items-center justify-center w-1/3">
                    <div className="text-3xl font-black text-white tracking-widest flex items-center gap-2 bg-black/30 px-3 py-1 rounded-lg border border-gray-800">
                        <span>{totalA}</span>
                        <span className="text-gray-600 text-xl">:</span>
                        <span>{totalB}</span>
                    </div>
                </div>

                {/* Time B */}
                <div className={`flex flex-col items-center gap-2 w-1/3 ${vencedorId === timeA.id ? 'opacity-30 grayscale' : ''}`}>
                    <img src={timeB?.escudo} className="w-12 h-12 object-contain drop-shadow-md" />
                    <span className="text-xs font-bold text-center leading-tight text-gray-200 truncate w-full">{timeB?.nome}</span>
                </div>
            </div>

            {/* Detalhes Ida e Volta */}
            <div className="grid grid-cols-2 divide-x divide-gray-800 border-t border-gray-800 bg-black/20">
                {/* IDA */}
                <div 
                    onClick={() => jogoIda && onEdit(jogoIda)} 
                    className="p-2 hover:bg-white/5 cursor-pointer transition text-center group"
                >
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Jogo de Ida</p>
                    <div className="flex justify-center items-center gap-2 text-xs font-mono text-gray-300">
                        <span>{jogoIda?.placar_casa ?? '-'}</span>
                        <span className="text-gray-600">x</span>
                        <span>{jogoIda?.placar_visitante ?? '-'}</span>
                        <span className="text-[10px] opacity-0 group-hover:opacity-100 text-blue-400 absolute ml-10">✎</span>
                    </div>
                </div>

                {/* VOLTA */}
                <div 
                    onClick={() => jogoVolta && onEdit(jogoVolta)} 
                    className="p-2 hover:bg-white/5 cursor-pointer transition text-center group"
                >
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Jogo de Volta</p>
                    <div className="flex justify-center items-center gap-2 text-xs font-mono text-gray-300">
                        <span>{jogoVolta?.placar_casa ?? '-'}</span>
                        <span className="text-gray-600">x</span>
                        <span>{jogoVolta?.placar_visitante ?? '-'}</span>
                        <span className="text-[10px] opacity-0 group-hover:opacity-100 text-blue-400 absolute ml-10">✎</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // Dados
  const [liga, setLiga] = useState<any>(null)
  const [timesLiga, setTimesLiga] = useState<any[]>([])
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])

  // Controle UI
  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'times' | 'sorteio'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  
  // Sorteio
  const [poteA, setPoteA] = useState<any[]>([])
  const [poteB, setPoteB] = useState<any[]>([])
  const [timesSemPote, setTimesSemPote] = useState<any[]>([])
  
  // Edição Placar
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // Rodadas (Fase + Rodadas Cartola)
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')

  useEffect(() => { if (id) carregarDados() }, [id])

  async function carregarDados() {
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)
    
    // Se for mata-mata e não tiver times, vai para aba de times/sorteio
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times)
    
    if (dadosLiga?.tipo === 'mata_mata' && _times.length === 0) setTabAtiva('times')
    
    if(timesSemPote.length === 0 && poteA.length === 0 && poteB.length === 0) {
        setTimesSemPote(_times.map((t: any) => t.times))
    }

    setTodosTimes(await listarTodosTimes())
    const jogos = await listarPartidas(campeonatoId)
    setPartidas(jogos)

    // Define a fase atual com base na última criada
    if (jogos.length > 0) {
        const maxFase = Math.max(...jogos.map((j: any) => j.rodada))
        setFaseAtual(String(maxFase))
    }
  }

  // --- FILTROS ---
  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)
  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b)

  // --- ACTIONS ---
  async function handleAdicionarTime() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { 
        setSelecionadoId('')
        carregarDados()
        toast.success("Time adicionado!") 
    }
  }

  async function handleRemoverTime(timeId: number) {
    if(!confirm("Remover time da liga?")) return
    const res = await removerTimeDaLiga(campeonatoId, timeId)
    if (res.success) { carregarDados(); toast.success("Time removido") }
  }

  async function handleSorteio() {
    if (poteA.length !== poteB.length) return toast.error("Potes desiguais!")
    const res = await gerarSorteioMataMata(campeonatoId, poteA.map(t=>t.id), poteB.map(t=>t.id), 1)
    if (res.success) { toast.success(res.msg); carregarDados(); setTabAtiva('jogos') } else { toast.error(res.msg) }
  }

  function moverParaPote(time: any, destino: 'A' | 'B' | 'Livre') {
    const novoA = poteA.filter(t => t.id !== time.id)
    const novoB = poteB.filter(t => t.id !== time.id)
    const novoLivre = timesSemPote.filter(t => t.id !== time.id)
    if (destino === 'A') setPoteA([...novoA, time])
    if (destino === 'B') setPoteB([...novoB, time])
    if (destino === 'Livre') setTimesSemPote([...novoLivre, time])
    if (destino !== 'A') setPoteA(novoA)
    if (destino !== 'B') setPoteB(novoB)
    if (destino !== 'Livre') setTimesSemPote(novoLivre)
  }

  async function handleAtualizarRodada() {
    if (!rodadaIda && !rodadaVolta) return toast.error("Preencha a rodada do Cartola para Ida ou Volta")
    
    toast.loading("Atualizando pontuações...")
    const res = await atualizarRodadaMataMata(campeonatoId, Number(faseAtual), Number(rodadaIda), Number(rodadaVolta))
    toast.dismiss()
    
    if (res.success) { toast.success(res.msg); carregarDados() } else { toast.error(res.msg) }
  }

  async function handleAvancarFase() {
    if(!confirm(`Deseja gerar a próxima fase com base nos vencedores da Fase ${faseAtual}?`)) return
    const res = await avancarFaseMataMata(campeonatoId, Number(faseAtual))
    if (res.success) { toast.success(res.msg); carregarDados() } else { toast.error(res.msg) }
  }

  async function salvarEdicao(jogoId: number) {
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Placar salvo!") }
  }

  async function handleZerarTudo() {
    if (confirm("ATENÇÃO: Isso apagará TODOS os jogos e fases. Confirmar?")) {
        await zerarJogos(campeonatoId)
        carregarDados()
        toast.success("Liga resetada.")
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto text-white pb-20 font-sans min-h-screen bg-[#0a0a0a]">
      
      {/* --- MODAL EDIÇÃO --- */}
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

      {/* --- CABEÇALHO --- */}
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
           <button onClick={() => setTabAtiva('sorteio')} className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition ${tabAtiva === 'sorteio' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white'}`}>Sorteio</button>
           <button onClick={() => setTabAtiva('times')} className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition ${tabAtiva === 'times' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white'}`}>Participantes</button>
        </div>
      </div>

      {/* ================= ABA CHAVEAMENTO (PRINCIPAL) ================= */}
      {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn space-y-8">
            
            {/* PAINEL DE CONTROLE DA FASE */}
            <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row gap-8 items-end relative z-10">
                    
                    {/* Seletor de Fase */}
                    <div className="w-full lg:w-1/4">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Fase do Torneio</label>
                        <select 
                            className="w-full bg-black border border-gray-700 text-white text-lg font-bold p-3 rounded-lg focus:border-blue-500 outline-none"
                            value={faseAtual}
                            onChange={(e) => setFaseAtual(e.target.value)}
                        >
                            {fasesDisponiveis.map(f => <option key={f} value={f}>{f}ª Fase</option>)}
                            {fasesDisponiveis.length === 0 && <option>Sem jogos</option>}
                        </select>
                    </div>

                    {/* Inputs de Rodada Cartola */}
                    <div className="flex-1 w-full bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1 block">Rodada Cartola (IDA)</label>
                            <input 
                                type="number" 
                                placeholder="Ex: 10" 
                                className="w-full bg-black border border-gray-700 text-white font-mono font-bold p-2 rounded focus:border-blue-500 outline-none"
                                value={rodadaIda}
                                onChange={e => setRodadaIda(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1 block">Rodada Cartola (VOLTA)</label>
                            <input 
                                type="number" 
                                placeholder="Ex: 11" 
                                className="w-full bg-black border border-gray-700 text-white font-mono font-bold p-2 rounded focus:border-blue-500 outline-none"
                                value={rodadaVolta}
                                onChange={e => setRodadaVolta(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={handleAtualizarRodada}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-blue-900/20 w-full md:w-auto h-10"
                            >
                                Atualizar Pontos
                            </button>
                        </div>
                    </div>

                    {/* Ações Perigosas */}
                    <div>
                        <button onClick={handleZerarTudo} className="text-red-500 text-xs hover:text-red-400 underline decoration-red-900">Resetar Liga</button>
                    </div>
                </div>
            </div>

            {/* VISUALIZAÇÃO DOS JOGOS (SCROLL HORIZONTAL) */}
            <div className="overflow-x-auto pb-8 pt-4">
                <div className="flex gap-8 min-w-max px-2">
                    {fasesDisponiveis.length === 0 && <div className="text-gray-500 italic w-full text-center py-10">Nenhum chaveamento gerado ainda. Vá na aba "Sorteio".</div>}

                    {fasesDisponiveis.map((fase) => {
                        // Agrupar jogos desta fase
                        const jogosFase = partidas.filter(p => Number(p.rodada) === fase);
                        const confrontosMap = new Map<string, any[]>();
                        
                        jogosFase.forEach(j => {
                            const key = [j.time_casa, j.time_visitante].sort((a:any,b:any)=>a-b).join('-');
                            if(!confrontosMap.has(key)) confrontosMap.set(key, []);
                            confrontosMap.get(key)?.push(j);
                        });

                        const listaConfrontos = Array.from(confrontosMap.values());

                        return (
                            <div key={fase} className="flex flex-col gap-4 w-[340px]">
                                {/* Cabeçalho da Fase */}
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest border-b-2 border-red-600 pb-1">Fase {fase}</h3>
                                    {Number(fase) === Math.max(...fasesDisponiveis) && listaConfrontos.length > 0 && (
                                        <button 
                                            onClick={handleAvancarFase}
                                            className="bg-gray-800 hover:bg-white hover:text-black text-white text-[10px] uppercase font-bold px-3 py-1 rounded transition border border-gray-600"
                                        >
                                            Gerar Próxima ➜
                                        </button>
                                    )}
                                </div>

                                {/* Lista de Cards */}
                                <div className="flex flex-col gap-4">
                                    {listaConfrontos.map((grupoJogos, idx) => (
                                        <CardConfronto 
                                            key={idx} 
                                            jogos={grupoJogos} 
                                            onEdit={(jogo) => {
                                                setEditingId(jogo.id);
                                                setTempCasa(jogo.placar_casa ?? '');
                                                setTempVisitante(jogo.placar_visitante ?? '');
                                            }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}

      {/* ================= ABA TIMES (GERENCIAMENTO) ================= */}
      {tabAtiva === 'times' && (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="text-green-500">🛡️</span> Gerenciar Participantes
                </h2>

                {/* Adicionar */}
                <div className="flex gap-2 mb-8">
                    <div className="relative flex-1">
                        <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 text-left px-4 py-4 rounded-xl flex items-center justify-between hover:border-gray-500 transition">
                            {timeSelecionadoObjeto ? (
                                <div className="flex items-center gap-3">
                                    <img src={timeSelecionadoObjeto.escudo} className="w-8 h-8" />
                                    <span className="font-bold text-white text-lg">{timeSelecionadoObjeto.nome}</span>
                                </div>
                            ) : <span className="text-gray-500">Selecione um time para adicionar...</span>}
                            <span className="text-gray-500">▼</span>
                        </button>
                        
                        {menuAberto && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                                {timesDisponiveis.map(t => (
                                    <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 border-b border-gray-700/50 text-left transition">
                                        <img src={t.escudo} className="w-8 h-8" />
                                        <div className="font-bold text-white">{t.nome}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleAdicionarTime} disabled={!selecionadoId} className="bg-green-600 px-8 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 transition text-lg">
                        Adicionar
                    </button>
                </div>

                {/* Lista */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {timesLiga.length === 0 && <p className="text-gray-500 col-span-2 text-center py-4">Nenhum time na liga ainda.</p>}
                    {timesLiga.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-gray-600 transition group">
                            <div className="flex items-center gap-3">
                                <img src={item.times.escudo} className="w-10 h-10 object-contain" />
                                <span className="font-bold text-gray-200">{item.times.nome}</span>
                            </div>
                            <button onClick={() => handleRemoverTime(item.times.id)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* ================= ABA SORTEIO ================= */}
      {tabAtiva === 'sorteio' && (
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 animate-fadeIn max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Sorteio de Confrontos</h2>
                    <p className="text-gray-500 text-sm">Distribua os times nos potes para criar os jogos de Ida e Volta.</p>
                </div>
                <button onClick={handleSorteio} disabled={poteA.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition disabled:opacity-50 text-sm uppercase tracking-wider shadow-lg shadow-blue-900/20">
                    Gerar Jogos (1ª Fase)
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
                {/* Livres */}
                <div className="bg-black/50 p-4 rounded-xl border border-gray-700 flex flex-col">
                    <h3 className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-gray-700 pb-2">Disponíveis ({timesSemPote.length})</h3>
                    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {timesSemPote.map(t => (
                            <button key={t.id} onClick={() => moverParaPote(t, 'A')} className="w-full flex items-center gap-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-left border border-gray-700 transition group">
                                <img src={t.escudo} className="w-8 h-8" />
                                <span className="text-sm font-bold truncate text-gray-300 group-hover:text-white">{t.nome}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Pote A */}
                <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/30 flex flex-col">
                    <h3 className="text-blue-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-blue-900/50 pb-2 flex justify-between">
                        Mandantes Ida <span>{poteA.length}</span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {poteA.map(t => (
                            <button key={t.id} onClick={() => moverParaPote(t, 'B')} className="w-full flex items-center gap-3 p-2 bg-blue-900/40 hover:bg-blue-800/50 rounded-lg text-left border border-blue-800 transition">
                                <img src={t.escudo} className="w-8 h-8" />
                                <span className="text-sm font-bold truncate text-white">{t.nome}</span>
                                <span className="ml-auto text-[10px] opacity-50">➜ B</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pote B */}
                <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/30 flex flex-col">
                    <h3 className="text-red-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-red-900/50 pb-2 flex justify-between">
                        Mandantes Volta <span>{poteB.length}</span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {poteB.map(t => (
                            <button key={t.id} onClick={() => moverParaPote(t, 'Livre')} className="w-full flex items-center gap-3 p-2 bg-red-900/40 hover:bg-red-800/50 rounded-lg text-left border border-red-800 transition">
                                <img src={t.escudo} className="w-8 h-8" />
                                <span className="text-sm font-bold truncate text-white">{t.nome}</span>
                                <span className="ml-auto text-[10px] opacity-50">✕</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}