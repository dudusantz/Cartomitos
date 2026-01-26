"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buscarPodium,
  listarTimesDoCampeonato,
} from "@/app/actions";
import { Trophy, Calendar, Medal, ChevronLeft } from "lucide-react";

// Componentes Públicos (Read-Only)
import TabelaPublica from "@/app/components/public/TabelaPublica";
import MataMataPublico from "@/app/components/public/MataMataPublico";
import FaseGruposPublica from "@/app/components/public/FaseGruposPublica";

export default function PaginaPublicaCampeonato() {
  const { id } = useParams();

  // === MUDANÇA AQUI: Extração Inteligente do ID ===
  // Funciona para "/campeonatos/5" e para "/campeonatos/brasileirao-2025-5"
  const rawId = Array.isArray(id) ? id[0] : id; // Garante que é uma string
  const parts = rawId.split('-');               // Quebra o texto nos hifens
  const lastPart = parts[parts.length - 1];     // Pega sempre a última parte
  const campeonatoId = Number(lastPart);        // Converte para número

  const [liga, setLiga] = useState<any>(null);
  const [tabAtiva, setTabAtiva] = useState("tabela");
  const [podium, setPodium] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Só carrega se o ID for válido
    if (!isNaN(campeonatoId)) {
        carregarDados();
    }
  }, [campeonatoId]);

  async function carregarDados() {
    setLoading(true);
    const { data } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("id", campeonatoId)
      .single();
    setLiga(data);

    // Se estiver finalizado, busca o pódio
    if (data && !data.ativo) {
      const p = await buscarPodium(campeonatoId);
      setPodium(p);
    }

    // Busca times se for copa (para a fase de grupos)
    if (data?.tipo === "copa") {
      await listarTimesDoCampeonato(campeonatoId);
    }

    // Define aba inicial padrão
    if (data) {
      if (data.tipo === "copa") setTabAtiva("grupos");
      else if (data.tipo === "mata-mata" || data.tipo === "mata_mata") setTabAtiva("mata-mata");
      else setTabAtiva("tabela");
    }
    setLoading(false);
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-[#050505]">
        Carregando competição...
      </div>
    );
  if (!liga)
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-[#050505]">
        Campeonato não encontrado.
      </div>
    );

  const isFinalizado = !liga.ativo;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      {/* HEADER SIMPLES */}
      <div className="border-b border-gray-800 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link
            href="/campeonatos"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white mb-4 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={14} /> Voltar para Ligas
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded text-gray-400 border-gray-700`}
                >
                  {liga.tipo.replace("_", " ")}
                </span>
                {isFinalizado && (
                  <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase tracking-wider">
                    Encerrado
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white">
                {liga.nome}
              </h1>
            </div>
            <div className="text-gray-500 font-mono font-bold text-sm">
              Temporada {liga.ano}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* === CARD DE CAMPEÕES (PÓDIO) === */}
        {isFinalizado && podium.length > 0 && (
          <div className="mb-12 bg-gradient-to-br from-[#151515] to-black border border-yellow-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Trophy size={200} />
            </div>

            <div className="flex flex-col items-center justify-center relative z-10">
              <div className="flex items-center gap-2 mb-8 text-yellow-500/80">
                <Trophy size={16} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  Classificação Final
                </span>
              </div>

              <div className="flex flex-wrap justify-center items-end gap-4 md:gap-12">
                {/* 2º Lugar */}
                {podium[1] && (
                  <div className="flex flex-col items-center order-2 md:order-1">
                    <div className="mb-3 relative">
                      <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border-2 border-gray-500 flex items-center justify-center p-3 shadow-lg">
                        <img
                          src={podium[1].escudo}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        2º
                      </div>
                    </div>
                    <span className="text-gray-400 font-bold text-sm max-w-[120px] text-center truncate">
                      {podium[1].nome}
                    </span>
                  </div>
                )}

                {/* 1º Lugar */}
                {podium[0] && (
                  <div className="flex flex-col items-center order-1 md:order-2 mb-6 md:mb-0 scale-110">
                    <Medal
                      className="text-yellow-400 mb-2 animate-bounce"
                      size={24}
                    />
                    <div className="mb-3 relative">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-b from-yellow-500/20 to-black border-4 border-yellow-500 flex items-center justify-center p-4 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                        <img
                          src={podium[0].escudo}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                        Campeão
                      </div>
                    </div>
                    <span className="text-white font-black text-lg max-w-[150px] text-center truncate">
                      {podium[0].nome}
                    </span>
                  </div>
                )}

                {/* 3º Lugar */}
                {podium[2] && (
                  <div className="flex flex-col items-center order-3">
                    <div className="mb-3 relative">
                      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-orange-700 flex items-center justify-center p-3 shadow-lg">
                        <img
                          src={podium[2].escudo}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-800 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        3º
                      </div>
                    </div>
                    <span className="text-gray-500 font-bold text-xs max-w-[100px] text-center truncate">
                      {podium[2].nome}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === NAVEGAÇÃO DE ABAS === */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {liga.tipo === "pontos_corridos" && (
            <button
              onClick={() => setTabAtiva("tabela")}
              className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                tabAtiva === "tabela"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-[#121212] text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              Classificação
            </button>
          )}

          {/* Botão Fase de Grupos */}
          {liga.tipo === "copa" && (
            <button
              onClick={() => setTabAtiva("grupos")}
              className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                tabAtiva === "grupos"
                  ? "bg-yellow-600 text-black shadow-lg"
                  : "bg-[#121212] text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              Fase de Grupos
            </button>
          )}

          {(liga.tipo === "mata-mata" || liga.tipo === "mata_mata" || liga.tipo === "copa") && (
            <button
              onClick={() => setTabAtiva("mata-mata")}
              className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                tabAtiva === "mata-mata"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-[#121212] text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {liga.tipo.includes("mata") ? "Chaveamento" : "Fase Final"}
            </button>
          )}
        </div>

        {/* === CONTEÚDO DAS ABAS === */}
        <div className="animate-fadeIn">
          {tabAtiva === "tabela" && liga.tipo === "pontos_corridos" && (
            <TabelaPublica campeonatoId={campeonatoId} />
          )}

          {tabAtiva === "mata-mata" && (
            <MataMataPublico
              campeonatoId={campeonatoId}
              // CORREÇÃO: Se for copa, corte é 6. Se não (mata-mata puro), é 0.
              rodadasCorte={liga.tipo === "copa" ? 6 : 0}
            />
          )}

          {tabAtiva === "grupos" && (
            <FaseGruposPublica campeonatoId={campeonatoId} />
          )}
        </div>
      </div>
    </div>
  );
}