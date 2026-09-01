"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  buscarTabelaPontosCorridos,
  buscarParciaisAoVivo,
  listarPartidas,
} from "../../actions";
import ModalConfrontoAoVivo from "./ModalConfrontoAoVivo";
import TeamLink from "./TeamLink";
import toast from "react-hot-toast";

interface Props {
  campeonatoId: number;
}

export default function TabelaPublica({ campeonatoId }: Props) {
  const [dadosOriginais, setDadosOriginais] = useState<{
    tabela: any[];
    jogos: any[];
  }>({ tabela: [], jogos: [] });
  const [tabelaExibida, setTabelaExibida] = useState<any[]>([]);
  const [jogosExibidos, setJogosExibidos] = useState<any[]>([]);
  const [rodadaView, setRodadaView] = useState(1);
  const [modoAoVivo, setModoAoVivo] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Zonas Dinâmicas
  const [zonasClassificacao, setZonasClassificacao] = useState<any[]>([]);

  // State para o Modal
  const [jogoSelecionado, setJogoSelecionado] = useState<any>(null);

  useEffect(() => {
    async function init() {
      // Busca Configuração de Zonas
      const { data: camp } = await supabase
        .from('campeonatos')
        .select('config_zonas')
        .eq('id', campeonatoId)
        .single();
      
      if (camp && camp.config_zonas) {
        const zonasOrdenadas = Array.isArray(camp.config_zonas) 
          ? camp.config_zonas.sort((a, b) => a.posicao - b.posicao)
          : [];
        setZonasClassificacao(zonasOrdenadas);
      }

      const [tabela, jogos] = await Promise.all([
        buscarTabelaPontosCorridos(campeonatoId),
        listarPartidas(campeonatoId),
      ]);

      const tabelaComPos = tabela.map((t: any, i: number) => ({
        ...t,
        posOriginal: i + 1,
      }));

      setDadosOriginais({ tabela: tabelaComPos, jogos });
      setTabelaExibida(tabelaComPos);
      setJogosExibidos(jogos);

      if (jogos.length > 0) {
        const atual =
          jogos.find((j: any) => j.status !== "finalizado")?.rodada ||
          Math.max(...jogos.map((j: any) => j.rodada));
        setRodadaView(atual);
      }
    }
    init();
  }, [campeonatoId]);

  useEffect(() => {
    if (dadosOriginais.tabela.length === 0) return;

    if (modoAoVivo) {
      atualizarDadosAoVivo();
    } else {
      setTabelaExibida(dadosOriginais.tabela);
      setJogosExibidos(dadosOriginais.jogos);
    }
  }, [modoAoVivo, rodadaView, dadosOriginais]);

  async function atualizarDadosAoVivo() {
    setLoading(true);
    try {
      const jogosParaAtualizar = dadosOriginais.jogos.filter(
        (j: any) => j.status !== "finalizado" && j.rodada === rodadaView
      );

      const resposta = await buscarParciaisAoVivo(jogosParaAtualizar);
      if (!resposta.success) {
        toast.error(resposta.msg || "Não foi possível carregar as parciais.");
        return;
      }
      const parciais = resposta.jogos;

      const novosJogos = dadosOriginais.jogos.map((jogo) => {
        if (jogo.rodada === rodadaView) {
          const p = parciais?.find((x: any) => x.id === jogo.id);
          if (p && p.is_parcial) {
            return {
              ...jogo,
              placar_casa: p.placar_casa,
              placar_visitante: p.placar_visitante,
              is_parcial: true,
            };
          }
        }
        return jogo;
      });
      setJogosExibidos(novosJogos);

      const novaTabela = dadosOriginais.tabela
        .map((time) => {
          const jogosTime = novosJogos.filter(
            (j: any) =>
              j.is_parcial &&
              j.rodada === rodadaView &&
              (j.time_casa === time.time_id ||
                j.time_visitante === time.time_id)
          );

          let pts = 0,
            v = 0,
            e = 0,
            d = 0,
            gp = 0,
            gc = 0,
            sg = 0;

          jogosTime.forEach((j: any) => {
            const c = j.placar_casa;
            const vis = j.placar_visitante;
            const isCasa = j.time_casa === time.time_id;

            const golsPro = isCasa ? c : vis;
            const golsContra = isCasa ? vis : c;

            gp += golsPro;
            gc += golsContra;
            sg += golsPro - golsContra;

            if (isCasa) {
              if (c > vis) {
                pts += 3;
                v++;
              } else if (c === vis) {
                pts += 1;
                e++;
              } else d++;
            } else {
              if (vis > c) {
                pts += 3;
                v++;
              } else if (vis === c) {
                pts += 1;
                e++;
              } else d++;
            }
          });

          return {
            ...time,
            pts: time.pts + pts,
            v: time.v + v,
            e: time.e + e,
            d: time.d + d,
            gp: (time.gp || 0) + gp,
            gc: (time.gc || 0) + gc,
            sg: (time.sg || 0) + sg,
            ptsExtra: pts, 
          };
        })
        .sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg);

      setTabelaExibida(novaTabela);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const jogosDaRodada = jogosExibidos.filter((j) => j.rodada === rodadaView);
  const totalRodadas =
    dadosOriginais.jogos.length > 0
      ? Math.max(...dadosOriginais.jogos.map((j) => j.rodada))
      : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start animate-fadeIn max-w-[100vw] overflow-hidden">
      
      {/* ESQUERDA: CLASSIFICAÇÃO */}
      <div className="lg:col-span-7 min-w-0">
        <div className="bg-[#121212] border border-white/[0.07] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-4 py-4 md:p-5 border-b border-white/[0.07] bg-[#0a0a0a] flex flex-row justify-between items-center gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-500">Tabela geral</span>
              <h2 className="mt-0.5 text-lg md:text-xl font-black text-white tracking-[-0.025em]">
                Classificação
              </h2>
            </div>
            <span className="hidden sm:block text-[10px] text-gray-600 font-medium">{tabelaExibida.length} clubes</span>
            {modoAoVivo && (
              <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest animate-pulse border border-green-500/20 px-2.5 py-1 rounded-md bg-green-500/10">
                Ao Vivo (R{rodadaView})
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.06] bg-yellow-500/[0.035] px-4 py-2 sm:hidden">
            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-yellow-500">Tabela completa</span>
            <span className="flex items-center gap-1 text-[8px] font-medium text-gray-500">Arraste para o lado <span className="text-yellow-500">↔</span></span>
          </div>

          <div className="custom-scrollbar w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-[780px] w-full table-fixed text-left text-[10px]">
              <thead className="bg-[#151515] text-gray-500 uppercase font-bold tracking-widest border-b border-white/[0.06] h-10">
                <tr>
                  <th className="sticky left-0 z-20 w-[52px] bg-[#151515] pl-3 text-center md:pl-4">#</th>
                  <th className="sticky left-[52px] z-20 w-[230px] bg-[#151515] px-3 shadow-[8px_0_18px_rgba(0,0,0,0.18)]">Clube</th>
                  <th className="w-[64px] text-center text-white">PTS</th>
                  <th className="w-[52px] text-center">J</th>
                  <th className="w-[52px] text-center">V</th>
                  <th className="w-[52px] text-center">E</th>
                  <th className="w-[52px] text-center">D</th>
                  <th className="w-[72px] text-center text-gray-400" title="Pontos Pró">PP</th>
                  <th className="w-[72px] text-center text-gray-400" title="Pontos Contra">PC</th>
                  <th className="w-[72px] text-center text-white" title="Saldo">SP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.045]">
                {tabelaExibida.map((t, i) => {
                  const time = Array.isArray(t.times) ? t.times[0] : t.times;
                  const diff = t.posOriginal - (i + 1);

                  // Busca a cor e verifica se tem estilo na borda
                  const zonaAtiva = zonasClassificacao.find((z) => (i + 1) <= z.posicao);
                  const corZona = zonaAtiva ? zonaAtiva.cor : 'transparent';
                  const isClassificado = zonaAtiva !== undefined;

                  return (
                    <tr
                      key={t.id}
                      className="group hover:bg-white/[0.025] transition-colors min-h-14 md:min-h-12 relative"
                    >
                      <td className="sticky left-0 z-10 bg-[#121212] pl-3 text-center relative transition-colors group-hover:bg-[#171917] md:pl-4">
                        {isClassificado && (
                          <div 
                            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                            style={{ backgroundColor: corZona }}
                          ></div>
                        )}

                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="font-black text-xs" style={{ color: isClassificado ? corZona : '#6b7280' }}>
                            {i + 1}º
                          </span>
                          {modoAoVivo && diff !== 0 && (
                            <span className={`text-[8px] font-bold leading-none mt-0.5 ${diff > 0 ? "text-green-500" : "text-red-500"}`}>
                              {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="sticky left-[52px] z-10 bg-[#121212] px-3 py-2.5 shadow-[8px_0_18px_rgba(0,0,0,0.18)] transition-colors group-hover:bg-[#171917]">
                        <TeamLink team={time} className="flex min-w-0 items-center gap-3">
                          <img
                            src={time?.escudo || "/shield-placeholder.png"}
                            className="w-8 h-8 object-contain shrink-0 drop-shadow-md"
                            alt={`Escudo do ${time?.nome || 'clube'}`}
                          />
                          <div className="flex flex-col min-w-0 justify-center">
                            <span className={`block whitespace-nowrap text-[11px] font-semibold leading-[1.15] transition group-hover:text-white md:text-xs ${isClassificado ? "text-gray-200" : "text-gray-400"}`}>
                              {time?.nome}
                            </span>
                            {modoAoVivo && t.ptsExtra > 0 && (
                              <span className="text-[9px] text-green-500 font-bold leading-none block">
                                +3 pts
                              </span>
                            )}
                          </div>
                        </TeamLink>
                      </td>
                      <td className="text-center font-mono font-bold text-sm text-white bg-white/[0.018]">
                        {t.pts}
                      </td>
                      <td className="text-center text-gray-500 font-mono">{t.pj}</td>
                      <td className="text-center text-gray-500 font-mono">{t.v}</td>
                      <td className="text-center text-gray-500 font-mono">{t.e}</td>
                      <td className="text-center text-gray-500 font-mono">{t.d}</td>
                      <td className="text-center text-gray-400 font-mono">
                        {Math.trunc(t.gp)}
                      </td>
                      <td className="text-center text-gray-400 font-mono">
                        {Math.trunc(t.gc)}
                      </td>
                      <td className={`text-center font-mono font-bold ${t.sg > 0 ? "text-green-500" : t.sg < 0 ? "text-red-500" : "text-gray-500"}`}>
                        {Math.trunc(t.sg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda Dinâmica */}
        {zonasClassificacao.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 px-1">
            {zonasClassificacao.map((zona, i) => (
               <div key={i} className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold tracking-wide">
                 <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: zona.cor }}></span> {zona.texto}
               </div>
            ))}
          </div>
        )}
      </div>

      {/* DIREITA: LISTA DE JOGOS */}
      <aside className="min-w-0 space-y-6 lg:col-span-5 lg:sticky lg:top-24">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101210] shadow-[0_24px_70px_rgba(0,0,0,0.25)] md:rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#141714] px-4 py-4 md:px-5">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-500">Rodada {rodadaView}</span>
              <h2 className="mt-0.5 text-sm font-black tracking-[-0.015em] text-white">Jogos e resultados</h2>
            </div>
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => setRodadaView((r) => Math.max(1, r - 1))}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30"
              >
                ‹
              </button>
              <span className="text-[10px] font-black px-3 text-yellow-500 uppercase tracking-widest">
                R{rodadaView}
              </span>
              <button
                onClick={() => setRodadaView((r) => Math.min(totalRodadas, r + 1))}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>

          <div className="p-4 md:p-5"><button
            onClick={() => setModoAoVivo(!modoAoVivo)}
            disabled={loading}
            className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-[9px] font-black uppercase tracking-[0.12em] transition-all active:scale-[0.99] ${
              modoAoVivo
                ? "border-white/[0.08] bg-white/[0.035] text-gray-300 hover:bg-white/[0.07] hover:text-white"
                : "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400"
            }`}
          >
            {loading ? "Atualizando parciais..." : modoAoVivo ? "Encerrar acompanhamento" : "Acompanhar em tempo real"}
          </button>

          {modoAoVivo && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-green-500/15 bg-green-500/[0.045] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-green-400">Parciais ativadas</span>
              </div>
              <span className="text-[8px] font-medium text-gray-600">Rodada {rodadaView}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {jogosDaRodada.length === 0 && (
              <div className="text-center py-12 text-gray-600 text-xs border border-dashed border-gray-800 rounded-2xl">
                Nenhum jogo agendado.
              </div>
            )}

            {jogosDaRodada.map((j) => {
              const casa = Array.isArray(j.casa) ? j.casa[0] : j.casa;
              const visitante = Array.isArray(j.visitante) ? j.visitante[0] : j.visitante;
              const isLive = j.is_parcial === true;
              const finalizado = j.status === "finalizado";
              const temPlacar = finalizado || isLive;
              
              const c = j.placar_casa ?? 0;
              const v = j.placar_visitante ?? 0;
              const cWin = temPlacar && c > v;
              const vWin = temPlacar && v > c;

              return (
                <div
                  key={j.id}
                  onClick={() => setJogoSelecionado(j)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.07] bg-[#090a09] transition-all hover:border-yellow-500/35 hover:bg-[#0d0f0d] active:scale-[0.995]"
                >
                  <div className="px-3.5 py-3">
                    <div className={`grid grid-cols-[3px_30px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 py-1.5 ${cWin ? "bg-white/[0.025]" : ""}`}>
                      <span className={`h-5 w-[3px] rounded-full ${cWin ? "bg-yellow-500" : "bg-transparent"}`} />
                      <TeamLink team={casa} className="contents">
                        <img
                          src={casa?.escudo || "/shield-placeholder.png"}
                          className="h-8 w-8 shrink-0 object-contain transition-transform group-hover:scale-105"
                          alt={`Escudo do ${casa?.nome || 'mandante'}`}
                        />
                        <span className={`min-w-0 truncate text-[11px] font-bold ${cWin ? "text-white" : "text-gray-400"}`}>
                          {casa?.nome}
                        </span>
                      </TeamLink>
                      <span className={`min-w-11 rounded-md bg-white/[0.035] px-2 py-1 text-center font-mono text-base font-black tabular-nums ${cWin ? "text-white" : "text-gray-300"}`}>
                        {j.placar_casa !== undefined ? Math.trunc(j.placar_casa) : "–"}
                      </span>
                    </div>
                    <div className={`grid grid-cols-[3px_30px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 py-1.5 ${vWin ? "bg-white/[0.025]" : ""}`}>
                      <span className={`h-5 w-[3px] rounded-full ${vWin ? "bg-yellow-500" : "bg-transparent"}`} />
                      <TeamLink team={visitante} className="contents">
                        <img
                          src={visitante?.escudo || "/shield-placeholder.png"}
                          className="h-8 w-8 shrink-0 object-contain transition-transform group-hover:scale-105"
                          alt={`Escudo do ${visitante?.nome || 'visitante'}`}
                        />
                        <span className={`min-w-0 truncate text-[11px] font-bold ${vWin ? "text-white" : "text-gray-400"}`}>
                          {visitante?.nome}
                        </span>
                      </TeamLink>
                      <span className={`min-w-11 rounded-md bg-white/[0.035] px-2 py-1 text-center font-mono text-base font-black tabular-nums ${vWin ? "text-white" : "text-gray-300"}`}>
                        {j.placar_visitante !== undefined ? Math.trunc(j.placar_visitante) : "–"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.055] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.1em]">
                    <span className={isLive ? "flex items-center gap-1.5 text-green-400" : "text-gray-600"}>
                      {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />}
                      {isLive ? "Parcial em andamento" : finalizado ? "Resultado final" : "Partida agendada"}
                    </span>
                    <span className="text-gray-700 transition-colors group-hover:text-yellow-500">Ver confronto →</span>
                  </div>
                </div>
              );
            })}
          </div></div>
        </section>
      </aside>

      {jogoSelecionado && (
        <ModalConfrontoAoVivo 
          jogo={{ ...jogoSelecionado, rodada: jogoSelecionado.rodada_cartola }}
          onClose={() => setJogoSelecionado(null)} 
        />
      )}
    </div>
  );
}
