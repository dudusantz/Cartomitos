"use client";

import { useEffect, useState } from "react";
import { buscarEstatisticasEscalacoesClube } from "@/app/actions";
import type { resumirEscalacoes } from "@/lib/lineup-stats";

type Resumo = ReturnType<typeof resumirEscalacoes>;

const posicoes: Record<number, string> = { 1: "Goleiro", 2: "Lateral", 3: "Zagueiro", 4: "Meia", 5: "Atacante", 6: "Técnico" };
const percentual = (valor: number, total: number) => total ? Math.round(valor / total * 100) : 0;

export default function EstatisticasEscalacoesClube({ teamId, ano }: { teamId: number; ano: number | "all" }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const temporadaAtual = new Date().getFullYear();
  const temporada = ano === "all" ? temporadaAtual : ano;

  useEffect(() => {
    if (temporada !== temporadaAtual) return;
    let ativo = true;
    buscarEstatisticasEscalacoesClube(teamId, temporada)
      .then((dados) => { if (ativo) setResumo(dados); })
      .catch(() => { if (ativo) setResumo(null); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [teamId, temporada, temporadaAtual]);

  const esquemaPrincipal = resumo?.esquemas[0];
  const jogadorPrincipal = resumo?.atletas[0];

  return <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#111410]" aria-label="Hábitos de escalação">
    <header className="border-b border-white/[.07] bg-[radial-gradient(circle_at_95%_0%,rgba(216,170,50,.12),transparent_42%)] px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-400">Raio-X do elenco / {temporadaAtual}</p><h3 className="mt-1.5 text-2xl font-black tracking-[-.045em] text-white sm:text-[1.8rem]">A identidade do time em campo</h3><p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-400">Formações, atletas e clubes que mais apareceram entre os titulares.</p></div>
        {resumo?.rodadas ? <span className="border-l-2 border-yellow-400 pl-3 font-mono text-sm font-bold tabular-nums text-white">{resumo.rodadas}<small className="ml-1.5 font-sans text-[10px] font-medium uppercase tracking-[.08em] text-slate-500">rodadas analisadas</small></span> : null}
      </div>
    </header>

    {temporada !== temporadaAtual ? <p className="px-5 py-9 text-sm text-slate-400 sm:px-7">Os rankings de escalação estão disponíveis apenas para a temporada atual. Selecione-a para ver os dados.</p>
      : carregando ? <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[.85fr_1.15fr]" role="status" aria-label="Carregando escalações"><div className="h-72 animate-pulse rounded-xl bg-white/[.045]" /><div className="h-72 animate-pulse rounded-xl bg-white/[.045]" /></div>
      : !resumo ? <p className="px-5 py-9 text-sm text-slate-400 sm:px-7">Não foi possível carregar as escalações agora. Atualize a página para tentar novamente.</p>
      : !resumo.rodadas ? <p className="px-5 py-9 text-sm text-slate-400 sm:px-7">Ainda não há escalações confirmadas disponíveis para este clube nesta temporada.</p>
      : <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <article className="min-w-0 rounded-xl border border-yellow-400/15 bg-[#191a12] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black text-white">Esquema preferido</h4><span className="text-[10px] font-bold uppercase tracking-[.1em] text-yellow-400">Formação</span></div>
            <div className="mt-4 flex items-end justify-between gap-4 border-b border-yellow-400/15 pb-4"><div><strong className="font-mono text-5xl font-black leading-none tracking-[-.08em] text-yellow-400 sm:text-6xl">{esquemaPrincipal?.nome}</strong><p className="mt-2 text-xs text-slate-400">Usado em <b className="text-white">{esquemaPrincipal?.jogos} de {resumo.rodadas}</b> rodadas</p></div><strong className="font-mono text-3xl font-black tabular-nums text-white">{percentual(esquemaPrincipal?.jogos || 0, resumo.rodadas)}%</strong></div>
            <div className="mt-4 space-y-3"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">Distribuição dos esquemas</p>{resumo.esquemas.map((item) => <div key={item.nome} className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.8rem] items-center gap-2.5 text-xs"><span className="font-mono font-bold text-white">{item.nome}</span><div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${percentual(item.jogos, resumo.rodadas)}%` }} /></div><span className="text-right font-mono tabular-nums text-slate-400">{item.jogos}×</span></div>)}</div>
            {esquemaPrincipal && <VisualizacaoEsquema esquema={esquemaPrincipal.nome} />}
          </article>

          <article className="min-w-0 rounded-xl border border-white/[.08] bg-[#151814] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-black text-white">Presença no time titular</h4><p className="mt-1 text-[11px] text-slate-500">{resumo.jogadoresDiferentes} jogadores diferentes escalados</p></div><span className="font-mono text-[10px] text-slate-500">TOP 8</span></div>
            {jogadorPrincipal && <div className="mt-4 flex items-center gap-3 rounded-lg border border-yellow-400/15 bg-yellow-400/[.055] p-3"><RetratoJogador jogador={jogadorPrincipal} destaque /><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.12em] text-yellow-400">Mais escalado</p><strong className="block truncate text-base font-black text-white" title={jogadorPrincipal.nome}>{jogadorPrincipal.nome}</strong><p className="truncate text-[11px] text-slate-400" title={jogadorPrincipal.clube}>{[posicoes[jogadorPrincipal.posicao], jogadorPrincipal.clube].filter(Boolean).join(' · ')}</p></div><div className="shrink-0 text-right"><strong className="block font-mono text-xl font-black tabular-nums text-yellow-400">{jogadorPrincipal.jogos}/{resumo.rodadas}</strong><span className="text-[10px] text-slate-400">rodadas</span></div></div>}
            <ol className="mt-3 divide-y divide-white/[.055]">{resumo.atletas.slice(1).map((item, indice) => <li key={item.clubeId + "-" + item.nome} className="flex items-center gap-2.5 py-2.5"><span className="w-4 shrink-0 font-mono text-[10px] text-slate-600">{indice + 2}</span><RetratoJogador jogador={item} /><div className="min-w-0 flex-1"><strong className="block truncate text-xs font-bold text-slate-200" title={item.nome}>{item.nome}</strong><span className="block truncate text-[10px] text-slate-500" title={item.clube}>{[posicoes[item.posicao], item.clube].filter(Boolean).join(' · ')}</span><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-yellow-400/65" style={{ width: `${percentual(item.jogos, resumo.rodadas)}%` }} /></div></div><span className="shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-yellow-400">{item.jogos}/{resumo.rodadas}</span></li>)}</ol>
          </article>
        </div>

        <article className="rounded-xl border border-white/[.08] bg-[#151814] p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="text-sm font-black text-white">De onde vieram os jogadores</h4><p className="mt-1 text-[11px] text-slate-500">Cada escolha representa um titular escalado em uma rodada.</p></div><span className="font-mono text-[10px] text-slate-500">Clubes mais frequentes</span></div><ol className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">{resumo.clubes.map((item, indice) => <li key={item.nome} className="grid grid-cols-[1.1rem_1.7rem_minmax(0,1fr)_5rem] items-center gap-2.5 border-b border-white/[.05] py-1.5"><span className="font-mono text-[10px] text-slate-600">{indice + 1}</span><div className="grid h-6 w-6 place-items-center">{item.escudo ? <img src={item.escudo} alt={`Escudo do ${item.nome}`} className="h-6 w-6 object-contain" /> : <span className="text-xs font-black text-slate-500">{item.nome.charAt(0)}</span>}</div><div className="min-w-0"><strong className="block truncate text-xs font-semibold text-white" title={item.nome}>{item.nome}</strong><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-yellow-400/75" style={{ width: `${percentual(item.escolhas, resumo.clubes[0]?.escolhas || 1)}%` }} /></div></div><div className="text-right"><strong className="block font-mono text-xs font-bold tabular-nums text-yellow-400">{item.escolhas} escolhas</strong><span className="text-[9px] text-slate-500">{(item.escolhas / resumo.rodadas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por rodada</span></div></li>)}</ol></article>
      </div>}
    <p className="border-t border-white/[.07] px-5 py-3 text-[11px] leading-relaxed text-slate-500 sm:px-7">Considera apenas titulares de rodadas encerradas. Jogos da mesma rodada em campeonatos diferentes contam uma vez; reservas não entram.</p>
  </section>;
}

function RetratoJogador({ jogador, destaque = false }: { jogador: Resumo["atletas"][number]; destaque?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const foto = jogador.foto && !jogador.foto.includes('/silhuetas/') && !falhou;
  if (!foto && !jogador.escudoClube) return null;
  return <div className={`${destaque ? 'h-14 w-14 rounded-md' : 'h-8 w-8 rounded-full'} grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-black/30`}>
    {foto ? <img src={jogador.foto} alt={`Foto de ${jogador.nome}`} className="h-full w-full object-contain" onError={() => setFalhou(true)} />
      : <img src={jogador.escudoClube} alt={`Escudo do ${jogador.clube}`} className="h-2/3 w-2/3 object-contain" />}
  </div>;
}

function VisualizacaoEsquema({ esquema }: { esquema: string }) {
  const [defesa, meio, ataque] = esquema.split('-').map(Number);
  return <div className="relative mt-6 overflow-hidden rounded-lg border border-white/10 bg-[#101a12] px-5 py-4" role="img" aria-label={`Representação do esquema ${esquema} em campo`}>
    <div className="pointer-events-none absolute inset-3 rounded border border-white/[.09]" />
    <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/[.08]" />
    <div className="relative flex h-72 flex-col justify-between sm:h-80">
      {[["Ataque", ataque], ["Meio", meio], ["Defesa", defesa], ["Goleiro", 1]].map(([nome, quantidade]) => <div key={nome} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.09em] text-slate-500">{nome}</span><div className="flex justify-around gap-1">{Array.from({ length: Number(quantidade) }, (_, indice) => <i key={indice} className="h-3.5 w-3.5 rounded-full border-2 border-[#101a12] bg-yellow-400 shadow-[0_0_0_1px_rgba(234,179,8,.4)]" />)}</div></div>)}
    </div>
  </div>;
}
