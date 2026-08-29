"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  buscarTabelaPontosCorridos,
  buscarParciaisAoVivo,
  listarPartidas,
} from "../../actions";
import ModalConfrontoAoVivo from "./ModalConfrontoAoVivo";

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

      const { jogos: parciais } = await buscarParciaisAoVivo(
        jogosParaAtualizar
      );

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

          <div className="w-full">
            <table className="w-full table-fixed text-left text-[10px]">
              <thead className="bg-[#151515] text-gray-500 uppercase font-bold tracking-widest border-b border-white/[0.06] h-10">
                <tr>
                  <th className="pl-3 md:pl-4 w-[13%] md:w-[8%] text-center">#</th>
                  <th className="px-2 w-[43%] md:w-[32%]">Clube</th>
                  <th className="text-center text-white w-[15%] md:w-[8%]">PTS</th>
                  <th className="text-center w-[13%] md:w-[6%]">J</th>
                  <th className="hidden sm:table-cell text-center w-[6%]">V</th>
                  <th className="hidden sm:table-cell text-center w-[6%]">E</th>
                  <th className="hidden sm:table-cell text-center w-[6%]">D</th>
                  <th className="hidden md:table-cell text-center w-[8%] text-gray-400" title="Pontos Pró">PP</th>
                  <th className="hidden md:table-cell text-center w-[8%] text-gray-400" title="Pontos Contra">PC</th>
                  <th className="text-center w-[16%] md:w-[8%] text-white" title="Saldo">SP</th>
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
                      <td className="pl-3 md:pl-4 text-center relative">
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
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={time?.escudo || "/shield-placeholder.png"}
                            className="w-8 h-8 object-contain shrink-0 drop-shadow-md"
                            alt={`Escudo do ${time?.nome || 'clube'}`}
                          />
                          <div className="flex flex-col min-w-0 justify-center">
                            <span className={`font-semibold text-[11px] md:text-xs leading-[1.15] group-hover:text-white transition whitespace-normal break-words block ${isClassificado ? "text-gray-200" : "text-gray-400"}`}>
                              {time?.nome}
                            </span>
                            {modoAoVivo && t.ptsExtra > 0 && (
                              <span className="text-[9px] text-green-500 font-bold leading-none block">
                                +3 pts
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center font-mono font-bold text-sm text-white bg-white/[0.018]">
                        {t.pts}
                      </td>
                      <td className="text-center text-gray-500 font-mono">{t.pj}</td>
                      <td className="hidden sm:table-cell text-center text-gray-500 font-mono">{t.v}</td>
                      <td className="hidden sm:table-cell text-center text-gray-500 font-mono">{t.e}</td>
                      <td className="hidden sm:table-cell text-center text-gray-500 font-mono">{t.d}</td>
                      <td className="hidden md:table-cell text-center text-gray-400 font-mono">
                        {Math.trunc(t.gp)}
                      </td>
                      <td className="hidden md:table-cell text-center text-gray-400 font-mono">
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
      <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 min-w-0">
        <div className="bg-[#121212] border border-white/[0.07] rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-sm"></span>{" "}
              Jogos
            </span>
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

          <button
            onClick={() => setModoAoVivo(!modoAoVivo)}
            disabled={loading}
            className={`w-full py-3.5 mb-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 border ${
              modoAoVivo
                ? "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20"
                : "bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400"
            }`}
          >
            {loading ? "..." : modoAoVivo ? "Encerrar Transmissão" : "Acompanhar em Tempo Real"}
          </button>

          <div className="space-y-3">
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
                  className={`cursor-pointer relative bg-[#151515] border p-4 rounded-xl transition-all overflow-hidden group hover:border-yellow-500/35 hover:bg-[#1a1a1a] ${
                    isLive ? "border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-gray-800/60"
                  }`}
                >
                  {isLive && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-green-900/30 backdrop-blur-sm z-10">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider">Live</span>
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-1">
                    <div className="flex flex-col items-end gap-1 overflow-hidden">
                      <img
                        src={casa?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md transition-transform group-hover:scale-110 ${!cWin && temPlacar && c !== v ? "grayscale opacity-60" : ""}`}
                        alt={`Escudo do ${casa?.nome || 'mandante'}`}
                      />
                      <span className={`text-[10px] font-bold uppercase leading-tight text-right truncate w-full ${cWin ? "text-green-400" : "text-gray-400 group-hover:text-gray-200"}`}>
                        {casa?.nome}
                      </span>
                    </div>

                    <div className={`flex flex-col items-center justify-center w-auto min-w-[70px] px-1 h-[36px] rounded-lg border font-mono text-sm font-black shadow-inner ${isLive ? "bg-green-900/10 border-green-500/30 text-green-400" : temPlacar ? "bg-black/40 border-gray-700 text-white" : "bg-black/20 border-gray-800 text-gray-600"}`}>
                      <div className="flex items-center gap-1">
                        <span className={cWin ? "text-green-400" : ""}>{j.placar_casa !== undefined ? Math.trunc(j.placar_casa) : "-"}</span>
                        <span className="text-[10px] opacity-50 mx-0.5">:</span>
                        <span className={vWin ? "text-green-400" : ""}>{j.placar_visitante !== undefined ? Math.trunc(j.placar_visitante) : "-"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1 overflow-hidden">
                      <img
                        src={visitante?.escudo || "/shield-placeholder.png"}
                        className={`w-8 h-8 object-contain drop-shadow-md transition-transform group-hover:scale-110 ${!vWin && temPlacar && c !== v ? "grayscale opacity-60" : ""}`}
                        alt={`Escudo do ${visitante?.nome || 'visitante'}`}
                      />
                      <span className={`text-[10px] font-bold uppercase leading-tight text-left truncate w-full ${vWin ? "text-green-400" : "text-gray-400 group-hover:text-gray-200"}`}>
                        {visitante?.nome}
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
          jogo={jogoSelecionado} 
          onClose={() => setJogoSelecionado(null)} 
        />
      )}
    </div>
  );
}
