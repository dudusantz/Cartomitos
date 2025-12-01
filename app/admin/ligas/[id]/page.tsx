'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  adicionarTimeAoCampeonato, 
  listarTimesDoCampeonato, 
  listarTodosTimes, 
  criarPartida, 
  listarPartidas,
  atualizarRodada,
  recalcularTabela,
  buscarTabela,
  gerarTabelaCompleta,
  zerarJogos,
  atualizarCampeonatoInteiro,
  removerTimeDaLiga,
  atualizarPlacarManual,
  gerarSorteioMataMata,     // Nova Importação
  adicionarFaseAvancada     // Nova Importação
} from '../../../actions'
import { supabase } from '@/lib/supabase'

export default function GerenciarLiga() {
  const { id } = useParams()
  const campeonatoId = Number(id)
  
  // --- ESTADOS DE DADOS ---
  const [liga, setLiga] = useState<any>(null)
  const [tabela, setTabela] = useState<any[]>([])
  const [timesLiga, setTimesLiga] = useState<any[]>([])
  const [todosTimes, setTodosTimes] = useState<any[]>([])
  const [partidas, setPartidas] = useState<any[]>([])

  // --- ESTADOS DE INTERFACE E ABAS ---
  const [tabAtiva, setTabAtiva] = useState<'jogos' | 'sorteio'>('jogos')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  
  // --- ESTADOS PARA SORTEIO/MATA-MATA ---
  const [poteA, setPoteA] = useState<any[]>([])
  const [poteB, setPoteB] = useState<any[]>([])
  const [timesSemPote, setTimesSemPote] = useState<any[]>([])
  
  // --- ESTADOS PARA FASE AVANÇADA ---
  const [faseAvancadaTime, setFaseAvancadaTime] = useState('')
  const [faseAvancadaRodada, setFaseAvancadaRodada] = useState('2')

  // --- ESTADOS AGENDAMENTO MANUAL ---
  const [menuMandanteAberto, setMenuMandanteAberto] = useState(false)
  const [menuVisitanteAberto, setMenuVisitanteAberto] = useState(false)
  const [timeCasa, setTimeCasa] = useState('')
  const [timeVisitante, setTimeVisitante] = useState('')

  // --- ESTADOS DE EDIÇÃO DE PLACAR ---
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tempCasa, setTempCasa] = useState('')
  const [tempVisitante, setTempVisitante] = useState('')

  // --- CONTROLE DE RODADAS ---
  const [rodada, setRodada] = useState('1')
  const [rodadaCartola, setRodadaCartola] = useState('1')

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    // 1. Carrega Info da Liga
    const { data: dadosLiga } = await supabase.from('campeonatos').select('*').eq('id', campeonatoId).single()
    setLiga(dadosLiga)
    
    // Se for a primeira vez carregando e for mata-mata, sugere a aba de sorteio
    // (Lógica opcional, remove se quiser sempre abrir em 'jogos')
    if (dadosLiga?.tipo === 'mata_mata' && tabAtiva === 'jogos' && timesLiga.length === 0) {
        setTabAtiva('sorteio')
    }

    // 2. Carrega Dados Operacionais
    await recalcularTabela(campeonatoId)
    const _times = await listarTimesDoCampeonato(campeonatoId)
    setTimesLiga(_times)
    
    // Inicializa listas do sorteio
    setTimesSemPote(_times.map((t: any) => t.times))
    setPoteA([]) 
    setPoteB([])

    setTabela(await buscarTabela(campeonatoId))
    setTodosTimes(await listarTodosTimes())
    setPartidas(await listarPartidas(campeonatoId))
  }

  // --- FILTROS ---
  const timesDisponiveis = todosTimes.filter(t => !timesLiga.some(p => p.time_id === t.id))
  const timeSelecionadoObjeto = todosTimes.find(t => t.id.toString() === selecionadoId)
  
  const timeCasaObj = timesLiga.find(t => t.time_id.toString() === timeCasa)?.times
  const timeVisitanteObj = timesLiga.find(t => t.time_id.toString() === timeVisitante)?.times
  
  const jogosDaRodada = partidas.filter(p => Number(p.rodada) === Number(rodada))

  // --- LÓGICA DE POTES ---
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

  // --- AÇÕES DO SISTEMA ---
  
  // 1. SORTEIO E FASES
  async function handleSorteio() {
    if (poteA.length === 0 || poteB.length === 0) return toast.error("Preencha os potes!")
    if (poteA.length !== poteB.length) return toast.error("Potes devem ter tamanho igual!")
    
    const idsA = poteA.map(t => t.id)
    const idsB = poteB.map(t => t.id)
    
    const res = await gerarSorteioMataMata(campeonatoId, idsA, idsB, 1)
    if (res.success) {
      toast.success(res.msg)
      carregarDados()
      setTabAtiva('jogos')
    } else {
      toast.error(res.msg)
    }
  }

  async function handleAdicionarFaseAvancada() {
    if (!faseAvancadaTime) return toast.error("Escolha um time")
    const res = await adicionarFaseAvancada(campeonatoId, Number(faseAvancadaTime), Number(faseAvancadaRodada))
    if (res.success) {
      toast.success("Adicionado na fase avançada!")
      carregarDados()
      setTabAtiva('jogos')
    } else {
      toast.error(res.msg)
    }
  }

  // 2. GESTÃO DE JOGOS E TIMES
  function proximaRodada() { if (Number(rodada) < 38) setRodada(String(Number(rodada) + 1)) }
  function rodadaAnterior() { if (Number(rodada) > 1) setRodada(String(Number(rodada) - 1)) }

  function iniciarEdicao(jogo: any) {
    setEditingId(jogo.id)
    setTempCasa(jogo.placar_casa ?? '')
    setTempVisitante(jogo.placar_visitante ?? '')
  }

  async function salvarEdicao(jogoId: number) {
    if (tempCasa === '' || tempVisitante === '') return toast.error("Digite os placares!")
    const res = await atualizarPlacarManual(jogoId, Number(tempCasa), Number(tempVisitante))
    if (res.success) { setEditingId(null); carregarDados(); toast.success("Placar atualizado!") } 
    else { toast.error("Erro: " + res.msg) }
  }

  async function handleAdicionar() {
    if (!selecionadoId) return
    const res = await adicionarTimeAoCampeonato(campeonatoId, Number(selecionadoId))
    if (res.success) { setSelecionadoId(''); setMenuAberto(false); carregarDados(); toast.success("Time adicionado!") }
    else { toast.error(res.msg) }
  }

  async function handleRemoverDaLiga(timeId: number) {
    if(!confirm("Remover time da liga?")) return
    const res = await removerTimeDaLiga(campeonatoId, timeId)
    if (res.success) { carregarDados(); toast.success("Time removido") } else { toast.error(res.msg) }
  }

  async function handleCriarJogo() {
    if (!timeCasa || !timeVisitante) return toast.error("Escolha os times!")
    if (timeCasa === timeVisitante) return toast.error("Mesmo time!")
    const res = await criarPartida(campeonatoId, Number(rodada), Number(timeCasa), Number(timeVisitante))
    if (res.success) { carregarDados(); setTimeCasa(''); setTimeVisitante(''); toast.success("Jogo agendado") } 
    else { toast.error(res.msg) }
  }

  async function handleAtualizarRodada() {
    toast.loading("Buscando dados...")
    const res = await atualizarRodada(campeonatoId, Number(rodada), Number(rodadaCartola))
    toast.dismiss()
    if (res.success) { carregarDados(); toast.success(res.msg) } else { toast.error(res.msg) }
  }

  async function handleAtualizarTudo() {
    if(!confirm("Isso pode demorar. Continuar?")) return
    toast.loading("Atualizando campeonato...")
    const res = await atualizarCampeonatoInteiro(campeonatoId)
    toast.dismiss()
    if (res.success) { carregarDados(); toast.success(res.msg) } else { toast.error(res.msg) }
  }

  async function handleGerarTabela() {
    if (timesLiga.length % 2 !== 0) return toast.error("Precisa de par de times.")
    const res = await gerarTabelaCompleta(campeonatoId)
    if (res.success) { carregarDados(); toast.success("Tabela gerada!") } else { toast.error(res.msg) }
  }

  async function handleZerarJogos() {
    if (!confirm("Apagar TODOS os jogos desta liga?")) return
    const res = await zerarJogos(campeonatoId)
    if (res.success) { carregarDados(); toast.success("Jogos apagados.") } else { toast.error(res.msg) }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto text-white pb-20 font-sans min-h-screen bg-black">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-800 pb-6">
        <div>
          <Link href="/admin/ligas" className="text-gray-500 hover:text-white mb-2 inline-block text-sm">← Voltar</Link>
          <h1 className="text-4xl font-extrabold text-cartola-gold">{liga?.nome}</h1>
          <div className="flex gap-2 mt-2">
             <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 font-mono">ID: {id}</span>
             <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded border border-blue-900/50 uppercase font-bold">{liga?.tipo?.replace('_', ' ')}</span>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex gap-2 mt-4 md:mt-0 bg-gray-900 p-1 rounded-xl">
           <button 
             onClick={() => setTabAtiva('jogos')} 
             className={`px-6 py-2 rounded-lg font-bold transition text-sm ${tabAtiva === 'jogos' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             📋 Gestão & Jogos
           </button>
           {liga?.tipo === 'mata_mata' && (
             <button 
               onClick={() => setTabAtiva('sorteio')} 
               className={`px-6 py-2 rounded-lg font-bold transition text-sm ${tabAtiva === 'sorteio' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               🎲 Sorteio & Fases
             </button>
           )}
        </div>
      </div>

      {/* =================================================================================
          CONTEÚDO DA ABA: SORTEIO E FASES (MATA-MATA)
      ================================================================================== */}
      {tabAtiva === 'sorteio' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* PAINEL DE POTES */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">🎱 Definir Potes (Rodada 1)</h2>
               <button onClick={handleSorteio} disabled={poteA.length === 0} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50">
                 Realizar Sorteio
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* COLUNA 1: LIVRES */}
              <div className="bg-black/50 p-4 rounded-lg border border-gray-700 h-[500px] flex flex-col">
                <h3 className="text-gray-400 font-bold mb-3 uppercase text-xs">Disponíveis ({timesSemPote.length})</h3>
                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {timesSemPote.map(t => (
                    <button key={t.id} onClick={() => moverParaPote(t, 'A')} className="w-full flex items-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-left border border-gray-700 transition group">
                      <img src={t.escudo} className="w-6 h-6" />
                      <span className="text-xs font-bold truncate text-gray-300 group-hover:text-white">{t.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* COLUNA 2: POTE A */}
              <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/30 h-[500px] flex flex-col">
                <h3 className="text-blue-400 font-bold mb-3 uppercase text-xs flex justify-between">
                  Pote A (Mandantes) <span>{poteA.length}</span>
                </h3>
                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {poteA.map(t => (
                    <button key={t.id} onClick={() => moverParaPote(t, 'B')} className="w-full flex items-center gap-2 p-2 bg-blue-900/40 hover:bg-blue-800/50 rounded text-left border border-blue-800 transition">
                      <img src={t.escudo} className="w-6 h-6" />
                      <span className="text-xs font-bold truncate text-white">{t.nome}</span>
                      <span className="ml-auto text-[10px] opacity-50">➜ B</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* COLUNA 3: POTE B */}
              <div className="bg-red-900/10 p-4 rounded-lg border border-red-500/30 h-[500px] flex flex-col">
                <h3 className="text-red-400 font-bold mb-3 uppercase text-xs flex justify-between">
                  Pote B (Visitantes) <span>{poteB.length}</span>
                </h3>
                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {poteB.map(t => (
                    <button key={t.id} onClick={() => moverParaPote(t, 'Livre')} className="w-full flex items-center gap-2 p-2 bg-red-900/40 hover:bg-red-800/50 rounded text-left border border-red-800 transition">
                      <img src={t.escudo} className="w-6 h-6" />
                      <span className="text-xs font-bold truncate text-white">{t.nome}</span>
                      <span className="ml-auto text-[10px] opacity-50">✕</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PAINEL DE FASE AVANÇADA */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-yellow-400 flex items-center gap-2">🚀 Adicionar em Fase Avançada</h2>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Time (Mesmo fora da liga)</label>
                <select 
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 outline-none focus:border-yellow-500"
                  value={faseAvancadaTime}
                  onChange={(e) => setFaseAvancadaTime(e.target.value)}
                >
                  <option value="">Selecione um time...</option>
                  {todosTimes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Entra na Rodada</label>
                <input 
                  type="number" 
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 outline-none text-center font-bold focus:border-yellow-500"
                  value={faseAvancadaRodada}
                  onChange={(e) => setFaseAvancadaRodada(e.target.value)}
                />
              </div>
              <button 
                onClick={handleAdicionarFaseAvancada}
                className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition"
              >
                Adicionar
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">* Isso adiciona o time à liga e cria um jogo placeholder na rodada escolhida.</p>
          </div>
        </div>
      )}

      {/* =================================================================================
          CONTEÚDO DA ABA: JOGOS (GESTÃO PADRÃO)
      ================================================================================== */}
      {tabAtiva === 'jogos' && (
        <div className="animate-fadeIn">
          {/* 1. SEÇÃO DE TIMES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Adicionar */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg relative z-20">
              <h2 className="text-lg font-bold mb-4 text-green-400 flex items-center gap-2"><span>+</span> Adicionar Participante</h2>
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <button onClick={() => setMenuAberto(!menuAberto)} className="w-full bg-black border border-gray-700 text-left px-4 py-3 rounded-lg flex items-center justify-between hover:border-cartola-gold transition">
                    {timeSelecionadoObjeto ? (
                      <div className="flex items-center gap-3">
                        <img src={timeSelecionadoObjeto.escudo} className="w-6 h-6" />
                        <span className="font-bold text-white">{timeSelecionadoObjeto.nome}</span>
                      </div>
                    ) : <span className="text-gray-500">Selecione...</span>}
                    <span className="text-gray-500">▼</span>
                  </button>
                  {menuAberto && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                      {timesDisponiveis.map(t => (
                        <button key={t.id} onClick={() => { setSelecionadoId(String(t.id)); setMenuAberto(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 border-b border-gray-700/50 text-left">
                          <img src={t.escudo} className="w-8 h-8" />
                          <div className="font-bold text-white text-sm">{t.nome}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleAdicionar} disabled={!selecionadoId} className="bg-green-600 px-6 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50 transition">Ok</button>
              </div>
            </div>

            {/* Lista */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 z-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Participantes</h2>
                <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded-full font-bold">{timesLiga.length}</span>
              </div>
              <div className="h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {timesLiga.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-black/40 rounded border border-gray-800 hover:border-gray-600">
                      <div className="flex items-center gap-3">
                        <img src={item.times.escudo} className="w-8 h-8" />
                        <span className="font-bold text-sm text-gray-300">{item.times.nome}</span>
                      </div>
                      <button onClick={() => handleRemoverDaLiga(item.times.id)} className="text-red-500 hover:bg-red-900/30 p-1 rounded">🗑️</button>
                    </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center mb-12">
            <button onClick={handleGerarTabela} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded font-bold text-xs uppercase border border-gray-600">📅 Gerar Tabela Automática</button>
            <button onClick={handleZerarJogos} className="bg-red-900/20 hover:bg-red-900/50 text-red-400 px-6 py-2 rounded font-bold text-xs uppercase border border-red-900">🗑️ Zerar Tudo</button>
          </div>

          <hr className="border-gray-800 mb-12"/>

          {/* 2. GESTÃO DE JOGOS */}
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-8 gap-6">
              
              {/* Seletor Rodada */}
              <div className="flex-1 w-full">
                <label className="block text-[10px] mb-2 text-blue-400 font-black uppercase tracking-widest">Rodada do Camp.</label>
                <div className="flex items-center bg-black rounded-lg border border-gray-700 overflow-hidden">
                  <button onClick={rodadaAnterior} className="w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xl border-r border-gray-700">‹</button>
                  <select className="flex-1 bg-black text-white font-bold text-lg h-12 text-center outline-none appearance-none cursor-pointer hover:bg-gray-900 transition" value={rodada} onChange={e => setRodada(e.target.value)}>
                    {Array.from({ length: 38 }, (_, i) => i + 1).map(r => <option key={r} value={r}>Rodada {r}</option>)}
                  </select>
                  <button onClick={proximaRodada} className="w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xl border-l border-gray-700">›</button>
                </div>
              </div>

              <div className="text-gray-600 text-2xl hidden md:block pb-2">⚡</div>

              {/* Seletor Cartola */}
              <div className="flex-1 w-full">
                <label className="block text-[10px] mb-2 text-green-400 font-black uppercase tracking-widest">Usar Pontos...</label>
                <select className="w-full bg-black text-white font-bold text-lg p-3 h-12 rounded-lg border border-green-900 focus:border-green-500 outline-none cursor-pointer hover:bg-gray-900 transition" value={rodadaCartola} onChange={e => setRodadaCartola(e.target.value)}>
                  {Array.from({ length: 38 }, (_, i) => i + 1).map(r => <option key={r} value={r}>Rodada Oficial {r}</option>)}
                </select>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handleAtualizarRodada} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-6 h-12 rounded-lg font-bold text-sm transition shadow-lg shadow-purple-900/20">🔄 Buscar</button>
                <button onClick={handleAtualizarTudo} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-6 h-12 rounded-lg font-bold text-sm transition shadow-lg shadow-orange-900/20">🚀 Tudo</button>
              </div>
            </div>

            {/* Agendar Manual */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-black/30 p-4 rounded-xl border border-gray-800 mb-8 relative z-30">
              {/* Mandante */}
              <div className="relative w-full">
                <button onClick={() => { setMenuMandanteAberto(!menuMandanteAberto); setMenuVisitanteAberto(false) }} className="w-full bg-gray-900 border border-gray-700 text-left px-4 py-3 rounded-lg flex items-center justify-between hover:border-gray-500 transition">
                    {timeCasaObj ? <div className="flex items-center gap-2"><img src={timeCasaObj.escudo} className="w-6 h-6" /><span className="font-bold text-white text-sm">{timeCasaObj.nome}</span></div> : <span className="text-gray-500 text-sm">Mandante...</span>}
                </button>
                {menuMandanteAberto && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {timesLiga.map(item => (
                      <button key={item.time_id} onClick={() => { setTimeCasa(String(item.time_id)); setMenuMandanteAberto(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 border-b border-gray-700/50 text-left">
                        <img src={item.times.escudo} className="w-6 h-6" />
                        <span className="text-sm font-bold">{item.times.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <span className="font-black text-gray-700">VS</span>

              {/* Visitante */}
              <div className="relative w-full">
                <button onClick={() => { setMenuVisitanteAberto(!menuVisitanteAberto); setMenuMandanteAberto(false) }} className="w-full bg-gray-900 border border-gray-700 text-left px-4 py-3 rounded-lg flex items-center justify-between hover:border-gray-500 transition">
                    {timeVisitanteObj ? <div className="flex items-center gap-2"><img src={timeVisitanteObj.escudo} className="w-6 h-6" /><span className="font-bold text-white text-sm">{timeVisitanteObj.nome}</span></div> : <span className="text-gray-500 text-sm">Visitante...</span>}
                </button>
                {menuVisitanteAberto && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {timesLiga.map(item => (
                      <button key={item.time_id} onClick={() => { setTimeVisitante(String(item.time_id)); setMenuVisitanteAberto(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 border-b border-gray-700/50 text-left">
                        <img src={item.times.escudo} className="w-6 h-6" />
                        <span className="text-sm font-bold">{item.times.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleCriarJogo} className="bg-yellow-600 text-black px-8 py-3 rounded-lg font-bold w-full md:w-auto hover:bg-yellow-500 transition">Agendar</button>
            </div>

            {/* LISTA DE JOGOS */}
            <h3 className="text-xl font-bold mb-4 text-white border-l-4 border-yellow-500 pl-3">Jogos da Rodada {rodada}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
              {jogosDaRodada.length === 0 && <p className="text-gray-600 text-center py-10 col-span-2 border border-gray-800 border-dashed rounded">Nenhum jogo nesta rodada.</p>}
              
              {jogosDaRodada.map((jogo) => (
                <div key={jogo.id} className={`group relative p-3 rounded-xl border transition-all duration-200 ${editingId === jogo.id ? 'bg-blue-900/20 border-blue-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}>
                  {editingId === jogo.id ? (
                    // MODO EDIÇÃO
                    <div className="flex items-center justify-center gap-2 relative z-10 py-1">
                      <div className="text-right w-1/3 truncate font-bold text-gray-400 text-xs">{jogo.casa?.nome}</div>
                      <div className="flex items-center gap-1">
                        <input type="number" className="w-12 h-10 bg-black border border-blue-500 text-white text-center font-bold text-lg rounded-lg focus:outline-none" value={tempCasa} onChange={e => setTempCasa(e.target.value)} />
                        <span className="text-gray-500 font-bold text-xs">x</span>
                        <input type="number" className="w-12 h-10 bg-black border border-blue-500 text-white text-center font-bold text-lg rounded-lg focus:outline-none" value={tempVisitante} onChange={e => setTempVisitante(e.target.value)} />
                      </div>
                      <div className="text-left w-1/3 truncate font-bold text-gray-400 text-xs">{jogo.visitante?.nome}</div>
                      
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => salvarEdicao(jogo.id)} className="bg-green-600 p-2 rounded-lg hover:bg-green-500 flex items-center justify-center text-white text-xs">✓</button>
                        <button onClick={() => setEditingId(null)} className="bg-red-600 p-2 rounded-lg hover:bg-red-500 flex items-center justify-center text-white text-xs">✕</button>
                      </div>
                    </div>
                  ) : (
                    // MODO VISUALIZAÇÃO
                    <div className="flex items-center justify-between relative z-10 cursor-pointer py-1" onClick={() => iniciarEdicao(jogo)} title="Clique para editar">
                      
                      <div className="flex items-center gap-3 w-[40%] justify-end">
                        <span className="font-bold text-white text-xs hidden sm:block truncate">{jogo.casa?.nome}</span>
                        <img src={jogo.casa?.escudo} className="w-8 h-8 drop-shadow-md" />
                      </div>

                      <div className={`px-3 py-1 rounded-lg border min-w-[60px] text-center ${jogo.status === 'finalizado' ? 'bg-gray-900 border-green-900/50' : 'bg-gray-900 border-gray-800'}`}>
                        <div className="text-lg font-black font-mono tracking-widest text-white">
                          {jogo.placar_casa ?? '-'} <span className="text-gray-600 mx-1">:</span> {jogo.placar_visitante ?? '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-[40%] justify-start">
                        <img src={jogo.visitante?.escudo} className="w-8 h-8 drop-shadow-md" />
                        <span className="font-bold text-white text-xs hidden sm:block truncate">{jogo.visitante?.nome}</span>
                      </div>

                      <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition text-gray-500 text-xs flex flex-col items-center">
                        <span>✏️</span>
                      </div>
                      
                      {/* Botão de Excluir Partida */}
                      <button 
                        onClick={async (e) => {
                           e.stopPropagation();
                           if(confirm("Apagar partida permanentemente?")) {
                             await supabase.from('partidas').delete().eq('id', jogo.id)
                             carregarDados()
                           }
                        }}
                        className="absolute top-1 left-1 text-red-500 opacity-0 group-hover:opacity-100 transition text-xs hover:bg-red-900/20 p-1 rounded z-20"
                        title="Apagar jogo"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. TABELA COMPLETA */}
          <h2 className="text-3xl font-bold mt-16 mb-6 text-blue-400">Tabela de Classificação</h2>
          <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800 mb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wider">
                  <th className="p-4">Pos</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th>
                  <th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th>
                  <th className="p-4 text-center">D</th><th className="p-4 text-center">PP</th><th className="p-4 text-center">PC</th>
                  <th className="p-4 text-center">SP</th><th className="p-4 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((time, index) => (
                  <tr key={time.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                    <td className={`p-4 font-bold ${index < 4 ? 'text-blue-400' : 'text-gray-500'}`}>{index + 1}º</td>
                    <td className="p-4 flex items-center gap-3">
                      <img src={time.times.escudo} className="w-8 h-8" />
                      <span className="font-bold text-white">{time.times.nome}</span>
                    </td>
                    <td className="p-4 text-center font-bold text-yellow-400 text-lg">{time.pts}</td>
                    <td className="p-4 text-center text-gray-400">{time.pj}</td>
                    <td className="p-4 text-center text-green-500">{time.v}</td>
                    <td className="p-4 text-center text-gray-500">{time.e}</td>
                    <td className="p-4 text-center text-red-500">{time.d}</td>
                    <td className="p-4 text-center text-gray-400 font-mono">{time.pp}</td>
                    <td className="p-4 text-center text-gray-400 font-mono">{time.pc}</td>
                    <td className="p-4 text-center font-bold text-gray-300">{time.sp}</td>
                    <td className="p-4 text-center text-xs text-gray-600">{time.aproveitamento}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-xs text-gray-500 grid grid-cols-2 md:grid-cols-5 gap-3">
            <span>PTS: Pontos</span><span>J: Jogos</span><span>V: Vitórias</span><span>E: Empates</span>
            <span>D: Derrotas</span><span>PP: Pontos Pró</span><span>PC: Pontos Contra</span><span>SP: Saldo</span><span>%: Aproveitamento</span>
          </div>
        </div>
      )}
    </div>
  )
}