"use client";

import { useEffect, useState } from "react";
import { listarPartidas, buscarParciaisAoVivo } from "../../actions";
import { RefreshCcw, Trophy, Move, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import ModalConfrontoAoVivo from "./ModalConfrontoAoVivo";
import MataMataBracket, { type JogoBracket } from "../MataMataBracket";
import CompartilharCampeonato from "./CompartilharCampeonato";

interface Props {
  campeonatoId: number;
  campeonatoNome: string;
  campeonatoAno?: number | string;
  rodadasCorte: number;
  usarDecimais?: boolean;
}

function normalizarPlacar(valor: number, usarDecimais: boolean) {
  if (usarDecimais) return Number(Number(valor).toFixed(2));
  return Math.floor(Number(valor) || 0);
}

export default function MataMataPublico({
  campeonatoId,
  campeonatoNome,
  campeonatoAno,
  rodadasCorte,
  usarDecimais = false,
}: Props) {
  const [partidasRaw, setPartidasRaw] = useState<JogoBracket[]>([]);
  const [partidasExibidas, setPartidasExibidas] = useState<JogoBracket[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [modoAoVivo, setModoAoVivo] = useState(false);
  const [partidasParciais, setPartidasParciais] = useState<JogoBracket[] | null>(null);
  const [compartilharAberto, setCompartilharAberto] = useState(false);

  const [jogoSelecionado, setJogoSelecionado] = useState<JogoBracket | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const dados = await listarPartidas(campeonatoId);

        const jogosMataMata: JogoBracket[] = dados
          .filter((p: any) => p.rodada > rodadasCorte)
          .map((p: any) => ({
            ...p,
            rodada_cartola: p.rodada_cartola,
            rodada_real: p.rodada,
            rodada: p.rodada - rodadasCorte,
          }));

        setPartidasRaw(jogosMataMata);
        setPartidasExibidas(jogosMataMata);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar chaveamento.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campeonatoId, rodadasCorte]);

  async function carregarParciais(aplicarNaTela = true): Promise<JogoBracket[] | null> {
    setLoadingLive(true);
    try {
      const todosPendentes = partidasRaw.filter(
        (j) => j.status !== "finalizado" && j.status !== "bye"
      );
      const rodadaPendenteAtual = todosPendentes.length > 0
        ? Math.min(...todosPendentes.map((j) => j.rodada))
        : null;
      const pendentes = todosPendentes
        .filter((j) => j.rodada === rodadaPendenteAtual)
        .map((j) => ({ ...j, rodada: j.rodada_cartola }));

      if (pendentes.length === 0) {
        toast.error("Todos os jogos desta fase já foram finalizados.");
        return null;
      }

      const resposta = await buscarParciaisAoVivo(pendentes);
      if (!resposta.success) {
        toast.error(resposta.msg || "Não foi possível carregar as parciais.");
        return null;
      }

      const atualizados = partidasRaw.map((jogo) => {
        const parcial = resposta.jogos?.find((item: any) => item.id === jogo.id);
        if (!parcial?.is_parcial) return jogo;
        return {
          ...jogo,
          placar_casa: normalizarPlacar(parcial.placar_casa, usarDecimais),
          placar_visitante: normalizarPlacar(parcial.placar_visitante, usarDecimais),
          is_parcial: true,
          is_live: true,
          status: "finalizado",
        };
      });

      setPartidasParciais(atualizados);
      if (aplicarNaTela) setPartidasExibidas(atualizados);
      return atualizados;
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar parciais.");
      return null;
    } finally {
      setLoadingLive(false);
    }
  }

  async function toggleAoVivo() {
    if (modoAoVivo) {
      setPartidasExibidas(partidasRaw);
      setModoAoVivo(false);
      return;
    }
    const atualizados = await carregarParciais(true);
    if (atualizados) {
      setModoAoVivo(true);
      toast.success("Modo ao vivo ativado.");
    }
  }

  const rodadaParcial = partidasRaw
    .filter((jogo) => jogo.status !== "finalizado" && jogo.status !== "bye" && jogo.rodada_cartola)
    .sort((a, b) => Number(a.rodada) - Number(b.rodada))[0]?.rodada_cartola;

  if (loading) {
    return (
      <div className="text-center py-24 text-gray-500 animate-pulse">
        Carregando chaveamento...
      </div>
    );
  }

  if (partidasExibidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mx-6 bg-[#121212] rounded-3xl border border-gray-800">
        <Trophy className="text-gray-700 w-12 h-12 mb-4" />
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
          Mata-mata não definido
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn w-full flex flex-col h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-7.5rem)] bg-[#0a0a0a]">
      <div className="shrink-0 flex flex-row justify-between items-center gap-3 px-4 md:px-6 py-3.5 border-b border-white/[0.07] bg-[#10120f]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-500">Chaveamento</span>
            <h2 className="text-sm md:text-lg font-black text-white tracking-[-0.02em]">Fase eliminatória</h2>
          </div>
          {modoAoVivo && (
            <span className="text-[9px] bg-green-900/30 text-green-500 border border-green-500/30 px-2 py-0.5 rounded animate-pulse font-bold uppercase">
              Ao vivo
            </span>
          )}
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] text-gray-500 tracking-wide">
            <Move size={12} /> Arraste para navegar
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCompartilharAberto(true)} className="flex items-center gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] text-yellow-400 transition hover:border-yellow-400/40 hover:bg-yellow-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"><Share2 size={13} /><span className="hidden sm:inline">Compartilhar</span></button>
          <button
            onClick={toggleAoVivo}
            disabled={loadingLive}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${modoAoVivo ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" : "bg-yellow-500 text-black hover:bg-yellow-400 border border-yellow-400"}`}
          >
            {loadingLive && <RefreshCcw className="animate-spin w-3 h-3" />}
            {loadingLive ? "Buscando..." : modoAoVivo ? "Sair do Ao Vivo" : "Ver Parciais"}
          </button>
        </div>
      </div>

      <MataMataBracket
        partidas={partidasExibidas}
        modoAoVivo={modoAoVivo}
        usarDecimais={usarDecimais}
        onSelectJogo={(jogo) => setJogoSelecionado(jogo)}
        className="flex-1 min-h-0 rounded-none border-0"
      />

      {jogoSelecionado && (
        <ModalConfrontoAoVivo
          jogo={jogoSelecionado}
          onClose={() => setJogoSelecionado(null)}
        />
      )}
      <CompartilharCampeonato
        aberto={compartilharAberto}
        onClose={() => setCompartilharAberto(false)}
        tipo="mata_mata"
        campeonato={campeonatoNome}
        ano={campeonatoAno}
        dadosOficiais={partidasRaw}
        dadosParciais={partidasParciais}
        rodadaParcial={rodadaParcial}
        usarDecimais={usarDecimais}
        onCarregarParciais={() => carregarParciais(false)}
      />
    </div>
  );
}
