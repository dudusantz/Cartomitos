"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, RefreshCw, ChevronDown, ChevronUp, History, LayoutGrid, List, Swords, Users } from "lucide-react";
import { buscarComparativoConfronto, buscarDetalhesConfrontoAoVivo } from "@/app/actions";
import { teamPath } from "@/lib/routes";
import toast from "react-hot-toast";

interface Props {
  jogo: any;
  onClose: () => void;
}

export default function ModalConfrontoAoVivo({ jogo, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [comparativo, setComparativo] = useState<any[]>([]);
  const [loadingComparativo, setLoadingComparativo] = useState(true);
  const [activeSection, setActiveSection] = useState<'lineups' | 'history'>('lineups');
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');

  useEffect(() => {
    setActiveSection('lineups');
    setViewMode(window.matchMedia('(max-width: 767px)').matches ? 'list' : 'pitch');
    carregarDetalhes();
  }, [jogo]);

  async function carregarDetalhes() {
    setLoading(true);
    setLoadingComparativo(true);
    const idCasa = Array.isArray(jogo.casa) ? jogo.casa[0]?.time_id_cartola : jogo.casa?.time_id_cartola;
    const idVis = Array.isArray(jogo.visitante) ? jogo.visitante[0]?.time_id_cartola : jogo.visitante?.time_id_cartola;
    const timeCasaId = Array.isArray(jogo.casa) ? jogo.casa[0]?.id : jogo.casa?.id;
    const timeVisitanteId = Array.isArray(jogo.visitante) ? jogo.visitante[0]?.id : jogo.visitante?.id;
    
    const rodadaCartola = jogo.rodada_cartola ?? jogo.rodada;

    const [res, resComparativo] = await Promise.all([
      idCasa && idVis ? buscarDetalhesConfrontoAoVivo(idCasa, idVis, rodadaCartola) : Promise.resolve(null),
      timeCasaId && timeVisitanteId ? buscarComparativoConfronto(timeCasaId, timeVisitanteId) : Promise.resolve(null),
    ]);

    if (res) {
      if (res.success) setDados(res);
      else {
        setDados(null);
        toast.error(res.msg || "Não foi possível carregar os dados deste confronto.");
      }
    }
    setComparativo(resComparativo?.success ? resComparativo.partidas : []);
    setLoading(false);
    setLoadingComparativo(false);
  }

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();
  const finalizado = jogo.status === 'finalizado';
  const rodadaExibida = jogo.rodada_cartola ?? jogo.rodada;
  const perfilCasa = Array.isArray(jogo.casa) ? jogo.casa[0] : jogo.casa;
  const perfilVisitante = Array.isArray(jogo.visitante) ? jogo.visitante[0] : jogo.visitante;
  const campeonatoAtual = Array.isArray(jogo.campeonato) ? jogo.campeonato[0] : jogo.campeonato;
  const possuiEscalacoes = Boolean(dados?.casa?.titulares?.length || dados?.visitante?.titulares?.length);
  const statusLabel = finalizado ? 'Confronto encerrado' : possuiEscalacoes ? 'Parcial em andamento' : 'Escalações indisponíveis';
  const statusColor = finalizado ? 'text-yellow-400' : possuiEscalacoes ? 'text-green-400' : 'text-slate-400';
  const statusDot = finalizado ? 'bg-yellow-400' : possuiEscalacoes ? 'animate-pulse bg-green-400' : 'bg-slate-500';
  const casaExibida = dados ? {
    ...dados.casa,
    nome: perfilCasa?.nome || dados.casa.nome,
    escudo: perfilCasa?.escudo || dados.casa.escudo || '/shield-placeholder.png',
  } : null;
  const visitanteExibido = dados ? {
    ...dados.visitante,
    nome: perfilVisitante?.nome || dados.visitante.nome,
    escudo: perfilVisitante?.escudo || dados.visitante.escudo || '/shield-placeholder.png',
  } : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-0 backdrop-blur-lg md:p-5" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-[1180px] animate-fadeIn flex-col overflow-hidden rounded-none border-0 bg-[#090a09] shadow-[0_35px_120px_rgba(0,0,0,0.75)] md:h-[92vh] md:rounded-3xl md:border md:border-white/[0.1]" onClick={handleContentClick}>
        
        <header className="z-[110] flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#131513] px-4 py-3.5 md:px-6">
          <div>
            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] ${statusColor}`}><span className={`h-2 w-2 rounded-full ${statusDot}`} /> {statusLabel}</div>
            <h2 className="mt-0.5 text-sm font-black tracking-[-0.015em] text-white md:text-base">Central do confronto <span className="font-medium text-gray-600">· Rodada {rodadaExibida}</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {/* BOTÃO TOGGLE CAMPINHO/LISTA */}
            {activeSection === 'lineups' && <button
                onClick={() => setViewMode(prev => prev === 'pitch' ? 'list' : 'pitch')} 
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-300 transition hover:bg-white/[0.07] hover:text-white md:px-3"
            >
                {viewMode === 'pitch' ? <List size={14} /> : <LayoutGrid size={14} />}
                <span className="hidden sm:inline">{viewMode === 'pitch' ? 'Ver Lista' : 'Ver Campo'}</span>
            </button>}
            
            <button onClick={carregarDetalhes} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#090a09] px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 transition hover:text-white md:px-3">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Atualizar</span>
            </button>
            
            <button onClick={onClose} aria-label="Fechar confronto" className="rounded-lg border border-white/[0.08] bg-[#090a09] p-1.5 text-gray-500 transition hover:border-red-500/30 hover:text-red-400">
              <X size={18} />
            </button>
          </div>
        </header>

        <nav className="grid shrink-0 grid-cols-2 border-b border-white/[0.07] bg-[#0d0f0d] p-1.5 sm:flex sm:px-6" aria-label="Detalhes do confronto">
          <button onClick={() => setActiveSection('lineups')} aria-current={activeSection === 'lineups' ? 'page' : undefined} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[10px] font-black transition ${activeSection === 'lineups' ? 'bg-white/[0.07] text-white' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={14} /> Escalações</button>
          <button onClick={() => setActiveSection('history')} aria-current={activeSection === 'history' ? 'page' : undefined} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[10px] font-black transition ${activeSection === 'history' ? 'bg-yellow-400 text-[#11130f]' : 'text-slate-500 hover:text-white'}`}><History size={14} /> Retrospecto</button>
        </nav>

        <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.035),transparent_34%)] p-4 md:p-6">
          {activeSection === 'history' ? (
            <RetrospectoConfronto partidas={comparativo} casa={perfilCasa} visitante={perfilVisitante} anoAtual={campeonatoAtual?.ano} loading={loadingComparativo} />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
              <RefreshCw size={28} className="animate-spin text-yellow-500" />
              <p className="font-bold text-[10px] uppercase tracking-widest text-center">Processando dados oficiais...</p>
            </div>
          ) : dados ? (
            <div className="mx-auto max-w-[1080px] pb-8">
              <MatchScoreHero casa={casaExibida} visitante={visitanteExibido} perfilCasa={perfilCasa} perfilVisitante={perfilVisitante} finalizado={finalizado} possuiEscalacoes={possuiEscalacoes} onNavigate={onClose} />
              {possuiEscalacoes ? (
                <div className={`mt-5 grid lg:grid-cols-2 lg:gap-6 ${viewMode === 'list' ? 'grid-cols-2 gap-2.5' : 'grid-cols-1 gap-8'}`}>
                  <TeamColumn team={casaExibida} isCasa={true} viewMode={viewMode} />
                  <TeamColumn team={visitanteExibido} isCasa={false} viewMode={viewMode} />
                </div>
              ) : (
                <section className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#0e100e] px-6 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-500"><Users size={22} /></span>
                  <h3 className="mt-4 text-base font-black text-white">Escalações ainda não disponíveis</h3>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">Os times permanecem com pontuação zero até a API do Cartola publicar as escalações desta rodada.</p>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 font-bold uppercase text-xs tracking-widest">Erro ao carregar dados da rodada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchScoreHero({ casa, visitante, perfilCasa, perfilVisitante, finalizado, possuiEscalacoes, onNavigate }: { casa: any, visitante: any, perfilCasa?: any, perfilVisitante?: any, finalizado: boolean, possuiEscalacoes: boolean, onNavigate: () => void }) {
  const scoreCasa = Math.trunc(casa.pontos || 0);
  const scoreVisitante = Math.trunc(visitante.pontos || 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121412]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-3 py-4 md:gap-8 md:px-8 md:py-5">
        <div className="flex min-w-0 flex-col items-center gap-2 text-center md:flex-row md:gap-4 md:text-left">
          <img src={casa.escudo} className="h-10 w-10 shrink-0 object-contain md:h-14 md:w-14" alt={`Escudo ${casa.nome}`} />
          <div className="min-w-0"><span className="text-[7px] font-bold uppercase tracking-[0.1em] text-gray-600 md:text-[8px]">Mandante</span>{perfilCasa?.id ? <Link href={teamPath(perfilCasa)} onClick={onNavigate} className="line-clamp-2 min-h-7 rounded-sm text-[10px] font-black leading-tight text-white outline-none transition-colors hover:text-yellow-400 focus-visible:ring-2 focus-visible:ring-yellow-400 md:block md:min-h-0 md:truncate md:text-base">{casa.nome}</Link> : <h3 className="line-clamp-2 min-h-7 text-[10px] font-black leading-tight text-white md:min-h-0 md:truncate md:text-base">{casa.nome}</h3>}</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080908] px-2.5 py-2 font-mono text-xl font-black tabular-nums text-white md:gap-3 md:px-5 md:text-3xl">
          <span>{scoreCasa}</span><span className="text-sm text-gray-700">×</span><span>{scoreVisitante}</span>
        </div>
        <div className="flex min-w-0 flex-col-reverse items-center gap-2 text-center md:flex-row md:justify-end md:gap-4 md:text-right">
          <div className="min-w-0"><span className="text-[7px] font-bold uppercase tracking-[0.1em] text-gray-600 md:text-[8px]">Visitante</span>{perfilVisitante?.id ? <Link href={teamPath(perfilVisitante)} onClick={onNavigate} className="line-clamp-2 min-h-7 rounded-sm text-[10px] font-black leading-tight text-white outline-none transition-colors hover:text-yellow-400 focus-visible:ring-2 focus-visible:ring-yellow-400 md:block md:min-h-0 md:truncate md:text-base">{visitante.nome}</Link> : <h3 className="line-clamp-2 min-h-7 text-[10px] font-black leading-tight text-white md:min-h-0 md:truncate md:text-base">{visitante.nome}</h3>}</div>
          <img src={visitante.escudo} className="h-10 w-10 shrink-0 object-contain md:h-14 md:w-14" alt={`Escudo ${visitante.nome}`} />
        </div>
      </div>
      <div className={`flex items-center justify-center gap-2 border-t border-white/[0.06] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.12em] ${finalizado ? 'text-yellow-400' : possuiEscalacoes ? 'text-green-400' : 'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${finalizado ? 'bg-yellow-400' : possuiEscalacoes ? 'animate-pulse bg-green-400' : 'bg-slate-600'}`} /> {finalizado ? 'Pontuação final da rodada' : possuiEscalacoes ? 'Pontuação parcial da rodada' : 'Aguardando escalações da rodada'}</div>
    </section>
  );
}

function RetrospectoConfronto({ partidas, casa, visitante, anoAtual, loading }: { partidas: any[]; casa: any; visitante: any; anoAtual?: number; loading: boolean }) {
  const [periodo, setPeriodo] = useState<'season' | 'all'>('season');
  const uniqueMatches = Array.from(new Map(partidas.map((partida) => [partida.id, partida])).values());
  const years = uniqueMatches.map((partida) => {
    const camp = Array.isArray(partida.campeonato) ? partida.campeonato[0] : partida.campeonato;
    return Number(camp?.ano || 0);
  }).filter(Boolean);
  const referenceYear = anoAtual || Math.max(0, ...years);
  const filtered = uniqueMatches.filter((partida) => {
    if (periodo === 'all') return true;
    const camp = Array.isArray(partida.campeonato) ? partida.campeonato[0] : partida.campeonato;
    return Number(camp?.ano) === referenceYear;
  }).sort((a, b) => {
    const campA = Array.isArray(a.campeonato) ? a.campeonato[0] : a.campeonato;
    const campB = Array.isArray(b.campeonato) ? b.campeonato[0] : b.campeonato;
    return Number(campB?.ano || 0) - Number(campA?.ano || 0)
      || Number(b.rodada_cartola || 0) - Number(a.rodada_cartola || 0)
      || b.id - a.id;
  });
  const scores = filtered.map((partida) => ({
    casa: Number(partida.placar_casa || 0),
    visitante: Number(partida.placar_visitante || 0),
    partida,
  }));
  const winsCasa = scores.filter(({ casa: scoreCasa, visitante: scoreVisitante, partida }) => partida.time_casa === casa?.id ? scoreCasa > scoreVisitante : scoreVisitante > scoreCasa).length;
  const winsVisitante = scores.filter(({ casa: scoreCasa, visitante: scoreVisitante, partida }) => partida.time_casa === visitante?.id ? scoreCasa > scoreVisitante : scoreVisitante > scoreCasa).length;
  const draws = scores.length - winsCasa - winsVisitante;
  const pointsCasa = scores.map(({ casa: scoreCasa, visitante: scoreVisitante, partida }) => partida.time_casa === casa?.id ? scoreCasa : scoreVisitante);
  const pointsVisitante = scores.map(({ casa: scoreCasa, visitante: scoreVisitante, partida }) => partida.time_casa === visitante?.id ? scoreCasa : scoreVisitante);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  if (loading) return <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-slate-500"><RefreshCw size={26} className="animate-spin text-yellow-400" /><p className="text-[10px] font-bold uppercase tracking-[0.12em]">Calculando retrospecto...</p></div>;

  return <div className="mx-auto max-w-[920px] pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="text-[9px] font-black uppercase tracking-[0.15em] text-yellow-400">Comparativo entre adversários</span><h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Histórico do confronto</h3><p className="mt-1 text-xs text-slate-500">Somente partidas com resultado confirmado.</p></div>
      <div className="grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/30 p-1">
        <button onClick={() => setPeriodo('season')} className={`rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition ${periodo === 'season' ? 'bg-yellow-400 text-black' : 'text-slate-500 hover:text-white'}`}>Temporada {referenceYear || ''}</button>
        <button onClick={() => setPeriodo('all')} className={`rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition ${periodo === 'all' ? 'bg-yellow-400 text-black' : 'text-slate-500 hover:text-white'}`}>Histórico geral</button>
      </div>
    </div>

    <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111410]">
      <div className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] grid-rows-[56px_32px_20px] items-center gap-x-2 px-3 py-5 text-center sm:hidden">
        <img src={casa?.escudo || '/shield-placeholder.png'} alt={`Escudo do ${casa?.nome || 'mandante'}`} className="col-start-1 row-start-1 mx-auto h-14 w-14 object-contain" />
        <strong className="col-start-1 row-start-2 line-clamp-2 w-full self-start text-[11px] leading-tight text-white">{casa?.nome || 'Mandante'}</strong>
        <span className="col-start-1 row-start-3 self-end whitespace-nowrap font-mono text-[9px] text-slate-500">Média {average(pointsCasa).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
        <div className="col-start-2 row-span-3 row-start-1 self-center"><div className="flex items-center justify-center gap-1.5"><span className="font-mono text-3xl font-black text-emerald-400">{winsCasa}</span><Swords size={14} className="text-slate-700" /><span className="font-mono text-3xl font-black text-emerald-400">{winsVisitante}</span></div><p className="mt-2 text-[8px] font-bold uppercase leading-relaxed tracking-[0.07em] text-slate-500">{scores.length} {scores.length === 1 ? 'jogo' : 'jogos'}<br />{draws} {draws === 1 ? 'empate' : 'empates'}</p></div>
        <img src={visitante?.escudo || '/shield-placeholder.png'} alt={`Escudo do ${visitante?.nome || 'visitante'}`} className="col-start-3 row-start-1 mx-auto h-14 w-14 object-contain" />
        <strong className="col-start-3 row-start-2 line-clamp-2 w-full self-start text-[11px] leading-tight text-white">{visitante?.nome || 'Visitante'}</strong>
        <span className="col-start-3 row-start-3 self-end whitespace-nowrap font-mono text-[9px] text-slate-500">Média {average(pointsVisitante).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-8 px-8 py-5 sm:grid">
        <div className="flex min-w-0 flex-col items-center text-center"><img src={casa?.escudo || '/shield-placeholder.png'} alt={`Escudo do ${casa?.nome || 'mandante'}`} className="h-20 w-20 object-contain" /><strong className="mt-3 max-w-full truncate text-base text-white">{casa?.nome || 'Mandante'}</strong><span className="mt-1 font-mono text-[10px] text-slate-500">Média {average(pointsCasa).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span></div>
        <div className="text-center"><div className="flex items-center justify-center gap-2"><span className="font-mono text-4xl font-black text-emerald-400">{winsCasa}</span><Swords size={16} className="text-slate-700" /><span className="font-mono text-4xl font-black text-emerald-400">{winsVisitante}</span></div><p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{scores.length} {scores.length === 1 ? 'jogo' : 'jogos'} · {draws} {draws === 1 ? 'empate' : 'empates'}</p></div>
        <div className="flex min-w-0 flex-col items-center text-center"><img src={visitante?.escudo || '/shield-placeholder.png'} alt={`Escudo do ${visitante?.nome || 'visitante'}`} className="h-20 w-20 object-contain" /><strong className="mt-3 max-w-full truncate text-base text-white">{visitante?.nome || 'Visitante'}</strong><span className="mt-1 font-mono text-[10px] text-slate-500">Média {average(pointsVisitante).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span></div>
      </div>
    </section>

    <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111410]">
      <div className="border-b border-white/[0.07] px-4 py-4 sm:px-6"><h4 className="text-sm font-black text-white">Últimos cinco confrontos</h4><p className="mt-1 text-[10px] text-slate-500">Do mais recente para o mais antigo.</p></div>
      {scores.length ? <div className="divide-y divide-white/[0.06]">{scores.slice(0, 5).map(({ partida, casa: scoreCasa, visitante: scoreVisitante }) => {
        const home = Array.isArray(partida.casa) ? partida.casa[0] : partida.casa;
        const away = Array.isArray(partida.visitante) ? partida.visitante[0] : partida.visitante;
        const camp = Array.isArray(partida.campeonato) ? partida.campeonato[0] : partida.campeonato;
        return <article key={partida.id} className="px-3 py-3.5 sm:px-6 sm:py-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.045] pb-2 text-[8px] font-bold uppercase tracking-[0.07em] text-slate-600"><span className="min-w-0 truncate">{camp?.nome || 'Campeonato'}</span><span className="shrink-0">Rodada {partida.rodada_cartola || partida.rodada} do Cartola</span></div>
          <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] grid-rows-[40px_28px] items-center gap-x-1.5 text-center sm:hidden">
            <img src={home?.escudo || '/shield-placeholder.png'} alt="" className="col-start-1 row-start-1 mx-auto h-9 w-9 object-contain" />
            <span className="col-start-1 row-start-2 line-clamp-2 w-full self-start text-[9px] font-bold leading-tight text-slate-300">{home?.nome}</span>
            <div className="col-start-2 row-span-2 row-start-1 min-w-24 self-center whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/30 px-2 py-2 text-center font-mono text-sm font-black tabular-nums text-white">{Math.trunc(scoreCasa)} <span className="px-0.5 text-slate-700">:</span> {Math.trunc(scoreVisitante)}</div>
            <img src={away?.escudo || '/shield-placeholder.png'} alt="" className="col-start-3 row-start-1 mx-auto h-9 w-9 object-contain" />
            <span className="col-start-3 row-start-2 line-clamp-2 w-full self-start text-[9px] font-bold leading-tight text-slate-300">{away?.nome}</span>
          </div>
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)] items-center gap-2 sm:grid">
            <div className="flex min-w-0 items-center justify-end gap-2 text-right"><span className="truncate text-xs font-bold text-slate-300">{home?.nome}</span><img src={home?.escudo || '/shield-placeholder.png'} alt="" className="h-9 w-9 shrink-0 object-contain" /></div>
            <div className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-black/30 px-2 py-2 text-center font-mono text-base font-black tabular-nums text-white">{Math.trunc(scoreCasa)} <span className="text-slate-700">:</span> {Math.trunc(scoreVisitante)}</div>
            <div className="flex min-w-0 items-center gap-2"><img src={away?.escudo || '/shield-placeholder.png'} alt="" className="h-9 w-9 shrink-0 object-contain" /><span className="truncate text-xs font-bold text-slate-300">{away?.nome}</span></div>
          </div>
        </article>;
      })}</div> : <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center"><History size={22} className="text-slate-700" /><h4 className="mt-3 text-sm font-black text-white">Ainda não houve confrontos</h4><p className="mt-1 text-xs text-slate-500">Nenhum resultado foi confirmado para o período selecionado.</p></div>}
    </section>
  </div>;
}

function LuxoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4 C14 10 18 13 22 14 M22 14 L18 17 M22 14 L18 10" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20 C10 14 6 11 2 10 M2 10 L6 7 M2 10 L6 13" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconEntrou({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-green-500 rounded-full border-[1.5px] border-black shadow-[0_0_8px_rgba(34,197,94,0.6)] ${className}`}>
      <ChevronUp size={14} className="text-black" strokeWidth={4} />
    </div>
  );
}

function IconSaiu({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-red-600 rounded-full border-[1.5px] border-black shadow-[0_0_5px_rgba(220,38,38,0.6)] ${className}`}>
      <ChevronDown size={14} className="text-white" strokeWidth={4} />
    </div>
  );
}

function TeamColumn({ team, isCasa, viewMode }: { team: any, isCasa: boolean, viewMode: 'pitch' | 'list' }) {
    
    const currentPitchPlayers = team.titulares.map((t: any) => {
        const tId = String(t.id || t.atleta_id);
        const isLuxo = t.isLuxo || t.luxo;

        if (t.substituidoPor) {
            return {
                ...t.substituidoPor,
                isSubIn: true,
                posicao_id: t.substituidoPor.posicao_id || t.posicao_id,
            };
        }
        
        let isHistoricalSubIn = false;
        if (team.substituicoes && Array.isArray(team.substituicoes)) {
            const subEvent = team.substituicoes.find((sub: any) => 
                String(sub.entrou?.atleta_id || sub.entrou?.id || sub.entrou) === tId
            );
            if (subEvent && subEvent.saiu) {
                isHistoricalSubIn = true;
            }
        }

        const cameFromBench = team.reservas?.some((r: any) => String(r.id || r.atleta_id) === tId);
        const hasEntered = t.isSubIn || t.entrou || t.usado || isLuxo || cameFromBench || isHistoricalSubIn;

        if (hasEntered) {
            return { ...t, isSubIn: true };
        }

        return t; 
    }); 

    const inFieldIds: string[] = currentPitchPlayers.map((p:any) => String(p.id || p.atleta_id));

    let activeBenchPlayers = team.reservas ? [...team.reservas] : [];

    team.titulares.forEach((t: any) => {
        if (t.substituidoPor) {
            activeBenchPlayers.push({ ...t, isSubOut: true, substituidoPor: undefined });
        }
    });

    if (team.substituicoes && Array.isArray(team.substituicoes)) {
        team.substituicoes.forEach((sub: any) => {
            const saiu = sub.saiu;
            if (saiu && typeof saiu === 'object') {
                const idSaiu = String(saiu.atleta_id || saiu.id);
                const bancoIndex = activeBenchPlayers.findIndex(r => String(r.id || r.atleta_id) === idSaiu);
                
                if (bancoIndex >= 0) {
                    activeBenchPlayers[bancoIndex].isSubOut = true;
                } else {
                    const ptsSaiu = saiu.pontuacao !== undefined ? parseFloat(saiu.pontuacao) : (saiu.pontos_num || 0);
                    activeBenchPlayers.push({
                        id: idSaiu,
                        nome: saiu.apelido || saiu.nome,
                        foto: saiu.foto ? saiu.foto.replace('FORMATO', '140x140') : '/user-placeholder.png',
                        posicao_id: saiu.posicao_id || 1,
                        posicao: "SAIU",
                        pontosCalculados: ptsSaiu,
                        pontos: ptsSaiu,
                        isSubOut: true,
                        jogou: ptsSaiu !== 0 
                    });
                }
            }
        });
    }

    activeBenchPlayers = activeBenchPlayers.filter((r: any) => {
        const rId = String(r.id || r.atleta_id);
        if (r.isSubOut) return true; 
        if (inFieldIds.includes(rId)) return false; 
        return true; 
    });

    const ordemPosicao: Record<number, number> = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    activeBenchPlayers.sort((a: any, b: any) => {
        const pesoA = ordemPosicao[a.posicao_id] || 99;
        const pesoB = ordemPosicao[b.posicao_id] || 99;
        return pesoA - pesoB;
    });

    return (
        <section className={`mx-auto flex h-auto w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e100e] md:gap-5 md:p-4 ${viewMode === 'list' ? 'gap-2 p-2' : 'gap-3 p-2.5'}`}>
            <div className={`flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] ${viewMode === 'list' ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
              <div className="flex min-w-0 items-center gap-2">
                <img src={team.escudo || '/shield-placeholder.png'} alt={`Escudo do ${team.nome}`} className={`${viewMode === 'list' ? 'h-6 w-6' : 'h-9 w-9'} shrink-0 object-contain`} />
                <div className="min-w-0"><span className="block text-[7px] font-bold uppercase tracking-[0.11em] text-gray-600 md:text-[9px]">{isCasa ? 'Mandante' : 'Visitante'}</span><strong className={`block text-white ${viewMode === 'list' ? 'line-clamp-2 text-[8px] leading-tight' : 'truncate text-xs'}`}>{team.nome}</strong></div>
              </div>
              <div className="shrink-0 text-right"><span className="block text-[7px] font-bold uppercase tracking-[0.08em] text-gray-600">Total</span><strong className={`${viewMode === 'list' ? 'text-xs' : 'text-lg'} font-mono font-black tabular-nums text-emerald-400`}>{Math.trunc(team.pontos || 0)}</strong></div>
            </div>
            
            {/* RENDER CONDICIONAL: CAMPINHO VS LISTA */}
            {viewMode === 'pitch' ? (
                <HalfField fieldPlayers={currentPitchPlayers} />
            ) : (
                <FieldList fieldPlayers={currentPitchPlayers} isCasa={isCasa} />
            )}

            <BenchList benchPlayers={activeBenchPlayers} isCasa={isCasa} />
        </section>
    );
}

function HalfField({ fieldPlayers }: { fieldPlayers: any[] }) {
  const playersByPos: Record<number, any[]> = {};
  fieldPlayers.forEach(p => {
    if (!playersByPos[p.posicao_id]) playersByPos[p.posicao_id] = [];
    playersByPos[p.posicao_id].push(p);
  });

  return (
    <div className="relative aspect-[4/5] min-h-[400px] w-full shrink-0 animate-fadeIn overflow-hidden rounded-xl border-[3px] border-[#1a211c] bg-[repeating-linear-gradient(90deg,#075a2d_0,#075a2d_12.5%,#064f28_12.5%,#064f28_25%)] shadow-[inset_0_0_55px_rgba(0,0,0,.28),0_18px_45px_rgba(0,0,0,0.3)] md:min-h-[430px] md:border-[4px]">
        <div className="pointer-events-none absolute inset-3 z-0 rounded border-2 border-white/20 md:border-[3px]"></div>
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-[2px] bg-white/20 md:h-[3px]"></div>
        <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-14 w-28 -translate-x-1/2 rounded-b-full border-2 border-white/20 md:h-18 md:w-36 md:border-[3px]"></div>
        
        <div className="absolute bottom-3 left-1/2 w-44 h-22 md:w-52 md:h-26 border-[2px] md:border-[3px] border-white/20 -translate-x-1/2 pointer-events-none z-0"></div>
        <div className="absolute bottom-3 left-1/2 w-18 h-8 md:w-22 md:h-10 border-[2px] md:border-[3px] border-white/20 -translate-x-1/2 pointer-events-none z-0"></div>

        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {fieldPlayers.map((atleta) => {
            const indexNaPos = playersByPos[atleta.posicao_id]?.indexOf(atleta) || 0;
            const totalNaPos = playersByPos[atleta.posicao_id]?.length || 1;
            const coords = getCoordinatesByPosition(atleta.posicao_id, indexNaPos, totalNaPos);
            
            return (
              <PlayerPin 
                  key={atleta.id} 
                  atleta={atleta} 
                  style={coords} 
                  isDNP={!atleta.jogou} 
              />
            );
        })}
        </div>
    </div>
  );
}

function getCoordinatesByPosition(posicaoId: number, indexNaPosicao: number, totalNaPosicao: number) {
    let y = 50; let x = 50;
    switch (posicaoId) {
      case 1: y = 88; x = 50; break;
      case 2: y = 65; x = indexNaPosicao === 0 ? 12 : 88; break;
      case 3: y = 65; if (totalNaPosicao === 2) x = indexNaPosicao === 0 ? 35 : 65; else x = [25, 50, 75][indexNaPosicao]; break;
      case 4: y = 38; if (totalNaPosicao === 3) x = [25, 50, 75][indexNaPosicao]; else if (totalNaPosicao === 4) x = [18, 38, 62, 82][indexNaPosicao]; else x = [10, 30, 50, 70, 90][indexNaPosicao]; break;
      case 5: y = 15; if (totalNaPosicao === 1) x = 50; else if (totalNaPosicao === 2) x = [30, 70][indexNaPosicao]; else x = [15, 50, 85][indexNaPosicao]; break;
      case 6: y = 88; x = 85; break; 
    }
    return { top: `${y}%`, left: `${x}%` };
}

function PlayerPin({ atleta, style, isDNP }: { atleta: any, style: React.CSSProperties, isDNP: boolean }) {

  const pts = atleta.pontosCalculados ?? atleta.pontos;
  const basePts = atleta.pontos; 
  
  let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
  let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

  if (isDNP && !atleta.isSubIn) {
      colorClass = 'text-gray-500';
      baseColorClass = 'text-gray-500';
  }

  const borderColor = atleta.isSubIn ? 'border-green-500' :
                       atleta.isCapitao ? 'border-yellow-500' :
                       atleta.isLuxo ? 'border-orange-500' :
                       'border-[#151515] group-hover:border-gray-400';

  return (
    <div className="group pointer-events-auto absolute z-10 flex w-[58px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 hover:z-30 md:w-[70px] md:gap-1" style={style}>
      <div className="relative shrink-0">
        <img 
            src={atleta.foto} 
            className={`h-8 w-8 rounded-full border-2 bg-black object-cover shadow-[0_5px_15px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-110 md:h-12 md:w-12 md:border-[2.5px] ${borderColor}`}
            alt={`Foto de ${atleta.nome}`}
        />
        
        {atleta.isSubIn && (
            <IconEntrou className="absolute -top-1 -left-1 md:-top-1.5 md:-left-1.5 w-4 h-4 md:w-5 md:h-5 z-20" />
        )}
        
        {atleta.isCapitao && (
          <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 bg-yellow-500 w-4 h-4 md:w-5.5 md:h-5.5 rounded-full border border-black flex items-center justify-center z-10 shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            <span className="text-black font-black text-[10px] md:text-[13px] leading-none">C</span>
          </div>
        )}
        
        {atleta.isLuxo && (
          <div className="absolute -bottom-1 -right-1 md:-bottom-1.5 md:-right-1.5 bg-black rounded-full border border-black flex items-center justify-center z-10 shadow-[0_0_10px_rgba(249,115,22,0.6)]">
            <LuxoIcon className="w-3 h-3 md:w-4 md:h-4" />
          </div>
        )}
      </div>
      
      <div className="flex min-h-8 w-[112%] flex-col items-center justify-center rounded border border-white/10 bg-black/90 px-1 py-1 text-center shadow-lg backdrop-blur-sm transition-colors group-hover:border-gray-400 group-hover:bg-[#1a1a1a] md:min-h-0 md:w-[125%] md:px-1.5 md:py-1.5">
        
        <div className="flex items-center justify-center gap-0.5 w-full mb-0.5">
            {atleta.isCapitao && <span className="text-yellow-400 font-black text-[7px] md:text-[9px] shrink-0 leading-none">C</span>}
            {atleta.isLuxo && <LuxoIcon className="w-2 h-2 md:w-2.5 md:h-2.5 shrink-0" />}
            <span className="line-clamp-2 text-[5.5px] font-black uppercase leading-[1.1] tracking-[0.02em] text-gray-100 md:block md:truncate md:text-[8px] md:tracking-wide">{atleta.nome}</span>
        </div>
        
        <div className="flex items-center justify-center w-full whitespace-nowrap mt-[1px]">
            {isDNP && !atleta.isSubIn ? (
                <span className="text-gray-500 font-black font-mono text-[9px] md:text-[12px] leading-none">-</span>
            ) : atleta.isCapitao ? (
                <div className="flex flex-col items-center justify-center">
                    <span className={`${colorClass} font-black font-mono text-[9px] md:text-[11px] leading-none mt-[1px]`}>
                        {pts.toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center gap-[2px] mt-[2px] md:mt-[3px] opacity-95">
                        <span className={`${baseColorClass} font-mono font-bold text-[6px] md:text-[8px] leading-none`}>{basePts.toFixed(1)}</span>
                        <span className="text-yellow-500 font-black text-[6px] md:text-[8px] leading-none">x1.5</span>
                    </div>
                </div>
            ) : (
                <span className={`${colorClass} font-black font-mono text-[8px] md:text-[11px] leading-none mt-[1px]`}>
                    {pts.toFixed(1)}
                </span>
            )}
        </div>
      </div>
    </div>
  );
}

// NOVA LISTA TÁTICA COMO ALTERNATIVA AO CAMPINHO
function FieldList({ fieldPlayers, isCasa }: { fieldPlayers: any[], isCasa: boolean }) {
    if (!fieldPlayers || fieldPlayers.length === 0) return null;
    const borderColor = isCasa ? 'border-blue-900/30' : 'border-red-900/30';
    const bgContainer = isCasa ? 'bg-blue-950/5' : 'bg-red-950/5';

    const ordemPosicao: Record<number, number> = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    const sortedPlayers = [...fieldPlayers].sort((a: any, b: any) => {
        const pesoA = ordemPosicao[a.posicao_id] || 99;
        const pesoB = ordemPosicao[b.posicao_id] || 99;
        return pesoA - pesoB;
    });

    return (
        <div className={`border ${borderColor} ${bgContainer} h-auto w-full animate-fadeIn rounded-xl p-1 shadow-lg md:rounded-2xl md:p-4`}>
            <div className="mb-2 flex items-center gap-1 text-[6px] font-bold uppercase tracking-[0.06em] text-gray-500 md:mb-3.5 md:gap-2 md:text-[10px] md:tracking-widest">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span>Titulares / Entraram</span>
                <div className="flex-1 h-px bg-gray-800"></div>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
                {sortedPlayers.map((atleta: any, idx: number) => (
                    <FieldPlayerCard key={`${atleta.id}-${idx}`} atleta={atleta} />
                ))}
            </div>
        </div>
    );
}

function FieldPlayerCard({ atleta }: { atleta: any }) {
    const pts = atleta.pontosCalculados ?? atleta.pontos;
    const basePts = atleta.pontos; 
    const isDNP = !atleta.jogou;

    let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
    let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

    if (isDNP && !atleta.isSubIn) {
        colorClass = 'text-gray-500';
        baseColorClass = 'text-gray-500';
    }

    return (
        <div className="flex min-h-13 items-stretch justify-between gap-1 rounded-lg border border-white/[0.08] bg-[#151815] p-1.5 transition-colors hover:bg-[#1a1d1a] md:min-h-0 md:items-center md:gap-2 md:rounded-xl md:p-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-3.5">
                <div className="relative shrink-0">
                    <img 
                        src={atleta.foto} 
                        className={`h-8 w-8 rounded-full border bg-black object-cover shadow-inner md:h-9 md:w-9 ${atleta.isSubIn ? 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : atleta.isCapitao ? 'border-yellow-500' : atleta.isLuxo ? 'border-orange-500' : 'border-gray-700'}`}
                        alt={`Foto de ${atleta.nome}`}
                    />
                    
                    {atleta.isSubIn && (
                        <IconEntrou className="absolute -top-1 -left-1 w-4 h-4 z-10" />
                    )}
                    
                    {!atleta.isSubIn && atleta.isLuxo && (
                      <div className="absolute -bottom-1 -right-1.5 w-4 h-4 bg-black rounded-full border border-black z-10 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                        <LuxoIcon className="w-2.5 h-2.5" />
                      </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className="min-w-0 [overflow-wrap:anywhere] text-[7px] font-black uppercase leading-[1.2] text-gray-100 md:truncate md:text-[10px]">{atleta.nome}</span>
                        {atleta.isCapitao && <span className="shrink-0 rounded border border-yellow-500/30 bg-yellow-950 px-1 py-0.5 text-[7px] font-black text-yellow-400">C</span>}
                        {atleta.isLuxo && <span className="shrink-0 rounded border border-orange-500/30 bg-orange-950/40 px-1 py-0.5 text-[7px] font-black text-orange-400">LUXO</span>}
                    </div>
                    <span className="mt-1 text-[6px] uppercase leading-none text-gray-500 md:text-[8px]">
                        {atleta.posicao} {atleta.isSubIn && <span className="text-green-500 font-bold ml-1">ENTROU</span>}
                    </span>
                </div>
            </div>
            
            <div className="flex min-w-9 shrink-0 flex-col items-center justify-center rounded-md border border-white/[0.08] bg-black/45 px-1 py-1 md:ml-1 md:min-w-0 md:items-end md:rounded-lg md:px-2.5">
                {isDNP && !atleta.isSubIn ? (
                    <span className="text-[11px] md:text-xs font-black font-mono text-gray-500">-</span>
                ) : atleta.isCapitao ? (
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} text-[11px] md:text-[12px] font-black font-mono leading-none mt-[1px]`}>{pts.toFixed(1)}</span>
                        <div className="flex items-center gap-[2px] mt-[3px] opacity-95">
                            <span className={`${baseColorClass} font-mono font-bold text-[8px] md:text-[9px] leading-none`}>{basePts.toFixed(1)}</span>
                            <span className="text-yellow-500 font-black text-[8px] md:text-[9px] leading-none">x1.5</span>
                        </div>
                    </div>
                ) : (
                    <span className={`${colorClass} text-[11px] md:text-xs font-black font-mono leading-none`}>{pts.toFixed(1)}</span>
                )}
            </div>
        </div>
    );
}

function BenchList({ benchPlayers, isCasa }: { benchPlayers: any[], isCasa: boolean }) {
    if (!benchPlayers || benchPlayers.length === 0) return null;
    const borderColor = isCasa ? 'border-blue-900/30' : 'border-red-900/30';
    const bgContainer = isCasa ? 'bg-blue-950/5' : 'bg-red-950/5';

    return (
        <div className={`border ${borderColor} ${bgContainer} h-auto w-full rounded-xl p-1 shadow-lg md:rounded-2xl md:p-4`}>
            <div className="mb-2 flex items-center gap-1 text-[6px] font-bold uppercase tracking-[0.06em] text-gray-500 md:mb-3.5 md:gap-2 md:text-[10px] md:tracking-widest">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span>Banco / Substituídos</span>
                <div className="flex-1 h-px bg-gray-800"></div>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
                {benchPlayers.map((atleta: any) => (
                    <BenchPlayerCard key={atleta.id} atleta={atleta} />
                ))}
            </div>
        </div>
    );
}

function BenchPlayerCard({ atleta }: { atleta: any }) {
    const isSubOut = atleta.isSubOut; 
    const pts = atleta.pontosCalculados ?? atleta.pontos;
    const basePts = atleta.pontos; 

    let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
    let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

    const showDash = !atleta.jogou && pts === 0;

    if (showDash) {
        colorClass = 'text-gray-500';
        baseColorClass = 'text-gray-500';
    }

    return (
        <div className={`flex min-h-13 items-stretch justify-between gap-1 rounded-lg border border-white/[0.08] bg-[#151815] p-1.5 transition-colors hover:bg-[#1a1d1a] md:min-h-0 md:items-center md:gap-2 md:rounded-xl md:p-2 ${isSubOut ? 'opacity-75' : ''}`}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-3.5">
                <div className="relative shrink-0">
                    <img src={atleta.foto} className={`h-8 w-8 rounded-full border bg-black object-cover shadow-inner md:h-9 md:w-9 ${isSubOut ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'border-gray-700'}`} alt={`Foto de ${atleta.nome}`} />
                    
                    {isSubOut && (
                        <IconSaiu className="absolute -top-1 -left-1 w-4 h-4 z-10" />
                    )}
                    
                    {!isSubOut && atleta.isLuxo && (
                      <div className="absolute -bottom-1 -right-1.5 w-4 h-4 bg-black rounded-full border border-black z-10 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                        <LuxoIcon className="w-2.5 h-2.5" />
                      </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className={`min-w-0 [overflow-wrap:anywhere] text-[7px] font-black uppercase leading-[1.2] md:truncate md:text-[10px] ${isSubOut ? 'text-gray-400' : 'text-gray-100'}`}>{atleta.nome}</span>
                        {!isSubOut && atleta.isCapitao && <span className="text-[7px] font-black text-yellow-400 bg-yellow-950 px-1 py-0.5 rounded border border-yellow-500/30">C</span>}
                        {!isSubOut && atleta.isLuxo && <span className="text-[7px] font-black text-orange-400 bg-orange-950/40 px-1 py-0.5 rounded border border-orange-500/30">LUXO</span>}
                    </div>
                    <span className="mt-1 text-[6px] uppercase leading-none text-gray-500 md:text-[8px]">
                        {atleta.posicao} {isSubOut && <span className="text-red-500 font-bold ml-1">SAIU</span>}
                    </span>
                </div>
            </div>
            
            <div className="flex min-w-9 shrink-0 flex-col items-center justify-center rounded-md border border-white/[0.08] bg-black/45 px-1 py-1 md:ml-1 md:min-w-0 md:items-end md:rounded-lg md:px-2.5">
                {showDash ? (
                    <span className={`text-[11px] md:text-xs font-black font-mono text-gray-500 ${isSubOut ? 'line-through' : ''}`}>-</span>
                ) : atleta.isCapitao ? (
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} text-[11px] md:text-[12px] font-black font-mono leading-none mt-[1px] ${isSubOut ? 'line-through' : ''}`}>{pts.toFixed(1)}</span>
                        <div className="flex items-center gap-[2px] mt-[3px] opacity-95">
                            <span className={`${baseColorClass} font-mono font-bold text-[8px] md:text-[9px] leading-none ${isSubOut ? 'line-through' : ''}`}>{basePts.toFixed(1)}</span>
                            <span className="text-yellow-500 font-black text-[8px] md:text-[9px] leading-none">x1.5</span>
                        </div>
                    </div>
                ) : (
                    <span className={`${colorClass} text-[11px] md:text-xs font-black font-mono leading-none ${isSubOut ? 'line-through' : ''}`}>{pts.toFixed(1)}</span>
                )}
            </div>
        </div>
    );
}
