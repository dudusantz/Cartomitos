"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  listarTimesDoCampeonato,
  listarTodosTimes,
  atualizarConfiguracaoLiga,
  gerarMataMataCopa,
  buscarTabelaGrupos,
  buscarPodium,
} from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { ModalConfirmacao } from "@/app/components/ModalConfirmacao";
import BotaoFinalizarCampeonato from "@/app/components/BotaoFinalizarCampeonato";
import { Trophy, Calendar, Medal } from "lucide-react";

// IMPORTAÇÃO DOS PAINÉIS
import PainelPontosCorridos from "@/app/components/PainelPontosCorridos";
import PainelMataMata from "@/app/components/PainelMataMata";
import PainelFaseGrupos from "@/app/components/PainelFaseGrupos";
import PainelTimes from "@/app/components/PainelTimes";

export default function GerenciarLiga() {
  const { id } = useParams();
  const campeonatoId = Number(id);

  const [liga, setLiga] = useState<any>(null);
  const [timesLiga, setTimesLiga] = useState<any[]>([]);
  const [todosTimes, setTodosTimes] = useState<any[]>([]);

  // Estado inicial
  const [tabAtiva, setTabAtiva] = useState<string>("times");
  const [finalUnica, setFinalUnica] = useState(false);
  const [redirFeito, setRedirFeito] = useState(false);

  // Copa & Podium
  const [pote1, setPote1] = useState<any[]>([]);
  const [pote2, setPote2] = useState<any[]>([]);
  const [podium, setPodium] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({});
  const [mmKey, setMmKey] = useState(0);

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  useEffect(() => {
    if (tabAtiva === "jogos" && liga?.tipo === "copa") {
      atualizarPotes();
    }
  }, [tabAtiva, liga]);

  async function carregarDados() {
    // Busca os dados da liga
    const { data } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("id", campeonatoId)
      .single();

    // Atualiza os estados
    setLiga(data);
    setFinalUnica(data?.final_unica || false);

    // Se estiver finalizado, busca o pódio
    if (data && !data.ativo) {
      const p = await buscarPodium(campeonatoId);
      setPodium(p);
    }

    const _times = await listarTimesDoCampeonato(campeonatoId);
    setTimesLiga(_times);
    setTodosTimes(await listarTodosTimes());

    if (data?.tipo === "copa") {
      await atualizarPotes();
    }

    if (!redirFeito && data) {
      if (data.tipo === "copa") setTabAtiva("grupos");
      else if (data.tipo === "pontos_corridos") setTabAtiva("classificacao");
      else if (data.tipo === "mata-mata") setTabAtiva("jogos");
      setRedirFeito(true);
    }
  }

  async function atualizarPotes() {
    const grupos = await buscarTabelaGrupos(campeonatoId);
    processarClassificados(grupos);
  }

  function processarClassificados(grupos: any) {
    const p1: any[] = [];
    const p2: any[] = [];
    if (grupos) {
      Object.keys(grupos).forEach((letra) => {
        const time1 = grupos[letra][0];
        const time2 = grupos[letra][1];
        if (time1) p1.push({ ...time1, gp_origem: letra });
        if (time2) p2.push({ ...time2, gp_origem: letra });
      });
    }
    p1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
    setPote1(p1);
    setPote2(p2);
  }

  async function handleGerarCopa() {
    setModalConfig({
      titulo: "Gerar Chave Final",
      descricao:
        "O sistema usará as regras: 1º vs 2º, trava de grupos e melhores campanhas em lados opostos. Confirmar?",
      onConfirm: async () => {
        const res = await gerarMataMataCopa(campeonatoId);
        if (res.success) {
          toast.success(res.msg);
          await carregarDados();
          setMmKey((prev) => prev + 1);
          setModalOpen(false);
        } else {
          toast.error(res.msg);
        }
      },
      corBotao: "green",
      textoBotao: "Sim, Gerar",
    });
    setModalOpen(true);
  }

  // --- CORREÇÃO AQUI: TELA DE CARREGAMENTO ---
  // Enquanto "liga" for null, mostramos um spinner em vez de tentar renderizar a página
  if (!liga) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
      <ModalConfirmacao
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        titulo={modalConfig.titulo || ""}
        descricao={modalConfig.descricao || ""}
        corBotao={modalConfig.corBotao || "blue"}
        textoBotao={modalConfig.textoBotao || "Confirmar"}
      />

      {/* HEADER */}
      <div className="p-8 border-b border-gray-800 bg-[#080808]">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="flex-1">
            <Link
              href="/admin/ligas"
              className="text-gray-500 text-xs font-bold hover:text-white uppercase mb-2 block transition"
            >
              ← Voltar
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tighter text-white">
                {liga?.nome}
              </h1>
              {liga?.ativo && (
                <div className="ml-4">
                  <BotaoFinalizarCampeonato campeonatoId={campeonatoId} />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] bg-gray-800 border border-gray-700 px-3 py-1 rounded-full uppercase font-bold text-gray-300 tracking-widest">
                {liga?.tipo?.replace("_", " ")}
              </span>
              {!liga?.ativo && (
                <span className="text-[10px] bg-red-900/30 border border-red-500/30 text-red-400 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
                  Finalizado
                </span>
              )}
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex gap-2 bg-[#121212] p-1.5 rounded-xl border border-gray-800 shadow-xl overflow-x-auto max-w-full">
            {liga?.tipo === "pontos_corridos" && (
              <button
                onClick={() => setTabAtiva("classificacao")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "classificacao" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Tabela
              </button>
            )}

            {liga?.tipo === "copa" && (
              <button
                onClick={() => setTabAtiva("grupos")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "grupos" ? "bg-yellow-600 text-black shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Grupos
              </button>
            )}

            {(liga?.tipo === "mata-mata" || liga?.tipo === "copa") && (
              <button
                onClick={() => setTabAtiva("jogos")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "jogos" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                {liga?.tipo === "mata-mata" ? "Chaveamento" : "Mata-Mata"}
              </button>
            )}

            <button
              onClick={() => setTabAtiva("times")}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "times" ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
            >
              Times
            </button>

            {liga?.tipo !== "pontos_corridos" && (
              <button
                onClick={() => setTabAtiva("config")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "config" ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Config
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto">
        {/* --- CARD DE CAMPEÕES (SÓ APARECE SE FINALIZADO) --- */}
        {!liga?.ativo && podium.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-black p-8 rounded-3xl border border-yellow-600/30 relative overflow-hidden mb-10 shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Trophy size={180} />
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 text-yellow-500">
                  <Trophy size={20} />
                  <span className="font-bold uppercase tracking-widest text-xs">
                    Campeonato Encerrado
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  Galeria de Honra
                </h2>
                {liga.data_fim && (
                  <p className="text-gray-500 text-sm flex items-center gap-2">
                    <Calendar size={14} />
                    Finalizado em:{" "}
                    {new Date(liga.data_fim).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              <div className="flex gap-4 items-end">
                {/* 2º Lugar */}
                {podium[1] && (
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-400 p-1 bg-black">
                      <img
                        src={podium[1].escudo}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-gray-400 font-bold text-xs">
                        2º Lugar
                      </span>
                      <span className="text-gray-300 font-bold text-sm max-w-[100px] truncate block">
                        {podium[1].nome}
                      </span>
                    </div>
                  </div>
                )}

                {/* 1º Lugar */}
                {podium[0] && (
                  <div className="flex flex-col items-center gap-2 relative">
                    <Medal
                      className="text-yellow-400 absolute -top-6 animate-bounce"
                      size={24}
                    />
                    <div className="w-24 h-24 rounded-full border-4 border-yellow-500 p-1 bg-black shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                      <img
                        src={podium[0].escudo}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-yellow-500 font-black text-sm uppercase tracking-wider">
                        Campeão
                      </span>
                      <span className="text-white font-bold text-lg max-w-[140px] truncate block">
                        {podium[0].nome}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3º Lugar */}
                {podium[2] && (
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="w-14 h-14 rounded-full border-2 border-amber-700 p-1 bg-black">
                      <img
                        src={podium[2].escudo}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-amber-700 font-bold text-xs">
                        3º Lugar
                      </span>
                      <span className="text-gray-400 font-bold text-xs max-w-[90px] truncate block">
                        {podium[2].nome}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAINÉIS */}
        {tabAtiva === "classificacao" && liga?.tipo === "pontos_corridos" && (
          <PainelPontosCorridos
            campeonatoId={campeonatoId}
            times={timesLiga} 
          />
        )}

        {tabAtiva === "jogos" && liga?.tipo === "mata-mata" && (
          <PainelMataMata
            key={mmKey}
            campeonatoId={campeonatoId}
            rodadasCorte={0}
          />
        )}

        {tabAtiva === "jogos" && liga?.tipo === "copa" && (
          <div className="animate-fadeIn">
            <div className="mb-8 bg-[#121212] p-6 rounded-3xl border border-gray-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
                    Fase Final
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Regras: 1º vs 2º Colocado.
                  </p>
                </div>
                {liga?.ativo && (
                  <button
                    onClick={handleGerarCopa}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-4 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-yellow-900/20 tracking-widest flex items-center gap-2"
                  >
                    <span>⚡</span> Gerar Chave Final
                  </button>
                )}
              </div>
              {/* Potes */}
              {pote1.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                  <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Pote 1
                      </span>
                    </div>
                    <div className="space-y-1">
                      {pote1.map((t, idx) => (
                        <div
                          key={t.time_id}
                          className={`flex justify-between items-center p-2 rounded ${idx < 2 ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-white/5"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono font-bold text-[10px] w-4 ${idx < 2 ? "text-yellow-500" : "text-gray-500"}`}
                            >
                              #{idx + 1}
                            </span>
                            <img
                              src={t.times?.escudo || "/shield-placeholder.png"}
                              className="w-5 h-5 object-contain"
                            />
                            <span className="text-xs font-bold text-gray-300">
                              {t.times?.nome}
                            </span>
                          </div>
                          <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                            <span>Gr.{t.gp_origem}</span>
                            <span className="text-white font-bold">
                              {t.pts}pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Pote 2
                      </span>
                    </div>
                    <div className="space-y-1">
                      {pote2.map((t) => (
                        <div
                          key={t.time_id}
                          className="flex justify-between items-center p-2 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[10px] w-4 text-gray-500">
                              -
                            </span>
                            <img
                              src={t.times?.escudo || "/shield-placeholder.png"}
                              className="w-5 h-5 object-contain"
                            />
                            <span className="text-xs font-bold text-gray-300">
                              {t.times?.nome}
                            </span>
                          </div>
                          <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                            <span>Gr.{t.gp_origem}</span>
                            <span className="text-white font-bold">
                              {t.pts}pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <PainelMataMata
              key={mmKey}
              campeonatoId={campeonatoId}
              rodadasCorte={6}
              bloquearGerador={true}
              isCopa={true}
            />
          </div>
        )}

        {tabAtiva === "grupos" && (
          <PainelFaseGrupos campeonatoId={campeonatoId} times={timesLiga} />
        )}

        {tabAtiva === "times" && (
          <PainelTimes
            campeonatoId={campeonatoId}
            ativo={liga.ativo}
            timesLiga={timesLiga}
            todosTimes={todosTimes}
            aoAtualizar={carregarDados}
          />
        )}

        {tabAtiva === "config" && (
          <div className="bg-[#121212] p-8 rounded-3xl border border-gray-800 max-w-4xl mx-auto animate-fadeIn">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">
              Configurações
            </h3>
            <div className="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
              <div>
                <span className="font-bold block text-white text-sm">
                  Final em Jogo Único
                </span>
                <span className="text-gray-500 text-xs">
                  Se ativado, a final será decidida em apenas uma partida.
                </span>
              </div>
              <input
                type="checkbox"
                checked={finalUnica}
                onChange={(e) => {
                  setFinalUnica(e.target.checked);
                  atualizarConfiguracaoLiga(campeonatoId, e.target.checked);
                }}
                className="w-6 h-6 accent-green-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
