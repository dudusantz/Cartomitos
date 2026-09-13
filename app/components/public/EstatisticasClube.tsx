type Match = {
  id: number; status?: string | null; rodada: number; rodada_cartola?: number | null;
  time_casa: number; time_visitante: number | null;
  placar_casa?: number | null; placar_visitante?: number | null;
  campeonato: { id: number; nome: string; ano: number } | { id: number; nome: string; ano: number }[] | null;
};
const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export default function EstatisticasClube({ partidas, teamId }: { partidas: Match[]; teamId: number }) {
  const games = partidas.filter(p => p.status === 'finalizado' && p.time_visitante != null && p.placar_casa != null && p.placar_visitante != null && Number.isFinite(p.placar_casa) && Number.isFinite(p.placar_visitante)).map(p => {
    const own = Number(p.time_casa === teamId ? p.placar_casa : p.placar_visitante);
    const against = Number(p.time_casa === teamId ? p.placar_visitante : p.placar_casa);
    return { ...p, own, result: own > against ? 'V' : own < against ? 'D' : 'E', camp: Array.isArray(p.campeonato) ? p.campeonato[0] : p.campeonato };
  });
  if (!games.length) return <section className="mt-6 rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Estatísticas do clube</h2><p className="mt-2 text-sm text-slate-400">As estatísticas estarão disponíveis após o primeiro resultado confirmado nesta temporada.</p></section>;
  const wins = games.filter(p => p.result === 'V').length;
  const draws = games.filter(p => p.result === 'E').length;
  const rate = (wins * 3 + draws) / (games.length * 3) * 100;
  const competitions = [...new Set(games.map(p => p.camp?.id))].map(id => {
    const matches = games.filter(p => p.camp?.id === id).sort((a, b) => b.rodada - a.rodada || b.id - a.id);
    const v = matches.filter(p => p.result === 'V').length;
    const e = matches.filter(p => p.result === 'E').length;
    let streak = 0;
    for (const match of matches) { if (match.result !== 'V') break; streak++; }
    return { id, camp: matches[0].camp, matches, v, e, d: matches.length - v - e, streak, rate: (3 * v + e) / (3 * matches.length) * 100 };
  }).sort((a, b) => b.rate - a.rate);
  const rounds = new Map<string, { year: number; round: number; values: Set<number> }>();
  for (const p of games) {
    if (!p.camp?.ano || !p.rodada_cartola) continue;
    const key = `${p.camp.ano}-${p.rodada_cartola}`;
    const entry = rounds.get(key) || { year: p.camp.ano, round: p.rodada_cartola, values: new Set<number>() };
    entry.values.add(p.own); rounds.set(key, entry);
  }
  // Diferentes regras de arredondamento entre ligas não devem criar uma pontuação fictícia.
  const points = [...rounds.values()].filter(r => r.values.size === 1).map(r => ({ ...r, value: [...r.values][0] })).sort((a, b) => a.year - b.year || a.round - b.round);
  const max = Math.max(1, ...points.map(p => Math.abs(p.value)));
  const peak = Math.max(...games.map(p => p.own));
  const streak = Math.max(...competitions.map(c => c.streak));
  return <section className="mt-6 space-y-5" aria-label="Estatísticas do clube">
    <div className="flex items-baseline justify-between gap-3"><h2 className="text-xl font-black tracking-tight">Estatísticas do clube</h2><span className="text-xs text-slate-400">{games.length} jogos confirmados</span></div>
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
      {[['Aproveitamento', `${number(rate)}%`, 'Vitória: 3 pontos · empate: 1'], ['Maior pontuação', number(peak), 'Placar registrado em um jogo'], ['Vitórias seguidas', String(streak), 'Maior sequência atual por campeonato'], ['Média por rodada', points.length ? number(points.reduce((s, p) => s + p.value, 0) / points.length) : '—', 'Uma pontuação por rodada do Cartola']].map(([label, value, hint]) => <div key={label} className="bg-[#111410] p-4 sm:p-5"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-2 font-mono text-2xl font-black tabular-nums text-yellow-400">{value}</dd><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{hint}</p></div>)}
    </dl>
    <div className="rounded-2xl border border-white/10 bg-[#111410] p-4 sm:p-5">
      <h3 className="font-bold">Evolução da pontuação</h3><p className="mt-1 text-xs text-slate-400">Da rodada mais antiga para a mais recente. Arraste para ver todo o histórico.</p>
      {points.length ? <div className="club-stats-scrollbar mt-5 overflow-x-auto pb-3" tabIndex={0} aria-label="Pontuação por rodada"><div className="flex min-w-full items-end gap-3">{points.map(p => <div key={`${p.year}-${p.round}`} className="w-12 shrink-0 text-center"><span className="font-mono text-[11px] text-slate-300">{number(p.value)}</span><div className="mt-2 flex h-24 items-end justify-center"><div className={`w-7 rounded-t ${p.value < 0 ? 'bg-red-400' : 'bg-yellow-400/80'}`} style={{ height: `${Math.max(2, Math.abs(p.value) / max * 100)}%` }} /></div><p className="mt-2 text-[11px] font-bold text-slate-300">R{p.round}</p><p className="text-[10px] text-slate-500">{p.year}</p></div>)}</div></div> : <p className="mt-5 text-sm text-slate-400">Nenhuma rodada com pontuação consolidada disponível.</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Média e gráfico usam os placares registrados, sem repetir rodadas. Rodadas sem vínculo ou com pontuações diferentes entre campeonatos ficam fora desses dois indicadores.</p>
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111410]">
      <h3 className="px-5 py-4 font-bold">Desempenho por campeonato</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-black/20 text-slate-400"><tr>{['Campeonato', 'J', 'V', 'E', 'D', 'Aprov.', 'Últimos 5'].map(t => <th key={t} className="px-3 py-3 font-medium first:pl-5">{t}</th>)}</tr></thead><tbody>{competitions.map(c => <tr key={c.id ?? 'unknown'} className="border-t border-white/5"><th className="max-w-64 px-5 py-4 font-semibold"><span>{c.camp?.nome || 'Não informado'}</span><span className="mt-1 block text-[10px] text-slate-500">{c.camp?.ano} · {c.streak} vitória(s) seguida(s)</span></th><td className="px-3">{c.matches.length}</td><td className="px-3 text-emerald-400">{c.v}</td><td className="px-3">{c.e}</td><td className="px-3 text-red-400">{c.d}</td><td className="px-3 font-mono text-yellow-400">{number(c.rate)}%</td><td className="px-3"><div className="flex gap-1">{c.matches.slice(0, 5).reverse().map(p => <span key={p.id} title={`Rodada ${p.rodada}: ${p.result === 'V' ? 'vitória' : p.result === 'D' ? 'derrota' : 'empate'}`} className={`grid h-6 w-6 place-items-center rounded font-bold ${p.result === 'V' ? 'bg-emerald-400/10 text-emerald-400' : p.result === 'D' ? 'bg-red-400/10 text-red-400' : 'bg-white/10 text-slate-300'}`}>{p.result}</span>)}</div></td></tr>)}</tbody></table></div>
      <p className="px-5 py-3 text-[11px] text-slate-500">Últimos 5: mais recente à direita. Considera os jogos oficiais; o desempate decide a classificação, sem adicionar uma partida.</p>
    </div>
  </section>;
}
