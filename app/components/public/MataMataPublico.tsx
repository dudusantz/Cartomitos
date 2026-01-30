"use client";

import { useEffect, useState, useRef } from "react";
import { listarPartidas, buscarParciaisAoVivo } from "../../actions";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCcw,
  MoveHorizontal,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  campeonatoId: number;
  rodadasCorte: number;
}

export default function MataMataPublico({
  campeonatoId,
  rodadasCorte,
}: Props) {
  const [partidasRaw, setPartidasRaw] = useState<any[]>([]);
  const [partidasExibidas, setPartidasExibidas] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [modoAoVivo, setModoAoVivo] = useState(false);

  // Zoom e Scroll
  const [escala, setEscala] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // 1. CARREGAMENTO E NORMALIZAÇÃO
  // =========================================================================
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const dados = await listarPartidas(campeonatoId);

        // Filtra apenas jogos do mata-mata (acima do corte)
        const jogosMataMata = dados
          .filter((p: any) => p.rodada > rodadasCorte)
          .map((p: any) => ({
            ...p,
            rodada_bracket: p.rodada - rodadasCorte, // Normaliza para 1, 2, 3...
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

  // =========================================================================
  // 2. LÓGICA AO VIVO (PARCIAIS)
  // =========================================================================
  async function toggleAoVivo() {
    if (!modoAoVivo) {
      setLoadingLive(true);
      try {
        // Pega jogos que não acabaram
        const pendentes = partidasRaw.filter(
          (j) => j.status !== "finalizado" && j.status !== "bye"
        );

        if (pendentes.length === 0) {
          toast.error("Todos os jogos desta fase já foram finalizados.");
          setLoadingLive(false);
          return;
        }

        const { jogos: parciais } = await buscarParciaisAoVivo(pendentes);

        const atualizados = partidasRaw.map((jogo) => {
          const p = parciais?.find((x: any) => x.id === jogo.id);
          if (p && p.is_parcial) {
            return {
              ...jogo,
              placar_casa: p.placar_casa,
              placar_visitante: p.placar_visitante,
              is_parcial: true,
              status: "finalizado", // Simula finalizado para cálculo do agregado
            };
          }
          return jogo;
        });

        setPartidasExibidas(atualizados);
        setModoAoVivo(true);
        toast.success("Modo Ao Vivo ativado!");
      } catch (e) {
        console.error(e);
        toast.error("Erro ao buscar parciais.");
      } finally {
        setLoadingLive(false);
      }
    } else {
      setPartidasExibidas(partidasRaw);
      setModoAoVivo(false);
    }
  }

  // =========================================================================
  // 3. LOGICA DE DESENHO DA CHAVE (BRACKET)
  // =========================================================================
  
  // Identifica as fases (Oitavas, Quartas, Semi...)
  const fases = [...new Set(partidasExibidas.map((p) => p.rodada_bracket))].sort((a, b) => a - b);
  
  // Filtra apenas as fases de IDA (ímpares) ou jogos únicos para desenhar as colunas
  const fasesDesenhaveis = fases.filter((f) => f % 2 !== 0);

  // Helper de Zoom
  const zoomIn = () => setEscala((p) => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setEscala((p) => Math.max(p - 0.1, 0.6));
  const resetZoom = () => setEscala(1);

  if (loading) return <div className="text-center py-24 text-gray-500 animate-pulse">Carregando chaveamento...</div>;

  if (partidasExibidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#121212] rounded-3xl border border-gray-800">
        <Trophy className="text-gray-700 w-12 h-12 mb-4" />
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Mata-mata não definido</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn w-full flex flex-col h-full relative">
      {/* HEADER E CONTROLES */}
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
          {/* Zoom Controls */}
          <div className="flex items-center bg-[#1a1a1a] rounded-lg border border-gray-800 p-1">
            <button onClick={zoomOut} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
            <span className="text-[10px] font-mono w-10 text-center text-gray-500">{Math.round(escala * 100)}%</span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
            <div className="w-px h-4 bg-gray-800 mx-1" />
            <button onClick={resetZoom} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><Maximize size={14} /></button>
          </div>

          {/* Live Button */}
          <button
            onClick={toggleAoVivo}
            disabled={loadingLive}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2
              ${modoAoVivo ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"}
            `}
          >
            {loadingLive && <RefreshCcw className="animate-spin w-3 h-3" />}
            {loadingLive ? "Buscando..." : modoAoVivo ? "Sair do Ao Vivo" : "Ver Parciais"}
          </button>
        </div>
      </div>

      {/* ÁREA DE DESENHO (SCROLL + ZOOM) */}
      <div ref={scrollRef} className={`relative bg-[#121212] border rounded-3xl shadow-2xl overflow-x-auto overflow-y-hidden w-full h-[70vh] custom-scrollbar ${modoAoVivo ? "border-green-500/20" : "border-gray-800"}`}>
        
        <div className="flex items-center justify-center h-full px-12 min-w-max">
          <div className="transition-transform duration-300 origin-center flex gap-12" style={{ transform: `scale(${escala})` }}>
            
            {/* Renderiza as Colunas (Fases) */}
            {fasesDesenhaveis.map((faseId) => {
                const jogosDessaFase = partidasExibidas.filter(p => p.rodada_bracket === faseId).sort((a,b) => a.id - b.id);
                const nomeFase = getNomeFase(jogosDessaFase.length);

                return (
                    <div key={faseId} className="flex flex-col gap-6 w-80">
                        <div className="text-center mb-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                                {nomeFase}
                            </span>
                        </div>
                        <div className="flex flex-col justify-around h-full gap-8">
                            {jogosDessaFase.map(jogoIda => {
                                // Encontra jogo da volta (mesmos times, rodada seguinte)
                                const jogoVolta = partidasExibidas.find(p => 
                                    p.rodada_bracket === faseId + 1 && 
                                    (p.time_casa === jogoIda.time_visitante || p.time_casa === jogoIda.time_casa)
                                );
                                return <CardConfronto key={jogoIda.id} ida={jogoIda} volta={jogoVolta} modoAoVivo={modoAoVivo} />
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Coluna do Campeão (apenas decorativo se houver final) */}
            <div className="flex flex-col justify-center opacity-30">
               <Trophy size={64} className="text-yellow-500" />
            </div>

          </div>
        </div>

        <div className="absolute bottom-4 left-4 pointer-events-none opacity-40 flex items-center gap-2 text-gray-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
          <MoveHorizontal size={14} />
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTES
// =========================================================================

function CardConfronto({ ida, volta, modoAoVivo }: { ida: any, volta?: any, modoAoVivo: boolean }) {
    if (ida.status === 'bye') return null;

    // === MUDANÇA PRINCIPAL AQUI ===
    // Exibe apenas o INTEIRO (Math.trunc)
    // Se for 55.9 -> Mostra 55
    const fmt = (n: number) => n !== undefined && n !== null ? Math.trunc(n) : '-';

    const finalizado = ida.status === 'finalizado' && (!volta || volta.status === 'finalizado');
    const emAndamento = modoAoVivo && (ida.is_parcial || (volta && volta.is_parcial));

    // Placar Ida
    const p1_ida = ida.placar_casa ?? 0;
    const p2_ida = ida.placar_visitante ?? 0;
    
    // Placar Volta (se houver)
    const p1_volta = volta ? (volta.placar_visitante ?? 0) : 0; 
    const p2_volta = volta ? (volta.placar_casa ?? 0) : 0;

    // Agregado com precisão decimal para DECIDIR O VENCEDOR (usando float real)
    // Obs: Backend manda 2 casas decimais, então mantemos a precisão aqui.
    const agg1 = Number((p1_ida + p1_volta).toFixed(2));
    const agg2 = Number((p2_ida + p2_volta).toFixed(2));

    let win1 = false;
    let win2 = false;

    if (finalizado || emAndamento) {
        if (agg1 > agg2) win1 = true;
        else if (agg2 > agg1) win2 = true;
        else {
            // Empate -> Pênaltis
            const jogoDecisivo = volta || ida;
            const pen1 = volta ? jogoDecisivo.desempate_visitante : jogoDecisivo.desempate_casa;
            const pen2 = volta ? jogoDecisivo.desempate_casa : jogoDecisivo.desempate_visitante;
            if (pen1 > pen2) win1 = true;
            if (pen2 > pen1) win2 = true;
        }
    }

    return (
        <div className={`bg-[#151515] border rounded-xl overflow-hidden shadow-lg relative group transition-all ${emAndamento ? 'border-green-500/40 shadow-green-900/20' : 'border-gray-800 hover:border-gray-600'}`}>
            {emAndamento && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-bl-lg animate-pulse"></div>}
            
            {/* Time 1 (Mandante Ida) */}
            <div className={`flex justify-between items-center p-3 ${win1 ? 'bg-green-900/10' : ''}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <img src={ida.casa?.escudo || '/shield-placeholder.png'} className={`w-7 h-7 object-contain ${!win1 && finalizado ? 'opacity-50 grayscale' : ''}`} />
                    <span className={`text-xs font-bold truncate max-w-[120px] ${win1 ? 'text-green-400' : 'text-gray-300'}`}>
                        {ida.casa?.nome}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-gray-500 w-5 text-center">{fmt(p1_ida)}</span>
                    {volta && <span className="text-gray-500 w-5 text-center">{fmt(p1_volta)}</span>}
                    {/* Exibe o agregado TRUNCADO também */}
                    <span className={`w-10 text-center font-black bg-black/20 rounded py-0.5 ${win1 ? 'text-green-400' : 'text-white'}`}>
                        {fmt(agg1)}
                    </span>
                </div>
            </div>

            <div className="h-px bg-gray-800 w-full"></div>

            {/* Time 2 (Visitante Ida) */}
            <div className={`flex justify-between items-center p-3 ${win2 ? 'bg-green-900/10' : ''}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <img src={ida.visitante?.escudo || '/shield-placeholder.png'} className={`w-7 h-7 object-contain ${!win2 && finalizado ? 'opacity-50 grayscale' : ''}`} />
                    <span className={`text-xs font-bold truncate max-w-[120px] ${win2 ? 'text-green-400' : 'text-gray-300'}`}>
                        {ida.visitante?.nome || 'A definir'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-gray-500 w-5 text-center">{fmt(p2_ida)}</span>
                    {volta && <span className="text-gray-500 w-5 text-center">{fmt(p2_volta)}</span>}
                    {/* Exibe o agregado TRUNCADO também */}
                    <span className={`w-10 text-center font-black bg-black/20 rounded py-0.5 ${win2 ? 'text-green-400' : 'text-white'}`}>
                        {fmt(agg2)}
                    </span>
                </div>
            </div>
        </div>
    )
}

function getNomeFase(qtdJogos: number) {
    if (qtdJogos === 1) return "Final";
    if (qtdJogos === 2) return "Semifinais";
    if (qtdJogos === 4) return "Quartas";
    if (qtdJogos === 8) return "Oitavas";
    return "Eliminatórias";
}