'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CircleCheckBig,
  Flag,
  GitBranch,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import {
  atualizarCampeonato,
  criarCampeonato,
  excluirCampeonato,
  finalizarCampeonato,
  listarCampeonatos,
  reabrirCampeonato,
} from '@/app/actions'
import toast from 'react-hot-toast'

const TIPOS_TORNEIO = {
  pontos_corridos: { icon: Trophy, label: 'Pontos corridos' },
  mata_mata: { icon: GitBranch, label: 'Mata-mata' },
  copa: { icon: Layers3, label: 'Copa mista' },
  grid: { icon: ChartNoAxesColumnIncreasing, label: 'Grid / Ranking geral' },
}

export default function AdminLigas() {
  const [ligas, setLigas] = useState<any[]>([])
  const [filtro, setFiltro] = useState('ativas')
  const [filtroAno, setFiltroAno] = useState('todos')
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [tipo, setTipo] = useState('pontos_corridos')
  const [isPaga, setIsPaga] = useState(false)
  const [usarDecimais, setUsarDecimais] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarLigas()
  }, [])

  async function carregarLigas() {
    const dados = await listarCampeonatos()
    setLigas(dados)
  }

  function preencherEdicao(liga: any) {
    setEditandoId(liga.id)
    setNome(liga.nome)
    setAno(liga.ano)
    setTipo(liga.tipo)
    setIsPaga(liga.is_paga === true)
    setUsarDecimais(liga.usar_decimais === true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setNome('')
    setAno(String(new Date().getFullYear()))
    setTipo('pontos_corridos')
    setIsPaga(false)
    setUsarDecimais(false)
  }

  async function handleSalvar() {
    if (!nome) return toast.error('Digite um nome para o campeonato.')
    setLoading(true)

    const res = editandoId
      ? await atualizarCampeonato(editandoId, nome, Number(ano), tipo, isPaga, usarDecimais)
      : await criarCampeonato(nome, Number(ano), tipo, isPaga, usarDecimais)

    if (res.success) {
      toast.success(editandoId ? 'Campeonato atualizado.' : 'Campeonato criado.')
      cancelarEdicao()
      carregarLigas()
    } else {
      toast.error(`Erro: ${res.msg}`)
    }
    setLoading(false)
  }

  async function handleExcluir(id: number) {
    if (!confirm('Tem certeza? Todos os jogos e a tabela deste campeonato serão apagados.')) return
    const res = await excluirCampeonato(id)
    if (res.success) {
      toast.success('Campeonato excluído.')
      carregarLigas()
    } else {
      toast.error('Não foi possível excluir o campeonato.')
    }
  }

  async function handleFinalizar(id: number, statusAtual: boolean) {
    if (statusAtual) {
      if (!confirm('Finalizar campeonato? O campeão será enviado para a Galeria de Troféus.')) return
      await finalizarCampeonato(id)
      toast.success('Campeonato finalizado.')
    } else {
      if (!confirm('Reabrir campeonato?')) return
      await reabrirCampeonato(id)
      toast.success('Campeonato reaberto.')
    }
    carregarLigas()
  }

  const ligasFiltradas = ligas.filter((liga) => {
    const matchStatus = filtro === 'ativas' ? liga.ativo !== false : liga.ativo === false
    const matchBusca = liga.nome.toLowerCase().includes(busca.toLowerCase())
    const matchAno = filtroAno === 'todos' || String(liga.ano) === filtroAno
    return matchStatus && matchBusca && matchAno
  })

  const anosDisponiveis = Array.from(
    new Set(ligas.map((liga) => String(liga.ano)).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a))

  const getLigaInfo = (tipoLiga: string) =>
    TIPOS_TORNEIO[tipoLiga as keyof typeof TIPOS_TORNEIO] || TIPOS_TORNEIO.pontos_corridos

  return (
    <main className="min-h-screen px-4 py-8 text-gray-200 animate-fadeIn md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 transition-colors hover:text-white">
              <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" /> Voltar ao painel
            </Link>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Gerenciar campeonatos</h1>
            <p className="mt-2 text-sm text-gray-500">Crie, edite e acompanhe todas as competições.</p>
          </div>

          <div className="flex items-center gap-5 text-sm">
            <span className="text-gray-500"><strong className="mr-1.5 font-mono text-xl text-white">{ligas.filter(liga => liga.ativo !== false).length}</strong> em andamento</span>
            <span className="h-7 w-px bg-white/[0.08]" aria-hidden="true" />
            <span className="text-gray-600"><strong className="mr-1.5 font-mono text-xl text-gray-400">{ligas.filter(liga => liga.ativo === false).length}</strong> encerrados</span>
          </div>
        </header>

        <section className={`mb-6 overflow-hidden rounded-2xl border bg-[#141614] transition-colors ${editandoId ? 'border-yellow-500/30' : 'border-white/[0.07]'}`}>
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#171917] px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-500">
                {editandoId ? <Pencil size={17} strokeWidth={1.8} aria-hidden="true" /> : <Plus size={18} strokeWidth={1.8} aria-hidden="true" />}
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">{editandoId ? 'Editar campeonato' : 'Novo campeonato'}</h2>
                <p className="mt-0.5 text-[11px] text-gray-600">{editandoId ? 'Altere as informações e salve.' : 'Preencha as informações para começar.'}</p>
              </div>
            </div>
            {editandoId && (
              <button onClick={cancelarEdicao} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 transition-colors hover:text-white">
                <X size={14} strokeWidth={1.8} aria-hidden="true" /> Cancelar edição
              </button>
            )}
          </div>

          <div className="p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[1.7fr_0.65fr_1.2fr]">
              <div>
                <label htmlFor="liga-nome" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Nome</label>
                <input id="liga-nome" type="text" value={nome} onChange={event => setNome(event.target.value)} placeholder="Ex: Brasileirão" className="h-11 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-gray-700 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10" />
              </div>
              <div>
                <label htmlFor="liga-ano" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Ano</label>
                <input id="liga-ano" type="number" value={ano} onChange={event => setAno(event.target.value)} className="h-11 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] px-3.5 font-mono text-sm text-white outline-none transition-colors focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10" />
              </div>
              <div>
                <label htmlFor="liga-tipo" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Formato</label>
                <select id="liga-tipo" value={tipo} onChange={event => setTipo(event.target.value)} className="h-11 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] px-3.5 text-sm text-white outline-none transition-colors focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10">
                  {Object.entries(TIPOS_TORNEIO).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${isPaga ? 'border-yellow-500/25 bg-yellow-500/[0.045]' : 'border-white/[0.07] bg-[#101210] hover:border-white/15'}`}>
                <input type="checkbox" className="sr-only" checked={isPaga} onChange={event => setIsPaga(event.target.checked)} />
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isPaga ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-gray-700'}`}>
                  {isPaga && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span>
                  <span className={`block text-xs font-bold ${isPaga ? 'text-yellow-500' : 'text-gray-300'}`}>Liga paga ou tiro curto</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-600">Não participa do ranking geral nem dos recordes.</span>
                </span>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${usarDecimais ? 'border-yellow-500/25 bg-yellow-500/[0.045]' : 'border-white/[0.07] bg-[#101210] hover:border-white/15'}`}>
                <input type="checkbox" className="sr-only" checked={usarDecimais} onChange={event => setUsarDecimais(event.target.checked)} />
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${usarDecimais ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-gray-700'}`}>
                  {usarDecimais && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span>
                  <span className={`block text-xs font-bold ${usarDecimais ? 'text-yellow-500' : 'text-gray-300'}`}>Usar pontuação decimal</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-600">{usarDecimais ? 'Mantém o placar exato, como 55,4.' : 'Arredonda a pontuação para baixo.'}</span>
                </span>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {editandoId && (
                <button onClick={cancelarEdicao} className="h-10 rounded-lg border border-white/[0.09] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white active:translate-y-px">Cancelar</button>
              )}
              <button onClick={handleSalvar} disabled={loading || !nome} className="inline-flex h-10 min-w-36 items-center justify-center rounded-lg bg-yellow-500 px-5 text-[10px] font-black uppercase tracking-[0.1em] text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-35 active:translate-y-px">
                {loading ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar campeonato'}
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121412]">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-[#161816] p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div className="flex w-full rounded-lg border border-white/[0.07] bg-[#0e100e] p-1 sm:w-auto">
              <button onClick={() => setFiltro('ativas')} className={`flex-1 rounded-md px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors sm:flex-none ${filtro === 'ativas' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'}`}>Em andamento</button>
              <button onClick={() => setFiltro('finalizadas')} className={`flex-1 rounded-md px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors sm:flex-none ${filtro === 'finalizadas' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'}`}>Encerrados</button>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-44">
                <label htmlFor="filtro-ano" className="sr-only">Filtrar por ano</label>
                <CalendarDays size={15} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden="true" />
                <select id="filtro-ano" value={filtroAno} onChange={event => setFiltroAno(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-white/[0.09] bg-[#0e100e] pl-10 pr-8 text-xs font-semibold text-gray-300 outline-none transition-colors focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10">
                  <option value="todos">Todos os anos</option>
                  {anosDisponiveis.map(anoDisponivel => (
                    <option key={anoDisponivel} value={anoDisponivel}>{anoDisponivel}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={15} strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden="true" />
                <input type="search" placeholder="Buscar campeonato" value={busca} onChange={event => setBusca(event.target.value)} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-700 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10" />
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {ligasFiltradas.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Trophy size={28} strokeWidth={1.5} className="mx-auto text-gray-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-gray-500">Nenhum campeonato encontrado.</p>
                <p className="mt-1 text-xs text-gray-700">Altere o filtro ou crie uma nova competição.</p>
              </div>
            ) : (
              ligasFiltradas.map((liga) => {
                const info = getLigaInfo(liga.tipo)
                const TypeIcon = info.icon
                const isAtivo = liga.ativo !== false
                const isPagaLocal = liga.is_paga === true
                const isDecimal = liga.usar_decimais === true

                return (
                  <article key={liga.id} className={`group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-white/[0.018] sm:flex-row sm:items-center sm:justify-between md:px-6 ${isAtivo ? '' : 'opacity-65 hover:opacity-100'}`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#0d0f0d] text-yellow-500">
                        {isAtivo ? <TypeIcon size={21} strokeWidth={1.7} aria-hidden="true" /> : <Flag size={20} strokeWidth={1.7} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`truncate text-base font-bold ${isAtivo ? 'text-white' : 'text-gray-400'}`}>{liga.nome}</h3>
                          <button onClick={() => preencherEdicao(liga)} className="shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-yellow-500/[0.08] hover:text-yellow-500" title="Editar campeonato" aria-label={`Editar ${liga.nome}`}>
                            <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-gray-600">
                          <span className="font-mono">{liga.ano}</span>
                          <span className="inline-flex items-center gap-1.5 text-gray-500"><TypeIcon size={11} strokeWidth={1.8} aria-hidden="true" /> {info.label}</span>
                          {isPagaLocal && <span className="text-yellow-500/75">Liga paga</span>}
                          {isDecimal && <span className="text-yellow-500/75">Pontuação decimal</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-end gap-2 border-t border-white/[0.06] pt-3 sm:w-auto sm:border-0 sm:pt-0">
                      <button onClick={() => handleFinalizar(liga.id, isAtivo)} title={isAtivo ? 'Finalizar campeonato' : 'Reabrir campeonato'} aria-label={isAtivo ? `Finalizar ${liga.nome}` : `Reabrir ${liga.nome}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-gray-500 transition-colors hover:border-yellow-500/25 hover:bg-yellow-500/[0.07] hover:text-yellow-500">
                        {isAtivo ? <CircleCheckBig size={16} strokeWidth={1.8} aria-hidden="true" /> : <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />}
                      </button>
                      <button onClick={() => handleExcluir(liga.id)} title="Excluir campeonato" aria-label={`Excluir ${liga.nome}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/15 text-red-500/55 transition-colors hover:border-red-500/35 hover:bg-red-500/[0.06] hover:text-red-400">
                        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <Link href={`/admin/ligas/${liga.id}`} className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.045] px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-yellow-500/25 hover:bg-yellow-500/[0.07] active:translate-y-px">
                        Gerenciar <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
