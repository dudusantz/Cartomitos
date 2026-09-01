"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, CircleAlert, Trophy } from "lucide-react";
import TeamLink from "./TeamLink";
import ModalConfrontoAoVivo from "./ModalConfrontoAoVivo";

type Team = {
  id: number;
  nome: string;
  nome_cartola?: string | null;
  escudo?: string | null;
};

type Campeonato = {
  id: number;
  nome: string;
  ano: number;
  tipo?: string;
  ativo?: boolean;
};

type Partida = {
  id: number;
  rodada: number;
  rodada_cartola?: number | null;
  time_casa: number;
  time_visitante: number | null;
  placar_casa?: number | null;
  placar_visitante?: number | null;
  desempate_casa?: number | null;
  desempate_visitante?: number | null;
  rodada_desempate?: number | null;
  status?: string | null;
  casa: Team | Team[] | null;
  visitante: Team | Team[] | null;
  campeonato: Campeonato | Campeonato[] | null;
};

const unwrap = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] || null : value || null;

const isFinished = (match: Partida) => match.status === "finalizado";
const isScheduled = (match: Partida) => !isFinished(match) && match.status !== "bye" && Boolean(match.time_visitante);

function resultFor(match: Partida, teamId: number) {
  if (!isFinished(match) || match.placar_casa == null || match.placar_visitante == null) return null;
  const own = match.time_casa === teamId ? match.placar_casa : match.placar_visitante;
  const rival = match.time_casa === teamId ? match.placar_visitante : match.placar_casa;
  if (own > rival) return "V";
  if (own < rival) return "D";
  return "E";
}

function score(value: number | null | undefined) {
  return value == null ? "-" : Math.trunc(value).toString();
}

function competitionPath(camp: Campeonato) {
  const slug = camp.nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `/campeonatos/${slug}-${camp.id}`;
}

function MatchRow({ match, teamId, onSelect }: { match: Partida; teamId: number; onSelect: (match: Partida) => void }) {
  const home = unwrap(match.casa);
  const away = unwrap(match.visitante);
  const competition = unwrap(match.campeonato);
  const result = resultFor(match, teamId);
  const live = match.status === "parcial" || (match as Partida & { is_parcial?: boolean }).is_parcial === true;
  const hasTiebreak = match.desempate_casa != null && match.desempate_visitante != null;
  const canOpenLineup = isFinished(match) && Boolean(match.rodada_cartola);
  const tiebreakResult = hasTiebreak
    ? match.desempate_casa! > match.desempate_visitante!
      ? match.time_casa === teamId ? "V" : "D"
      : match.desempate_visitante! > match.desempate_casa!
        ? match.time_visitante === teamId ? "V" : "D"
        : "E"
    : null;

  return (
    <article
      className={`${canOpenLineup ? "cursor-pointer hover:bg-[#141713] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400" : ""} bg-[#111310] outline-none transition-colors`}
      onClick={() => canOpenLineup && onSelect(match)}
      onKeyDown={(event) => {
        if (canOpenLineup && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect(match);
        }
      }}
      tabIndex={canOpenLineup ? 0 : undefined}
      aria-label={canOpenLineup ? `Abrir escalações de ${home?.nome || "mandante"} contra ${away?.nome || "visitante"}` : undefined}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.045] px-3.5 py-2.5 sm:px-6">
        {competition ? (
          <Link href={competitionPath(competition)} onClick={(event) => event.stopPropagation()} className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-yellow-400 sm:gap-2 sm:text-[10px]">
            <Trophy size={11} className="shrink-0 text-yellow-400 sm:h-3 sm:w-3" />
            <span className="truncate">{competition.nome}</span>
          </Link>
        ) : <span className="text-[10px] text-slate-600">Campeonato não informado</span>}
        <span className="shrink-0 whitespace-nowrap text-right font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-slate-600 sm:text-[9px] sm:tracking-[0.08em]">
          <span className="sm:hidden">R{match.rodada} no campeonato</span>
          <span className="hidden sm:inline">Rodada {match.rodada} no campeonato</span>
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_128px_minmax(0,1fr)] sm:gap-5 sm:px-6 sm:py-5">
        <TeamLink team={home} className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:justify-end sm:gap-2.5 sm:text-right">
          <span className={`order-2 min-h-5 w-full min-w-0 truncate text-[9px] font-bold leading-5 sm:order-none sm:min-h-0 sm:w-auto sm:text-sm sm:leading-tight ${match.time_casa === teamId ? "text-white" : "text-slate-400"}`}>
            {home?.nome || "A definir"}
          </span>
          <span className="order-1 grid h-9 w-9 shrink-0 place-items-center sm:order-none sm:h-10 sm:w-10">
            <img src={home?.escudo || "/shield-placeholder.png"} alt={`Escudo do ${home?.nome || "mandante"}`} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
          </span>
        </TeamLink>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          {isFinished(match) || live ? (
            <div className="w-full whitespace-nowrap rounded-lg border border-white/10 bg-black/35 px-2 py-2 text-center font-mono text-base font-black leading-none tabular-nums text-white sm:text-lg">
              <span className="inline-grid grid-cols-[1fr_auto_1fr] items-baseline gap-1.5">
                <span className="text-right">{score(match.placar_casa)}</span><span className="text-slate-600">:</span><span className="text-left">{score(match.placar_visitante)}</span>
              </span>
            </div>
          ) : (
            <span className="rounded-lg border border-yellow-400/20 bg-yellow-400/[0.07] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-yellow-400">A disputar</span>
          )}
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">
            {live ? <span className="text-emerald-400">Ao vivo</span> : isFinished(match) ? "Final" : "Agendado"}
            {result && <span className={`grid h-5 w-5 place-items-center rounded ${result === "V" ? "bg-emerald-400/15 text-emerald-400" : result === "D" ? "bg-red-400/15 text-red-400" : "bg-white/[0.07] text-slate-300"}`}>{result}</span>}
          </div>
        </div>

        <TeamLink team={away} className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:justify-start sm:gap-2.5 sm:text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center sm:h-10 sm:w-10">
            <img src={away?.escudo || "/shield-placeholder.png"} alt={`Escudo do ${away?.nome || "visitante"}`} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
          </span>
          <span className={`min-h-5 w-full min-w-0 truncate text-[9px] font-bold leading-5 sm:min-h-0 sm:w-auto sm:text-sm sm:leading-tight ${match.time_visitante === teamId ? "text-white" : "text-slate-400"}`}>
            {away?.nome || "A definir"}
          </span>
        </TeamLink>
      </div>

      {hasTiebreak && (
        <div className="border-t border-yellow-400/10 bg-yellow-400/[0.025] px-3 py-3 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_128px_minmax(0,1fr)] sm:gap-5">
            <div className="min-w-0 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.11em] text-yellow-400">Desempate</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">Após o jogo de volta</p>
            </div>
            <div className="whitespace-nowrap rounded-lg border border-yellow-400/20 bg-black/40 px-2 py-2 text-center font-mono text-base font-black leading-none tabular-nums text-yellow-300 sm:text-lg">
              <span className="inline-grid grid-cols-[1fr_auto_1fr] items-baseline gap-1.5">
                <span className="text-right">{score(match.desempate_casa)}</span><span className="text-slate-600">:</span><span className="text-left">{score(match.desempate_visitante)}</span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                Pontuação usada: {match.rodada_desempate ? `R${match.rodada_desempate}` : "rodada não registrada"}
              </p>
              {tiebreakResult && (
                <p className={`mt-1 text-[9px] font-black uppercase tracking-[0.08em] ${tiebreakResult === "V" ? "text-emerald-400" : tiebreakResult === "D" ? "text-red-400" : "text-slate-400"}`}>
                  {tiebreakResult === "V" ? "Classificado no desempate" : tiebreakResult === "D" ? "Eliminado no desempate" : "Desempate ainda igual"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function PerfilPublicoTime({ time, partidas, erroPartidas = false }: { time: Team; partidas: Partida[]; erroPartidas?: boolean }) {
  const seasons = useMemo(() => Array.from(new Set(partidas.map((match) => unwrap(match.campeonato)?.ano).filter((year): year is number => Boolean(year)))).sort((a, b) => b - a), [partidas]);
  const [season, setSeason] = useState<number | "all">(seasons[0] || "all");
  const [matchView, setMatchView] = useState<"finished" | "upcoming">("finished");
  const [selectedMatch, setSelectedMatch] = useState<Partida | null>(null);

  const finished = partidas.filter(isFinished);
  const wins = finished.filter((match) => resultFor(match, time.id) === "V").length;
  const draws = finished.filter((match) => resultFor(match, time.id) === "E").length;
  const losses = finished.filter((match) => resultFor(match, time.id) === "D").length;
  const nextMatch = partidas
    .filter(isScheduled)
    .sort((a, b) => (unwrap(a.campeonato)?.ano || 0) - (unwrap(b.campeonato)?.ano || 0) || (a.rodada_cartola ?? Number.MAX_SAFE_INTEGER) - (b.rodada_cartola ?? Number.MAX_SAFE_INTEGER) || a.rodada - b.rodada)[0];

  const seasonMatches = partidas.filter((match) => season === "all" || unwrap(match.campeonato)?.ano === season);

  function groupByCartolaRound(matches: Partida[], direction: "asc" | "desc") {
    const groups = matches.reduce<Record<string, { year: number; cartolaRound: number | null; matches: Partida[] }>>((result, match) => {
      const year = unwrap(match.campeonato)?.ano || 0;
      const cartolaRound = match.rodada_cartola ?? null;
      const key = `${year}-${cartolaRound ?? "unlinked"}`;
      result[key] ||= { year, cartolaRound, matches: [] };
      result[key].matches.push(match);
      return result;
    }, {});

    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const aRound = a.cartolaRound ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : -1);
      const bRound = b.cartolaRound ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : -1);
      return direction === "asc" ? aRound - bRound : bRound - aRound;
    });
  }

  const upcomingGroups = groupByCartolaRound(seasonMatches.filter(isScheduled), "asc");
  const finishedGroups = groupByCartolaRound(seasonMatches.filter(isFinished), "desc");
  const activeGroups = matchView === "finished" ? finishedGroups : upcomingGroups;
  const activeMatchCount = activeGroups.reduce((total, group) => total + group.matches.length, 0);

  const nextOpponent = nextMatch ? (nextMatch.time_casa === time.id ? unwrap(nextMatch.visitante) : unwrap(nextMatch.casa)) : null;
  const nextCompetition = nextMatch ? unwrap(nextMatch.campeonato) : null;

  return (
    <div className="min-h-[100dvh] pb-16 text-slate-100">
      <section className="border-b border-white/[0.07] bg-[#0b0d0b]">
        <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
          <Link href="/campeonatos" className="mb-7 inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-white">
            <ArrowLeft size={15} /> Voltar aos campeonatos
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)] lg:items-stretch">
            <div className="flex flex-col items-start gap-5 rounded-2xl border border-white/[0.07] bg-[#111410] p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-black/25 p-3 sm:h-32 sm:w-32 sm:p-4">
                <img src={time.escudo || "/shield-placeholder.png"} alt={`Escudo do ${time.nome}`} className="h-full w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.35)]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-400">Perfil do clube</span>
                <h1 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl">{time.nome}</h1>
                <p className="mt-3 text-sm text-slate-500">Cartoleiro: <strong className="font-semibold text-slate-300">{time.nome_cartola || "Não informado"}</strong></p>
                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2 font-mono text-xs sm:flex sm:flex-wrap">
                  <span><strong className="text-white">{finished.length}</strong> <span className="text-slate-600">jogos</span></span>
                  <span><strong className="text-emerald-400">{wins}</strong> <span className="text-slate-600">vitórias</span></span>
                  <span><strong className="text-slate-300">{draws}</strong> <span className="text-slate-600">empates</span></span>
                  <span><strong className="text-red-400">{losses}</strong> <span className="text-slate-600">derrotas</span></span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-400/15 bg-[#15160f] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-yellow-400">Próximo jogo</span><h2 className="mt-1 text-lg font-black text-white">{nextMatch ? nextMatch.rodada_cartola ? `Rodada ${nextMatch.rodada_cartola} do Cartola` : `Rodada ${nextMatch.rodada}` : "Agenda livre"}</h2></div>
                <CalendarDays size={20} className="text-yellow-400" />
              </div>
              {nextMatch && nextOpponent && nextCompetition ? (
                <div className="mt-7">
                  <div className="flex items-center gap-4">
                    <img src={nextOpponent.escudo || "/shield-placeholder.png"} alt={`Escudo do ${nextOpponent.nome}`} className="h-14 w-14 object-contain" />
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">{nextMatch.time_casa === time.id ? "Em casa contra" : "Fora contra"}</p><p className="mt-1 text-xl font-black leading-tight text-white">{nextOpponent.nome}</p></div>
                  </div>
                  <Link href={competitionPath(nextCompetition)} className="mt-6 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-xs font-bold text-slate-300 hover:border-yellow-400/30 hover:text-yellow-400">
                    <span>{nextCompetition.nome}</span><ChevronRight size={15} />
                  </Link>
                </div>
              ) : <p className="mt-8 max-w-sm text-sm leading-relaxed text-slate-500">Não há partidas futuras cadastradas para este time.</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-7 md:px-6 md:py-10">
        <div className="rounded-2xl border border-white/[0.07] bg-[#10120f] p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-2xl font-black tracking-[-0.03em] text-white">Partidas do clube</h2><p className="mt-1 text-sm text-slate-500">Resultados e agenda pela rodada oficial do Cartola.</p></div>
            <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:w-auto">
              <div className="grid min-h-11 flex-1 grid-cols-2 rounded-xl border border-white/[0.08] bg-[#090a09] p-1 sm:min-w-64" aria-label="Tipo de partida">
                <button onClick={() => setMatchView("finished")} aria-pressed={matchView === "finished"} className={`rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] ${matchView === "finished" ? "bg-yellow-400 text-[#11130f] shadow-[0_5px_16px_rgba(216,170,50,.15)]" : "text-slate-500 hover:bg-white/[0.035] hover:text-white"}`}>Encerrados</button>
                <button onClick={() => setMatchView("upcoming")} aria-pressed={matchView === "upcoming"} className={`rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] ${matchView === "upcoming" ? "bg-yellow-400 text-[#11130f] shadow-[0_5px_16px_rgba(216,170,50,.15)]" : "text-slate-500 hover:bg-white/[0.035] hover:text-white"}`}>Próximos</button>
              </div>
              <select aria-label="Filtrar temporada" value={season} onChange={(event) => setSeason(event.target.value === "all" ? "all" : Number(event.target.value))} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#090a09] px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-yellow-400 sm:min-w-48">
              <option value="all">Todas as temporadas</option>
              {seasons.map((year) => <option key={year} value={year}>Temporada {year}</option>)}
              </select>
            </div>
          </div>
        </div>

        {erroPartidas ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-300"><CircleAlert size={18} className="mt-0.5 shrink-0" /><div><strong className="block text-white">Não foi possível carregar as partidas</strong><span className="mt-1 block text-slate-500">Atualize a página para tentar novamente.</span></div></div>
        ) : activeGroups.length > 0 ? (
          <section className="mt-7" aria-labelledby="lista-partidas-selecionada">
            <div className="mb-4 flex items-end justify-between gap-4 px-1">
              <div><h3 id="lista-partidas-selecionada" className="text-xl font-black tracking-[-0.025em] text-white">{matchView === "finished" ? "Resultados encerrados" : "Próximos jogos"}</h3><p className="mt-1 text-xs text-slate-500">{matchView === "finished" ? "Do confronto mais recente para o mais antigo." : "Partidas futuras em ordem de rodada."}</p></div>
              <span className={`font-mono text-xs font-bold ${matchView === "upcoming" ? "text-yellow-400" : "text-slate-500"}`}>{activeMatchCount}</span>
            </div>
            <div className="space-y-5">{activeGroups.map(({ year, cartolaRound, matches }) => (
              <section key={`${matchView}-${year}-${cartolaRound ?? "unlinked"}`} className={`overflow-hidden rounded-2xl border bg-[#111310] shadow-[0_18px_50px_rgba(0,0,0,.16)] ${matchView === "upcoming" ? "border-yellow-400/15" : "border-white/[0.07]"}`}>
                <div className={`flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 sm:px-6 ${matchView === "upcoming" ? "bg-[#181910]" : "bg-[#171a16]"}`}><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl border font-mono text-sm font-black ${matchView === "upcoming" ? "border-yellow-400/15 bg-yellow-400/[0.08] text-yellow-400" : "border-white/[0.08] bg-white/[0.035] text-slate-300"}`}>{cartolaRound ?? "?"}</span><div><h4 className="text-sm font-black text-white">{cartolaRound ? `Rodada ${cartolaRound} do Cartola` : "Rodada do Cartola não vinculada"}</h4><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Temporada {year || "não informada"}</p></div></div><span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">{matches.length} {matches.length === 1 ? "jogo" : "jogos"}</span></div>
                <div className="divide-y divide-white/[0.07]">{matches.map((match) => <MatchRow key={match.id} match={match} teamId={time.id} onSelect={setSelectedMatch} />)}</div>
              </section>
            ))}</div>
          </section>
        ) : (
          <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 text-center"><CalendarDays size={24} className="text-slate-700" /><h3 className="mt-4 text-base font-black text-white">{matchView === "finished" ? "Nenhum resultado encerrado" : "Nenhum próximo jogo"}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Não há partidas desta categoria na temporada selecionada.</p></div>
        )}
      </div>
      {selectedMatch && <ModalConfrontoAoVivo jogo={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  );
}
