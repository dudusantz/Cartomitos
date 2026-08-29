"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  buscarTabelaGrupos,
  listarPartidas,
  buscarParciaisAoVivo,
} from "../../actions";
import ModalConfrontoAoVivo from "./ModalConfrontoAoVivo";

interface Props {
  campeonatoId: number;
}

export default function FaseGruposPublica({ campeonatoId }: Props) {
  const [dadosOriginais, setDadosOriginais] = useState<{
    grupos: any;
    jogos: any[];
  }>({ grupos: {}, jogos: [] });

  const [gruposExibidos, setGruposExibidos] = useState<any>({});
  const [jogosExibidos, setJogosExibidos] = useState<any[]>([]);

  // Array de zonas dinâmicas lido do banco de dados
  const [zonasClassificacao, setZonasClassificacao] = useState<any[]>([]);

  const [rodadaView, setRodadaView] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [modoAoVivo, setModoAoVivo] = useState(false);
  
  const [jogoSelecionado, setJogoSelecionado] = useState<any>(null);

  useEffect(() => {
    async function carregar() {
      try {
        // Busca as zonas salvas lá no Admin
        const { data: camp } = await supabase
          .from("campeonatos")
          .select("config_zonas")
          .eq("id", campeonatoId)
          .single();

        if (camp && camp.config_zonas) {
          // Ordena as zonas pela posição para garantir o funcionamento do .find() depois
          const zonasOrdenadas = Array.isArray(camp.config_zonas) 
            ? camp.config_zonas.sort((a, b) => a.posicao - b.posicao)
            : [];
          setZonasClassificacao(zonasOrdenadas);
        }

        const dadosGrupos = await buscarTabelaGrupos(campeonatoId);
        const dadosJogos = await listarPartidas(campeonatoId);
        
        const jogosGrupos = (dadosJogos || []).filter((j: any) => j.rodada <= 6);

        setDadosOriginais({ grupos: dadosGrupos, jogos: jogosGrupos });
        setGruposExibidos(dadosGrupos);
        setJogosExibidos(jogosGrupos);

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

  async function toggleAoVivo() {
    if (!modoAoVivo) {
      setLoadingLive(true);
      try {
        const jogosAbertos = dadosOriginais.jogos.filter(
          (j: any) => j.status !== "finalizado" && j.rodada === rodadaView
        );
        const { jogos: parciais } = await buscarParciaisAoVivo(jogosAbertos);

        const novosJogos = dadosOriginais.jogos.map((jogo) => {
          if (jogo.rodada === rodadaView) {
            const p = parciais?.find((x: any) => x.id === jogo.id);
            if (p && p.is_parcial) {
              return {
                ...jogo,
                placar_casa: p.placar_casa,
                placar_visitante: p.placar_visitante,
                is_parcial: true,
                status: "finalizado",
              };
            }
          }
          return jogo;
        });
        setJogosExibidos(novosJogos);

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

  const formatDecimal = (val: number) => {
    if (val === undefined || val === null) return 0;
    return Math.trunc(val);
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start animate-fadeIn max-w-[100vw] overflow-hidden">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-500">Classificação por chave</span>
              <h2 className="mt-0.5 text-xl md:text-2xl font-black text-white tracking-[-0.03em]">Fase de grupos</h2>
            </div>
            {modoAoVivo && (
              <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-md animate-pulse font-bold uppercase">
                Ao Vivo (R{rodadaView})
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-5">
          {Object.keys(gruposExibidos)
            .sort()
            .map((letra) => (
              <div
                key={letra}
                className={`bg-[#121212] border rounded-2xl overflow-hidden flex flex-col h-fit transition-colors shadow-[0_18px_45px_rgba(0,0,0,.2)] ${
                  modoAoVivo ? "border-green-500/25" : "border-white/[0.07]"
                }`}
              >
                <div className="bg-[#151515] px-4 py-3.5 border-b border-white/[0.07] flex justify-between items-center">
                  <span className="text-white font-black tracking-[-0.01em] text-sm">
                    Grupo {letra}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{gruposExibidos[letra].length} clubes</span>
                </div>

                <div className="md:hidden w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[7%]" />
                      <col className="w-[38%]" />
                      <col className="w-[7%]" />
                      <col className="w-[12%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead className="border-b border-white/[0.07] bg-[#0b0c0b] text-[7px] font-bold uppercase tracking-[0.08em] text-[#667077]">
                      <tr>
                        <th className="py-2 pl-2 text-center" aria-label="Posição">#</th>
                        <th className="py-2 pr-1">Clube</th>
                        <th className="py-2 text-center" title="Jogos">J</th>
                        <th className="py-2 text-center" title="Pontos pró e pontos contra">Gol</th>
                        <th className="py-2 text-center" title="Saldo de pontos">+/-</th>
                        <th className="py-2 text-center text-gray-300" title="Pontos">P</th>
                        <th className="py-2 text-center" title="Vitórias">V</th>
                        <th className="py-2 text-center" title="Empates">E</th>
                        <th className="py-2 text-center" title="Derrotas">D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.055] bg-[#101210]">
                  {gruposExibidos[letra].map((t: any, idx: number) => {
                    const time = Array.isArray(t.times) ? t.times[0] : t.times;
                    const zonaAtiva = zonasClassificacao.find((z) => (idx + 1) <= z.posicao);
                    const corZona = zonaAtiva ? zonaAtiva.cor : "#707770";

                    return (
                      <tr key={t.id} className="relative transition-colors hover:bg-white/[0.025]">
                        <td className="relative py-2.5 pl-2 text-center font-mono text-[9px] font-bold" style={{ color: corZona }}>
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ backgroundColor: corZona }} />
                          {idx + 1}
                        </td>
                        <td className="py-2.5 pr-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <img
                              src={time?.escudo || "/shield-placeholder.png"}
                              className="h-5 w-5 shrink-0 object-contain"
                              alt={`Escudo do ${time?.nome || "clube"}`}
                            />
                            <span className="min-w-0 whitespace-normal break-words text-[9px] font-semibold leading-[1.15] text-gray-100">
                              {time?.nome}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-mono text-[8px] text-gray-400">{t.pj}</td>
                        <td className="py-2.5 text-center font-mono text-[8px] text-gray-300">{formatDecimal(t.pp)}:{formatDecimal(t.pc)}</td>
                        <td className={`py-2.5 text-center font-mono text-[8px] font-bold ${t.sp > 0 ? "text-emerald-400" : t.sp < 0 ? "text-red-400" : "text-gray-500"}`}>
                          {t.sp > 0 ? "+" : ""}{formatDecimal(t.sp)}
                        </td>
                        <td className="py-2.5 text-center font-mono text-[10px] font-black text-[#f4bd14]">{t.pts}</td>
                        <td className="py-2.5 text-center font-mono text-[8px] text-gray-300">{t.v}</td>
                        <td className="py-2.5 text-center font-mono text-[8px] text-gray-300">{t.e}</td>
                        <td className="py-2.5 text-center font-mono text-[8px] text-gray-300">{t.d}</td>
                      </tr>
                    );
                  })}
                    </tbody>
                  </table>
                </div>

                <div className="hidden md:block w-full">
                  <table className="w-full table-fixed text-left text-[10px]">
                    <thead className="bg-[#0a0a0a] text-gray-500 uppercase font-bold tracking-widest border-b border-white/[0.06]">
                      <tr>
                        <th className="py-2.5 pl-3 w-[10%] md:w-[7%]">#</th>
                        <th className="py-2.5 px-1 w-[48%] md:w-[31%]">Clube</th>
                        <th className="py-2.5 text-center text-white w-[14%] md:w-[8%]">PTS</th>
                        <th className="py-2.5 text-center w-[12%] md:w-[6%]">J</th>
                        <th className="hidden md:table-cell py-2.5 text-center w-[6%]">V</th>
                        <th className="hidden md:table-cell py-2.5 text-center w-[6%]">E</th>
                        <th className="hidden md:table-cell py-2.5 text-center w-[6%]">D</th>
                        <th className="hidden md:table-cell py-2.5 text-center w-[9%]" title="Pontos Pró">PP</th>
                        <th className="hidden md:table-cell py-2.5 text-center w-[9%]" title="Pontos Contra">PC</th>
                        <th className="py-2.5 text-center w-[16%] md:w-[9%]" title="Saldo">SP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.045]">
                      {gruposExibidos[letra].map((t: any, idx: number) => {
                        const time = Array.isArray(t.times) ? t.times[0] : t.times;
                        
                        // Encontra a cor da zona baseada na posição do time
                        const zonaAtiva = zonasClassificacao.find((z) => (idx + 1) <= z.posicao);
                        const corZona = zonaAtiva ? zonaAtiva.cor : 'transparent';
                        const isClassificado = zonaAtiva !== undefined; // Tem cor, tem destaque

                        return (
                          <tr key={t.id} className="min-h-16 hover:bg-white/[0.025] transition-colors group">
                            <td className="py-3 pl-3 font-bold text-gray-500 relative">
                              {isClassificado && (
                                <div 
                                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                                  style={{ backgroundColor: corZona }}
                                ></div>
                              )}
                              <span style={{ color: isClassificado ? corZona : '' }}>
                                  {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 px-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={time?.escudo || "/shield-placeholder.png"}
                                  className="w-7 h-7 object-contain shrink-0"
                                  alt={`Escudo do ${time?.nome || 'clube'}`}
                                />
                                <div className="min-w-0">
                                  <span className={`font-semibold whitespace-normal break-words block leading-[1.15] text-[11px] ${isClassificado ? "text-white" : "text-gray-500"}`}>
                                    {time?.nome}
                                  </span>
                                  <span
                                    className="mt-1 block md:hidden text-[9px] font-mono text-gray-500 leading-relaxed whitespace-normal"
                                    title={`Jogos: ${t.pj} · Vitórias: ${t.v} · Empates: ${t.e} · Derrotas: ${t.d} · Pontos pró: ${formatDecimal(t.pp)} · Pontos contra: ${formatDecimal(t.pc)} · Saldo: ${formatDecimal(t.sp)}`}
                                  >
                                    J {t.pj} · V {t.v} · E {t.e} · D {t.d}
                                    <span className="block text-gray-600">
                                      PP {formatDecimal(t.pp)} · PC {formatDecimal(t.pc)} · SP {formatDecimal(t.sp)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 text-center font-mono font-bold text-sm text-white bg-white/[0.018]">
                              {t.pts}
                            </td>
                            <td className="py-2 text-center text-gray-600">{t.pj}</td>
                            <td className="hidden md:table-cell py-2 text-center text-gray-600 font-mono">{t.v}</td>
                            <td className="hidden md:table-cell py-2 text-center text-gray-600 font-mono">{t.e}</td>
                            <td className="hidden md:table-cell py-2 text-center text-gray-600 font-mono">{t.d}</td>
                            <td className="hidden md:table-cell py-2 text-center text-gray-500 font-mono">
                              {formatDecimal(t.pp)}
                            </td>
                            <td className="hidden md:table-cell py-2 text-center text-gray-500 font-mono">
                              {formatDecimal(t.pc)}
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
                              {formatDecimal(t.sp)}
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

        {/* LEGENDA DE CLASSIFICAÇÃO AUTOMÁTICA */}
        {zonasClassificacao.length > 0 && (
          <div className="px-1 flex flex-wrap gap-x-5 gap-y-2 items-center mt-1">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Legenda</span>
              
              {zonasClassificacao.map((zona, i) => (
                  <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: zona.cor }}></div>
                      <span className="text-[10px] text-gray-500 font-semibold tracking-wide">{zona.texto || `Posição ${zona.posicao}`}</span>
                  </div>
              ))}
              
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-transparent border border-gray-600 rounded-sm"></div>
                  <span className="text-[10px] text-gray-600 font-semibold tracking-wide">Eliminados</span>
              </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
        <div className="bg-[#121212] border border-white/[0.07] rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-sm"></span>{" "}
              Jogos
            </span>
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => setRodadaView((r) => Math.max(1, r - 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"
              >
                ‹
              </button>
              <span className="text-[10px] font-black px-2 text-yellow-500 uppercase">
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

          <button
            onClick={toggleAoVivo}
            disabled={loadingLive}
            className={`w-full py-3 mb-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2
              ${modoAoVivo ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" : "bg-yellow-500 text-black border border-yellow-400 hover:bg-yellow-400"}
            `}
          >
            {loadingLive ? "Carregando..." : modoAoVivo ? "Parar Simulação" : "Ver Parciais Ao Vivo"}
          </button>

          <div className="space-y-3">
            {jogosDaRodada.length === 0 && (
              <div className="text-center text-gray-600 text-[10px] py-4">
                Sem jogos nesta rodada.
              </div>
            )}

            {jogosDaRodada.map((j) => {
              const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
              const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;

              const finalizado = j.status === "finalizado";
              const parcial = j.is_parcial === true;
              const temResultado = finalizado || parcial;

              const c = j.placar_casa ?? 0;
              const v = j.placar_visitante ?? 0;

              const vCasa = temResultado && c > v;
              const vVis = temResultado && v > c;
              const empate = temResultado && c === v;

              return (
                <div
                  key={j.id}
                  onClick={() => setJogoSelecionado(j)}
                  className={`
                    cursor-pointer bg-[#151515] border rounded-xl p-4 transition-all relative overflow-hidden hover:border-yellow-500/35 hover:bg-[#1a1a1a]
                    ${parcial ? "border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "border-gray-800/60"}
                  `}
                >
                  {parcial ? (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider">Live</span>
                    </div>
                  ) : (
                    finalizado && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                  )}

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <div className="flex flex-col items-end gap-1.5 overflow-hidden">
                      <img
                        src={casa?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md ${!vCasa && temResultado && !empate ? "opacity-60 grayscale" : ""}`}
                        alt={`Escudo do ${casa?.nome || 'mandante'}`}
                      />
                      <span className={`text-[10px] font-bold text-right leading-tight w-full truncate ${vCasa ? "text-green-400" : "text-gray-400"}`}>
                        {casa?.nome || "Mandante"}
                      </span>
                    </div>

                    <div
                      className={`
                        flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-black text-sm w-auto min-w-[80px] shadow-inner
                        ${parcial ? "bg-green-900/10 border-green-900/40 text-green-400" : temResultado ? "bg-black/40 border-gray-700 text-white" : "bg-black/20 border-gray-800 text-gray-600"}
                      `}
                    >
                      <span className={vCasa ? "text-green-400" : ""}>{j.placar_casa !== undefined ? Math.trunc(j.placar_casa) : "-"}</span>
                      <span className={`text-[10px] ${parcial ? "text-green-600" : "text-gray-700"}`}>✕</span>
                      <span className={vVis ? "text-green-400" : ""}>{j.placar_visitante !== undefined ? Math.trunc(j.placar_visitante) : "-"}</span>
                    </div>

                    <div className="flex flex-col items-start gap-1.5 overflow-hidden">
                      <img
                        src={visitante?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md ${!vVis && temResultado && !empate ? "opacity-60 grayscale" : ""}`}
                        alt={`Escudo do ${visitante?.nome || 'visitante'}`}
                      />
                      <span className={`text-[10px] font-bold text-left leading-tight w-full truncate ${vVis ? "text-green-400" : "text-gray-400"}`}>
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
      
      {jogoSelecionado && (
          <ModalConfrontoAoVivo 
              jogo={{...jogoSelecionado, rodada: jogoSelecionado.rodada_cartola}} 
              onClose={() => setJogoSelecionado(null)} 
          />
      )}
    </div>
  );
}
