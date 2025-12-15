"use client";

import { useEffect, useState, useRef } from "react";
import { listarPartidas, buscarParciaisAoVivo } from "../../actions";
import MataMataBracket from "../MataMataBracket";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCcw,
  MoveHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  campeonatoId: number;
  rodadasCorte?: number;
}

export default function MataMataPublico({
  campeonatoId,
  rodadasCorte,
}: Props) {
  const [listaJogosRaw, setListaJogosRaw] = useState<any[]>([]);
  const [partidasExibidas, setPartidasExibidas] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [modoAoVivo, setModoAoVivo] = useState(false);

  // Zoom
  const [escala, setEscala] = useState(1.05);

  // Scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // 1. LOAD + NORMALIZAÇÃO
  // =========================================================================
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const dados = await listarPartidas(campeonatoId);

        console.log(
          "TODAS RODADAS:",
          dados.map((d: any) => d.rodada)
        );
        console.log("CORTE (rodadasCorte):", rodadasCorte);

        const temCorte = typeof rodadasCorte === "number";
        const corteUsado = temCorte ? Number(rodadasCorte) : 0;

        const rawMataMata = temCorte
          ? dados.filter((p: any) => Number(p.rodada) > corteUsado)
          : dados;

        setListaJogosRaw(rawMataMata);

        const normalizados = normalizarRodadas(rawMataMata);
        setPartidasExibidas(normalizados);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar mata-mata.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [campeonatoId, rodadasCorte]);

  // Remove buracos e força começar do 1
  function normalizarRodadas(jogos: any[]) {
    if (!jogos || jogos.length === 0) return [];

    const rodadaInicial = Math.min(...jogos.map((j) => Number(j.rodada)));

    return jogos.map((j) => ({
      ...j,
      rodada: Number(j.rodada) - rodadaInicial + 1,
    }));
  }

  // =========================================================================
  // 2. AO VIVO
  // =========================================================================
  async function toggleAoVivo() {
    if (!modoAoVivo) {
      setLoadingLive(true);
      try {
        const jogosPendentes = listaJogosRaw.filter(
          (j) => j.status !== "finalizado" && j.status !== "bye"
        );

        if (jogosPendentes.length === 0) {
          toast.error("Todos os jogos já foram finalizados.");
          return;
        }

        const rodadaAtual = Math.min(
          ...jogosPendentes.map((j) => Number(j.rodada))
        );

        const jogosDaRodada = jogosPendentes.filter(
          (j) => Number(j.rodada) === rodadaAtual
        );

        const { jogos: parciais } = await buscarParciaisAoVivo(jogosDaRodada);

        const listaComParciais = listaJogosRaw.map((jogo) => {
          const parcial = parciais?.find((p: any) => p.id === jogo.id);

          if (
            parcial &&
            parcial.is_parcial &&
            Number(jogo.rodada) === rodadaAtual
          ) {
            return {
              ...jogo,
              placar_casa: parcial.placar_casa,
              placar_visitante: parcial.placar_visitante,
              is_parcial: true,
              status: "finalizado",
            };
          }

          return jogo;
        });

        setPartidasExibidas(normalizarRodadas(listaComParciais));
        setModoAoVivo(true);

        toast.success(`Parciais da rodada ${rodadaAtual} ativas!`);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao buscar parciais.");
      } finally {
        setLoadingLive(false);
      }
    } else {
      setPartidasExibidas(normalizarRodadas(listaJogosRaw));
      setModoAoVivo(false);
    }
  }

  // =========================================================================
  // 3. ZOOM
  // =========================================================================
  const zoomIn = () => setEscala((p) => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setEscala((p) => Math.max(p - 0.1, 0.6));
  const resetZoom = () => setEscala(1.05);

  // =========================================================================
  // UI STATES
  // =========================================================================
  if (loading) {
    return (
      <div className="text-center py-24 text-gray-500 animate-pulse">
        Carregando chaves...
      </div>
    );
  }

  if (partidasExibidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#121212] rounded-3xl border border-gray-800">
        <span className="text-5xl mb-4 opacity-20">⚔️</span>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
          Mata-mata não definido
        </p>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="animate-fadeIn w-full flex flex-col h-full relative">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />

      {/* HEADER */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-end gap-4 px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <span className="text-yellow-500">⚡</span> Fase Eliminatória
          </h2>

          {modoAoVivo && (
            <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">
              Ao vivo
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* ZOOM */}
          <div className="flex items-center bg-[#1a1a1a] rounded-lg border border-gray-800 p-1">
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <ZoomOut size={14} />
            </button>

            <span className="text-[10px] font-mono w-10 text-center text-gray-500">
              {Math.round(escala * 100)}%
            </span>

            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <ZoomIn size={14} />
            </button>

            <div className="w-px h-4 bg-gray-800 mx-1" />

            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <Maximize size={14} />
            </button>
          </div>

          {/* AO VIVO */}
          <button
            onClick={toggleAoVivo}
            disabled={loadingLive}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2
              ${
                modoAoVivo
                  ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20"
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"
              }
            `}
          >
            {loadingLive && (
              <RefreshCcw className="animate-spin w-3 h-3" />
            )}
            {loadingLive
              ? "Buscando..."
              : modoAoVivo
              ? "Sair do Ao Vivo"
              : "Ver Parciais Ao Vivo"}
          </button>
        </div>
      </div>

      {/* BRACKET */}
      <div
        ref={scrollRef}
        className={`
          relative bg-[#121212] border rounded-3xl shadow-2xl
          overflow-x-auto overflow-y-hidden
          w-full h-[70vh]
          hide-scrollbar
          ${modoAoVivo ? "border-green-500/20" : "border-gray-800"}
        `}
      >
        {/* Hint UX */}
        <div className="absolute top-4 right-4 opacity-50 text-[10px] uppercase tracking-widest text-gray-400">
          Role horizontalmente →
        </div>

        <div className="flex items-center justify-center h-full px-24 min-w-max">
          <div
            className="transition-transform duration-300 origin-left"
            style={{ transform: `scale(${escala})` }}
          >
            <MataMataBracket partidas={partidasExibidas} />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 pointer-events-none opacity-40 flex items-center gap-2 text-gray-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
          <MoveHorizontal size={14} />
          <span className="text-[10px] uppercase tracking-widest">
            Scroll horizontal
          </span>
        </div>
      </div>
    </div>
  );
}
