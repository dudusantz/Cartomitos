"use client";

import { useState, useEffect } from "react";
import {
  buscarTabelaGrupos,
  listarPartidas,
  buscarParciaisAoVivo,
} from "../../actions";

interface Props {
  campeonatoId: number;
}

export default function FaseGruposPublica({ campeonatoId }: Props) {
  // Guardamos os dados originais para poder resetar depois do "Ao Vivo"
  const [dadosOriginais, setDadosOriginais] = useState<{
    grupos: any;
    jogos: any[];
  }>({ grupos: {}, jogos: [] });

  const [gruposExibidos, setGruposExibidos] = useState<any>({});
  const [jogosExibidos, setJogosExibidos] = useState<any[]>([]);

  const [rodadaView, setRodadaView] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [modoAoVivo, setModoAoVivo] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const dadosGrupos = await buscarTabelaGrupos(campeonatoId);
        const dadosJogos = await listarPartidas(campeonatoId);
        const jogosGrupos = dadosJogos.filter((j: any) => j.rodada <= 20);

        // Salva estado inicial
        setDadosOriginais({ grupos: dadosGrupos, jogos: jogosGrupos });
        setGruposExibidos(dadosGrupos);
        setJogosExibidos(jogosGrupos);

        // Define rodada atual (mesma lógica do admin)
        if (jogosGrupos.length > 0) {
          const rodadasPendentes = jogosGrupos
            .filter((j: any) => j.status !== "finalizado")
            .map((j: any) => j.rodada);

          let rodadaInicial = 1;
          if (rodadasPendentes.length > 0) {
            rodadaInicial = Math.min(...rodadasPendentes);
          } else {
            const todasRodadas = jogosGrupos.map((j: any) => j.rodada);
            rodadaInicial = Math.max(...todasRodadas);
          }
          setRodadaView(rodadaInicial);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [campeonatoId]);

  // --- LÓGICA AO VIVO ---
  async function toggleAoVivo() {
    if (!modoAoVivo) {
      setLoadingLive(true);
      try {
        // 1. Busca parciais dos jogos não finalizados da rodada atual
        const jogosAbertos = dadosOriginais.jogos.filter(
          (j: any) => j.status !== "finalizado" && j.rodada === rodadaView
        );
        const { jogos: parciais } = await buscarParciaisAoVivo(jogosAbertos);

        // 2. Atualiza a lista de jogos com os placares parciais
        const novosJogos = dadosOriginais.jogos.map((jogo) => {
          if (jogo.rodada === rodadaView) {
            const p = parciais?.find((x: any) => x.id === jogo.id);
            if (p && p.is_parcial) {
              return {
                ...jogo,
                placar_casa: p.placar_casa,
                placar_visitante: p.placar_visitante,
                is_parcial: true,
                status: "finalizado", // Simula finalizado para cálculo
              };
            }
          }
          return jogo;
        });
        setJogosExibidos(novosJogos);

        // 3. RECALCULA AS TABELAS DOS GRUPOS
        const stats: any = {};
        Object.values(dadosOriginais.grupos)
          .flat()
          .forEach((t: any) => {
            stats[t.time_id] = {
              ...t,
              pts: 0,
              pj: 0,
              v: 0,
              e: 0,
              d: 0,
              pp: 0,
              pc: 0,
              sp: 0,
            };
          });

        novosJogos.forEach((jogo: any) => {
          const c = stats[jogo.time_casa];
          const v = stats[jogo.time_visitante];

          if (c && v && (jogo.status === "finalizado" || jogo.is_parcial)) {
            c.pj++;
            v.pj++;
            c.pp += jogo.placar_casa;
            c.pc += jogo.placar_visitante;
            v.pp += jogo.placar_visitante;
            v.pc += jogo.placar_casa;
            c.sp = c.pp - c.pc;
            v.sp = v.pp - v.pc;

            if (jogo.placar_casa > jogo.placar_visitante) {
              c.pts += 3;
              c.v++;
              v.d++;
            } else if (jogo.placar_visitante > jogo.placar_casa) {
              v.pts += 3;
              v.v++;
              c.d++;
            } else {
              c.pts += 1;
              v.pts += 1;
              c.e++;
              v.e++;
            }
          }
        });

        const novosGrupos: any = {};
        Object.values(stats).forEach((time: any) => {
          if (!novosGrupos[time.grupo]) novosGrupos[time.grupo] = [];
          novosGrupos[time.grupo].push(time);
        });
        for (const l in novosGrupos) {
          novosGrupos[l].sort(
            (a: any, b: any) =>
              b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp
          );
        }

        setGruposExibidos(novosGrupos);
        setModoAoVivo(true);
      } catch (e) {
        console.error(e);
      }
      setLoadingLive(false);
    } else {
      // Reset
      setGruposExibidos(dadosOriginais.grupos);
      setJogosExibidos(dadosOriginais.jogos);
      setModoAoVivo(false);
    }
  }

  const jogosDaRodada = jogosExibidos.filter((j) => j.rodada === rodadaView);
  const totalRodadas =
    dadosOriginais.jogos.length > 0
      ? Math.max(...dadosOriginais.jogos.map((j) => j.rodada))
      : 6;

  if (loading)
    return (
      <div className="text-center py-20 text-gray-500 animate-pulse">
        Carregando...
      </div>
    );

  if (Object.keys(gruposExibidos).length === 0) {
    return (
      <div className="text-center py-20 bg-[#121212] rounded-3xl border border-gray-800 text-gray-500">
        Grupos não definidos
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
      {/* ESQUERDA: GRADES DE GRUPOS */}
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="text-xl">🌎</span> Fase de Grupos
            </h2>
            {modoAoVivo && (
              <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">
                Ao Vivo (R{rodadaView})
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.keys(gruposExibidos)
            .sort()
            .map((letra) => (
              <div
                key={letra}
                className={`bg-[#121212] border rounded-2xl overflow-hidden shadow-lg flex flex-col h-fit transition-colors ${
                  modoAoVivo ? "border-green-900/30" : "border-gray-800"
                }`}
              >
                <div className="bg-[#151515] px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                  <span className="text-white font-black tracking-widest text-xs uppercase text-blue-400">
                    Grupo {letra}
                  </span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-black text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800">
                      <tr>
                        <th className="py-2 pl-3 w-[6%]">#</th>
                        <th className="py-2 px-1 w-[26%]">Clube</th>
                        <th className="py-2 text-center text-white w-[8%]">
                          PTS
                        </th>
                        <th className="py-2 text-center w-[6%]">J</th>
                        <th className="py-2 text-center w-[6%]">V</th>
                        <th className="py-2 text-center w-[6%]">E</th>
                        <th className="py-2 text-center w-[6%]">D</th>
                        <th
                          className="py-2 text-center w-[8%]"
                          title="Pontos Pró"
                        >
                          PP
                        </th>
                        <th
                          className="py-2 text-center w-[8%]"
                          title="Pontos Contra"
                        >
                          PC
                        </th>
                        <th className="py-2 text-center w-[8%]" title="Saldo">
                          SP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {gruposExibidos[letra].map((t: any, idx: number) => {
                        const time = Array.isArray(t.times)
                          ? t.times[0]
                          : t.times;
                        const isClassificado = idx < 2;

                        return (
                          <tr key={t.id} className="hover:bg-white/[0.02]">
                            <td className="py-2 pl-3 font-bold text-gray-500 relative">
                              {isClassificado && (
                                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500"></div>
                              )}
                              {idx + 1}
                            </td>
                            <td className="py-2 px-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <img
                                  src={time?.escudo}
                                  className="w-5 h-5 object-contain shrink-0"
                                />
                                {/* Nome completo do time sem cortes */}
                                <span
                                  className={`font-bold whitespace-normal leading-tight ${
                                    isClassificado
                                      ? "text-white"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {time?.nome}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 text-center font-black text-white bg-white/5">
                              {t.pts}
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {t.pj}
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {t.v}
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {t.e}
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {t.d}
                            </td>
                            <td className="py-2 text-center text-gray-500 font-mono">
                              {t.pp}
                            </td>
                            <td className="py-2 text-center text-gray-500 font-mono">
                              {t.pc}
                            </td>
                            <td
                              className={`py-2 text-center font-bold ${
                                t.sp > 0
                                  ? "text-green-500"
                                  : t.sp < 0
                                  ? "text-red-500"
                                  : "text-gray-600"
                              }`}
                            >
                              {t.sp}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* DIREITA: JOGOS E CONTROLES */}
      <div className="lg:col-span-4 space-y-4 sticky top-6">
        <div className="bg-[#121212] border border-gray-800 rounded-3xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>{" "}
              Jogos
            </span>
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => setRodadaView((r) => Math.max(1, r - 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"
              >
                ‹
              </button>
              <span className="text-[10px] font-black px-2 text-blue-500 uppercase">
                R{rodadaView}
              </span>
              <button
                onClick={() =>
                  setRodadaView((r) => Math.min(totalRodadas, r + 1))
                }
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"
              >
                ›
              </button>
            </div>
          </div>

          {/* BOTÃO AO VIVO */}
          <button
            onClick={toggleAoVivo}
            disabled={loadingLive}
            className={`
                        w-full py-3 mb-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2
                        ${
                          modoAoVivo
                            ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20"
                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"
                        }
                    `}
          >
            {loadingLive
              ? "Carregando..."
              : modoAoVivo
              ? "Parar Simulação"
              : "Ver Parciais Ao Vivo"}
          </button>

          <div className="space-y-3">
            {jogosDaRodada.length === 0 && (
              <div className="text-center text-gray-600 text-[10px] py-4">
                Sem jogos nesta rodada.
              </div>
            )}

            {jogosDaRodada.map((j) => {
              const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
              const visitante = Array.isArray(j.visitante)
                ? j.visitante[0]
                : j.visitante;

              // Lógica de Status: "finalizado" pode ser real ou simulado pelo ao vivo
              const finalizado = j.status === "finalizado";
              const parcial = j.is_parcial === true;

              // Define se existe um resultado visível
              const temResultado = finalizado || parcial;

              // Lógica de Vencedor
              const vCasa = temResultado && j.placar_casa > j.placar_visitante;
              const vVis = temResultado && j.placar_visitante > j.placar_casa;
              const empate =
                temResultado && j.placar_casa === j.placar_visitante;

              return (
                <div
                  key={j.id}
                  className={`
                                bg-gradient-to-br from-[#121212] to-[#0a0a0a] border rounded-2xl p-4 transition-all relative overflow-hidden shadow-lg
                                ${
                                  parcial
                                    ? "border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                    : "border-gray-800/60"
                                }
                            `}
                >
                  {/* Indicador de Status */}
                  {parcial ? (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                  ) : (
                    finalizado && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                    )
                  )}

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    {/* Mandante */}
                    <div className="flex flex-col items-end gap-1.5 overflow-hidden">
                      <img
                        src={casa?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md ${
                          !vCasa && temResultado && !empate
                            ? "opacity-60 grayscale"
                            : ""
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold text-right leading-tight w-full truncate ${
                          vCasa ? "text-green-400" : "text-gray-400"
                        }`}
                      >
                        {casa?.nome || "Mandante"}
                      </span>
                    </div>

                    {/* Placar */}
                    <div
                      className={`
                    flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-black text-sm w-auto min-w-[80px] shadow-inner
                    ${
                      parcial
                        ? "bg-green-900/10 border-green-900/40 text-green-400"
                        : temResultado
                        ? "bg-black/40 border-gray-700 text-white"
                        : "bg-black/20 border-gray-800 text-gray-600"
                    }
`}
                    >
                      <span className={vCasa ? "text-green-400" : ""}>
                        {j.placar_casa ?? "-"}
                      </span>
                      <span
                        className={`text-[10px] ${
                          parcial ? "text-green-600" : "text-gray-700"
                        }`}
                      >
                        ✕
                      </span>
                      <span className={vVis ? "text-green-400" : ""}>
                        {j.placar_visitante ?? "-"}
                      </span>
                    </div>

                    {/* Visitante */}
                    <div className="flex flex-col items-start gap-1.5 overflow-hidden">
                      <img
                        src={visitante?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md ${
                          !vVis && temResultado && !empate
                            ? "opacity-60 grayscale"
                            : ""
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold text-left leading-tight w-full truncate ${
                          vVis ? "text-green-400" : "text-gray-400"
                        }`}
                      >
                        {visitante?.nome || "Visitante"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
