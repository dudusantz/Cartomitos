"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw, ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { buscarDetalhesConfrontoAoVivo } from "@/app/actions";
import toast from "react-hot-toast";

interface Props {
  jogo: any;
  onClose: () => void;
}

export default function ModalConfrontoAoVivo({ jogo, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');

  useEffect(() => {
    carregarDetalhes();
  }, [jogo]);

  async function carregarDetalhes() {
    setLoading(true);
    const idCasa = Array.isArray(jogo.casa) ? jogo.casa[0]?.time_id_cartola : jogo.casa?.time_id_cartola;
    const idVis = Array.isArray(jogo.visitante) ? jogo.visitante[0]?.time_id_cartola : jogo.visitante?.time_id_cartola;
    
    const rodadaCartola = jogo.rodada_cartola ?? jogo.rodada;

    if (idCasa && idVis) {
      const res = await buscarDetalhesConfrontoAoVivo(idCasa, idVis, rodadaCartola);
      if (res.success) setDados(res);
      else {
        setDados(null);
        toast.error(res.msg || "Não foi possível carregar os dados deste confronto.");
      }
    }
    setLoading(false);
  }

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();
  const finalizado = jogo.status === 'finalizado';
  const rodadaExibida = jogo.rodada_cartola ?? jogo.rodada;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-0 backdrop-blur-lg md:p-5" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-[1180px] animate-fadeIn flex-col overflow-hidden rounded-none border-0 bg-[#090a09] shadow-[0_35px_120px_rgba(0,0,0,0.75)] md:h-[92vh] md:rounded-3xl md:border md:border-white/[0.1]" onClick={handleContentClick}>
        
        <header className="z-[110] flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#131513] px-4 py-3.5 md:px-6">
          <div>
            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] ${finalizado ? 'text-yellow-400' : 'text-green-400'}`}><span className={`h-2 w-2 rounded-full ${finalizado ? 'bg-yellow-400' : 'animate-pulse bg-green-400'}`} /> {finalizado ? 'Confronto encerrado' : 'Parcial em andamento'}</div>
            <h2 className="mt-0.5 text-sm font-black tracking-[-0.015em] text-white md:text-base">Central do confronto <span className="font-medium text-gray-600">· Rodada {rodadaExibida}</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {/* BOTÃO TOGGLE CAMPINHO/LISTA */}
            <button 
                onClick={() => setViewMode(prev => prev === 'pitch' ? 'list' : 'pitch')} 
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-300 transition hover:bg-white/[0.07] hover:text-white md:px-3"
            >
                {viewMode === 'pitch' ? <List size={14} /> : <LayoutGrid size={14} />}
                <span className="hidden sm:inline">{viewMode === 'pitch' ? 'Ver Lista' : 'Ver Campo'}</span>
            </button>
            
            <button onClick={carregarDetalhes} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#090a09] px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 transition hover:text-white md:px-3">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Atualizar</span>
            </button>
            
            <button onClick={onClose} aria-label="Fechar confronto" className="rounded-lg border border-white/[0.08] bg-[#090a09] p-1.5 text-gray-500 transition hover:border-red-500/30 hover:text-red-400">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.035),transparent_34%)] p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
              <RefreshCw size={28} className="animate-spin text-yellow-500" />
              <p className="font-bold text-[10px] uppercase tracking-widest text-center">Processando dados oficiais...</p>
            </div>
          ) : dados ? (
            <div className="mx-auto max-w-[1080px] pb-8">
              <MatchScoreHero casa={dados.casa} visitante={dados.visitante} finalizado={finalizado} />
              <div className={`mt-5 grid lg:grid-cols-2 lg:gap-6 ${viewMode === 'list' ? 'grid-cols-2 gap-2.5' : 'grid-cols-1 gap-8'}`}>
                <TeamColumn team={dados.casa} isCasa={true} viewMode={viewMode} />
                <TeamColumn team={dados.visitante} isCasa={false} viewMode={viewMode} />
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 font-bold uppercase text-xs tracking-widest">Erro ao carregar dados da rodada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchScoreHero({ casa, visitante, finalizado }: { casa: any, visitante: any, finalizado: boolean }) {
  const scoreCasa = Math.trunc(casa.pontos || 0);
  const scoreVisitante = Math.trunc(visitante.pontos || 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121412]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 md:gap-8 md:px-8 md:py-5">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <img src={casa.escudo} className="h-11 w-11 shrink-0 object-contain md:h-14 md:w-14" alt={`Escudo ${casa.nome}`} />
          <div className="min-w-0"><span className="text-[8px] font-bold uppercase tracking-[0.12em] text-gray-600">Mandante</span><h3 className="truncate text-xs font-black text-white md:text-base">{casa.nome}</h3></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#080908] px-3 py-2 font-mono text-2xl font-black tabular-nums text-white md:gap-3 md:px-5 md:text-3xl">
          <span>{scoreCasa}</span><span className="text-sm text-gray-700">×</span><span>{scoreVisitante}</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3 text-right md:gap-4">
          <div className="min-w-0"><span className="text-[8px] font-bold uppercase tracking-[0.12em] text-gray-600">Visitante</span><h3 className="truncate text-xs font-black text-white md:text-base">{visitante.nome}</h3></div>
          <img src={visitante.escudo} className="h-11 w-11 shrink-0 object-contain md:h-14 md:w-14" alt={`Escudo ${visitante.nome}`} />
        </div>
      </div>
      <div className={`flex items-center justify-center gap-2 border-t border-white/[0.06] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.12em] ${finalizado ? 'text-yellow-400' : 'text-green-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${finalizado ? 'bg-yellow-400' : 'animate-pulse bg-green-400'}`} /> {finalizado ? 'Pontuação final da rodada' : 'Pontuação parcial da rodada'}</div>
    </section>
  );
}

function LuxoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4 C14 10 18 13 22 14 M22 14 L18 17 M22 14 L18 10" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20 C10 14 6 11 2 10 M2 10 L6 7 M2 10 L6 13" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconEntrou({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-green-500 rounded-full border-[1.5px] border-black shadow-[0_0_8px_rgba(34,197,94,0.6)] ${className}`}>
      <ChevronUp size={14} className="text-black" strokeWidth={4} />
    </div>
  );
}

function IconSaiu({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-red-600 rounded-full border-[1.5px] border-black shadow-[0_0_5px_rgba(220,38,38,0.6)] ${className}`}>
      <ChevronDown size={14} className="text-white" strokeWidth={4} />
    </div>
  );
}

function TeamColumn({ team, isCasa, viewMode }: { team: any, isCasa: boolean, viewMode: 'pitch' | 'list' }) {
    
    const currentPitchPlayers = team.titulares.map((t: any) => {
        const tId = String(t.id || t.atleta_id);
        const isLuxo = t.isLuxo || t.luxo;

        if (t.substituidoPor) {
            return {
                ...t.substituidoPor,
                isSubIn: true,
                posicao_id: t.substituidoPor.posicao_id || t.posicao_id,
            };
        }
        
        let isHistoricalSubIn = false;
        if (team.substituicoes && Array.isArray(team.substituicoes)) {
            const subEvent = team.substituicoes.find((sub: any) => 
                String(sub.entrou?.atleta_id || sub.entrou?.id || sub.entrou) === tId
            );
            if (subEvent && subEvent.saiu) {
                isHistoricalSubIn = true;
            }
        }

        const cameFromBench = team.reservas?.some((r: any) => String(r.id || r.atleta_id) === tId);
        const hasEntered = t.isSubIn || t.entrou || t.usado || isLuxo || cameFromBench || isHistoricalSubIn;

        if (hasEntered) {
            return { ...t, isSubIn: true };
        }

        return t; 
    }); 

    const inFieldIds: string[] = currentPitchPlayers.map((p:any) => String(p.id || p.atleta_id));

    let activeBenchPlayers = team.reservas ? [...team.reservas] : [];

    team.titulares.forEach((t: any) => {
        if (t.substituidoPor) {
            activeBenchPlayers.push({ ...t, isSubOut: true, substituidoPor: undefined });
        }
    });

    if (team.substituicoes && Array.isArray(team.substituicoes)) {
        team.substituicoes.forEach((sub: any) => {
            const saiu = sub.saiu;
            if (saiu && typeof saiu === 'object') {
                const idSaiu = String(saiu.atleta_id || saiu.id);
                const bancoIndex = activeBenchPlayers.findIndex(r => String(r.id || r.atleta_id) === idSaiu);
                
                if (bancoIndex >= 0) {
                    activeBenchPlayers[bancoIndex].isSubOut = true;
                } else {
                    const ptsSaiu = saiu.pontuacao !== undefined ? parseFloat(saiu.pontuacao) : (saiu.pontos_num || 0);
                    activeBenchPlayers.push({
                        id: idSaiu,
                        nome: saiu.apelido || saiu.nome,
                        foto: saiu.foto ? saiu.foto.replace('FORMATO', '140x140') : '/user-placeholder.png',
                        posicao_id: saiu.posicao_id || 1,
                        posicao: "SAIU",
                        pontosCalculados: ptsSaiu,
                        pontos: ptsSaiu,
                        isSubOut: true,
                        jogou: ptsSaiu !== 0 
                    });
                }
            }
        });
    }

    activeBenchPlayers = activeBenchPlayers.filter((r: any) => {
        const rId = String(r.id || r.atleta_id);
        if (r.isSubOut) return true; 
        if (inFieldIds.includes(rId)) return false; 
        return true; 
    });

    const ordemPosicao: Record<number, number> = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    activeBenchPlayers.sort((a: any, b: any) => {
        const pesoA = ordemPosicao[a.posicao_id] || 99;
        const pesoB = ordemPosicao[b.posicao_id] || 99;
        return pesoA - pesoB;
    });

    return (
        <section className={`mx-auto flex h-auto w-full max-w-[520px] flex-col rounded-2xl border border-white/[0.07] bg-[#0e100e] md:gap-5 md:p-4 ${viewMode === 'list' ? 'gap-2 p-2' : 'gap-4 p-3'}`}>
            <div className={`flex px-1 ${viewMode === 'list' ? 'flex-col gap-0.5' : 'items-center justify-between'}`}>
              <span className="text-[8px] font-bold uppercase tracking-[0.11em] text-gray-500 md:text-[9px]">{isCasa ? 'Mandante' : 'Visitante'}</span>
              <span className="text-[8px] font-medium text-gray-700">11 titulares</span>
            </div>
            
            {/* RENDER CONDICIONAL: CAMPINHO VS LISTA */}
            {viewMode === 'pitch' ? (
                <HalfField fieldPlayers={currentPitchPlayers} />
            ) : (
                <FieldList fieldPlayers={currentPitchPlayers} isCasa={isCasa} />
            )}

            <BenchList benchPlayers={activeBenchPlayers} isCasa={isCasa} />
        </section>
    );
}

function HalfField({ fieldPlayers }: { fieldPlayers: any[] }) {
  const playersByPos: Record<number, any[]> = {};
  fieldPlayers.forEach(p => {
    if (!playersByPos[p.posicao_id]) playersByPos[p.posicao_id] = [];
    playersByPos[p.posicao_id].push(p);
  });

  return (
    <div className="relative w-full aspect-[4/5] min-h-[400px] overflow-hidden rounded-xl border-[4px] border-[#191c19] bg-gradient-to-b from-[#087036] to-[#034521] shadow-[0_18px_45px_rgba(0,0,0,0.3)] shrink-0 animate-fadeIn md:min-h-[430px]">
        <div className="absolute inset-0 border-[2px] md:border-[3px] border-white/20 m-3 rounded pointer-events-none z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-[2px] md:h-[3px] bg-white/20 pointer-events-none z-0"></div>
        <div className="absolute top-0 left-1/2 w-28 h-14 md:w-36 md:h-18 border-[2px] md:border-[3px] border-white/20 rounded-b-full -translate-x-1/2 pointer-events-none z-0"></div>
        
        <div className="absolute bottom-3 left-1/2 w-44 h-22 md:w-52 md:h-26 border-[2px] md:border-[3px] border-white/20 -translate-x-1/2 pointer-events-none z-0"></div>
        <div className="absolute bottom-3 left-1/2 w-18 h-8 md:w-22 md:h-10 border-[2px] md:border-[3px] border-white/20 -translate-x-1/2 pointer-events-none z-0"></div>

        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {fieldPlayers.map((atleta) => {
            const indexNaPos = playersByPos[atleta.posicao_id]?.indexOf(atleta) || 0;
            const totalNaPos = playersByPos[atleta.posicao_id]?.length || 1;
            const coords = getCoordinatesByPosition(atleta.posicao_id, indexNaPos, totalNaPos);
            
            return (
              <PlayerPin 
                  key={atleta.id} 
                  atleta={atleta} 
                  style={coords} 
                  isDNP={!atleta.jogou} 
              />
            );
        })}
        </div>
    </div>
  );
}

function getCoordinatesByPosition(posicaoId: number, indexNaPosicao: number, totalNaPosicao: number) {
    let y = 50; let x = 50;
    switch (posicaoId) {
      case 1: y = 88; x = 50; break;
      case 2: y = 65; x = indexNaPosicao === 0 ? 12 : 88; break;
      case 3: y = 65; if (totalNaPosicao === 2) x = indexNaPosicao === 0 ? 35 : 65; else x = [25, 50, 75][indexNaPosicao]; break;
      case 4: y = 38; if (totalNaPosicao === 3) x = [25, 50, 75][indexNaPosicao]; else if (totalNaPosicao === 4) x = [18, 38, 62, 82][indexNaPosicao]; else x = [10, 30, 50, 70, 90][indexNaPosicao]; break;
      case 5: y = 15; if (totalNaPosicao === 1) x = 50; else if (totalNaPosicao === 2) x = [30, 70][indexNaPosicao]; else x = [15, 50, 85][indexNaPosicao]; break;
      case 6: y = 88; x = 85; break; 
    }
    return { top: `${y}%`, left: `${x}%` };
}

function PlayerPin({ atleta, style, isDNP }: { atleta: any, style: React.CSSProperties, isDNP: boolean }) {

  const pts = atleta.pontosCalculados ?? atleta.pontos;
  const basePts = atleta.pontos; 
  
  let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
  let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

  if (isDNP && !atleta.isSubIn) {
      colorClass = 'text-gray-500';
      baseColorClass = 'text-gray-500';
  }

  const borderColor = atleta.isSubIn ? 'border-green-500' :
                       atleta.isCapitao ? 'border-yellow-500' :
                       atleta.isLuxo ? 'border-orange-500' :
                       'border-[#151515] group-hover:border-gray-400';

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-[60px] md:w-[70px] pointer-events-auto group hover:z-30 z-10" style={style}>
      <div className="relative shrink-0">
        <img 
            src={atleta.foto} 
            className={`w-9 h-9 md:w-12 md:h-12 rounded-full border-[2px] md:border-[2.5px] bg-black object-cover shadow-[0_5px_15px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform ${borderColor}`} 
        />
        
        {atleta.isSubIn && (
            <IconEntrou className="absolute -top-1 -left-1 md:-top-1.5 md:-left-1.5 w-4 h-4 md:w-5 md:h-5 z-20" />
        )}
        
        {atleta.isCapitao && (
          <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 bg-yellow-500 w-4 h-4 md:w-5.5 md:h-5.5 rounded-full border border-black flex items-center justify-center z-10 shadow-[0_0_10px_rgba(234,179,8,0.6)]">
            <span className="text-black font-black text-[10px] md:text-[13px] leading-none">C</span>
          </div>
        )}
        
        {atleta.isLuxo && (
          <div className="absolute -bottom-1 -right-1 md:-bottom-1.5 md:-right-1.5 bg-black rounded-full border border-black flex items-center justify-center z-10 shadow-[0_0_10px_rgba(249,115,22,0.6)]">
            <LuxoIcon className="w-3 h-3 md:w-4 md:h-4" />
          </div>
        )}
      </div>
      
      <div className="bg-black/90 backdrop-blur-sm px-1 py-1 md:px-1.5 md:py-1.5 rounded border border-white/10 text-center w-[125%] shadow-lg transition-colors group-hover:bg-[#1a1a1a] group-hover:border-gray-400 flex flex-col items-center justify-center">
        
        <div className="flex items-center justify-center gap-0.5 w-full mb-0.5">
            {atleta.isCapitao && <span className="text-yellow-400 font-black text-[7px] md:text-[9px] shrink-0 leading-none">C</span>}
            {atleta.isLuxo && <LuxoIcon className="w-2 h-2 md:w-2.5 md:h-2.5 shrink-0" />}
            <span className="text-[6px] md:text-[8px] font-black text-gray-200 uppercase truncate tracking-wide">{atleta.nome}</span>
        </div>
        
        <div className="flex items-center justify-center w-full whitespace-nowrap mt-[1px]">
            {isDNP && !atleta.isSubIn ? (
                <span className="text-gray-500 font-black font-mono text-[9px] md:text-[12px] leading-none">-</span>
            ) : atleta.isCapitao ? (
                <div className="flex flex-col items-center justify-center">
                    <span className={`${colorClass} font-black font-mono text-[9px] md:text-[11px] leading-none mt-[1px]`}>
                        {pts.toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center gap-[2px] mt-[2px] md:mt-[3px] opacity-95">
                        <span className={`${baseColorClass} font-mono font-bold text-[6px] md:text-[8px] leading-none`}>{basePts.toFixed(1)}</span>
                        <span className="text-yellow-500 font-black text-[6px] md:text-[8px] leading-none">x1.5</span>
                    </div>
                </div>
            ) : (
                <span className={`${colorClass} font-black font-mono text-[8px] md:text-[11px] leading-none mt-[1px]`}>
                    {pts.toFixed(1)}
                </span>
            )}
        </div>
      </div>
    </div>
  );
}

// NOVA LISTA TÁTICA COMO ALTERNATIVA AO CAMPINHO
function FieldList({ fieldPlayers, isCasa }: { fieldPlayers: any[], isCasa: boolean }) {
    if (!fieldPlayers || fieldPlayers.length === 0) return null;
    const borderColor = isCasa ? 'border-blue-900/30' : 'border-red-900/30';
    const bgContainer = isCasa ? 'bg-blue-950/5' : 'bg-red-950/5';

    const ordemPosicao: Record<number, number> = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    const sortedPlayers = [...fieldPlayers].sort((a: any, b: any) => {
        const pesoA = ordemPosicao[a.posicao_id] || 99;
        const pesoB = ordemPosicao[b.posicao_id] || 99;
        return pesoA - pesoB;
    });

    return (
        <div className={`border ${borderColor} ${bgContainer} h-auto w-full animate-fadeIn rounded-xl p-1.5 shadow-lg md:rounded-2xl md:p-4`}>
            <div className="mb-2.5 flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.08em] text-gray-500 md:mb-3.5 md:gap-2 md:text-[10px] md:tracking-widest">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span>Titulares / Entraram</span>
                <div className="flex-1 h-px bg-gray-800"></div>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
                {sortedPlayers.map((atleta: any, idx: number) => (
                    <FieldPlayerCard key={`${atleta.id}-${idx}`} atleta={atleta} />
                ))}
            </div>
        </div>
    );
}

function FieldPlayerCard({ atleta }: { atleta: any }) {
    const pts = atleta.pontosCalculados ?? atleta.pontos;
    const basePts = atleta.pontos; 
    const isDNP = !atleta.jogou;

    let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
    let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

    if (isDNP && !atleta.isSubIn) {
        colorClass = 'text-gray-500';
        baseColorClass = 'text-gray-500';
    }

    return (
        <div className="flex items-center justify-between gap-1 rounded-lg border border-gray-800 bg-[#151515] p-1.5 transition-colors hover:bg-[#1a1a1a] md:gap-2 md:rounded-xl md:p-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden md:gap-3.5">
                <div className="relative shrink-0">
                    <img 
                        src={atleta.foto} 
                        className={`h-7 w-7 rounded-full border bg-black object-cover shadow-inner md:h-9 md:w-9 ${atleta.isSubIn ? 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : atleta.isCapitao ? 'border-yellow-500' : atleta.isLuxo ? 'border-orange-500' : 'border-gray-700'}`}
                        alt="" 
                    />
                    
                    {atleta.isSubIn && (
                        <IconEntrou className="absolute -top-1 -left-1 w-4 h-4 z-10" />
                    )}
                    
                    {!atleta.isSubIn && atleta.isLuxo && (
                      <div className="absolute -bottom-1 -right-1.5 w-4 h-4 bg-black rounded-full border border-black z-10 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                        <LuxoIcon className="w-2.5 h-2.5" />
                      </div>
                    )}
                </div>

                <div className="flex flex-col truncate flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-[7px] font-black uppercase leading-tight text-gray-200 md:text-[10px]">{atleta.nome}</span>
                        {atleta.isCapitao && <span className="text-[7px] font-black text-yellow-400 bg-yellow-950 px-1 py-0.5 rounded border border-yellow-500/30">C</span>}
                        {atleta.isLuxo && <span className="text-[7px] font-black text-orange-400 bg-orange-950/40 px-1 py-0.5 rounded border border-orange-500/30">LUXO</span>}
                    </div>
                    <span className="mt-0.5 truncate text-[6px] uppercase leading-none text-gray-500 md:mt-1 md:text-[8px]">
                        {atleta.posicao} {atleta.isSubIn && <span className="text-green-500 font-bold ml-1">ENTROU</span>}
                    </span>
                </div>
            </div>
            
            <div className="ml-0.5 flex shrink-0 flex-col items-end justify-center rounded-md border border-gray-800 bg-black/40 px-1.5 py-1 md:ml-1 md:rounded-lg md:px-2.5">
                {isDNP && !atleta.isSubIn ? (
                    <span className="text-[11px] md:text-xs font-black font-mono text-gray-500">-</span>
                ) : atleta.isCapitao ? (
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} text-[11px] md:text-[12px] font-black font-mono leading-none mt-[1px]`}>{pts.toFixed(1)}</span>
                        <div className="flex items-center gap-[2px] mt-[3px] opacity-95">
                            <span className={`${baseColorClass} font-mono font-bold text-[8px] md:text-[9px] leading-none`}>{basePts.toFixed(1)}</span>
                            <span className="text-yellow-500 font-black text-[8px] md:text-[9px] leading-none">x1.5</span>
                        </div>
                    </div>
                ) : (
                    <span className={`${colorClass} text-[11px] md:text-xs font-black font-mono leading-none`}>{pts.toFixed(1)}</span>
                )}
            </div>
        </div>
    );
}

function BenchList({ benchPlayers, isCasa }: { benchPlayers: any[], isCasa: boolean }) {
    if (!benchPlayers || benchPlayers.length === 0) return null;
    const borderColor = isCasa ? 'border-blue-900/30' : 'border-red-900/30';
    const bgContainer = isCasa ? 'bg-blue-950/5' : 'bg-red-950/5';

    return (
        <div className={`border ${borderColor} ${bgContainer} h-auto w-full rounded-xl p-1.5 shadow-lg md:rounded-2xl md:p-4`}>
            <div className="mb-2.5 flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.08em] text-gray-500 md:mb-3.5 md:gap-2 md:text-[10px] md:tracking-widest">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span>Banco / Substituídos</span>
                <div className="flex-1 h-px bg-gray-800"></div>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
                {benchPlayers.map((atleta: any) => (
                    <BenchPlayerCard key={atleta.id} atleta={atleta} />
                ))}
            </div>
        </div>
    );
}

function BenchPlayerCard({ atleta }: { atleta: any }) {
    const isSubOut = atleta.isSubOut; 
    const pts = atleta.pontosCalculados ?? atleta.pontos;
    const basePts = atleta.pontos; 

    let colorClass = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
    let baseColorClass = basePts > 0 ? 'text-green-400' : basePts < 0 ? 'text-red-400' : 'text-gray-400';

    const showDash = !atleta.jogou && pts === 0;

    if (showDash) {
        colorClass = 'text-gray-500';
        baseColorClass = 'text-gray-500';
    }

    return (
        <div className={`flex items-center justify-between gap-1 rounded-lg border border-gray-800 bg-[#151515] p-1.5 transition-colors hover:bg-[#1a1a1a] md:gap-2 md:rounded-xl md:p-2 ${isSubOut ? 'opacity-75' : ''}`}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden md:gap-3.5">
                <div className="relative shrink-0">
                    <img src={atleta.foto} className={`h-7 w-7 rounded-full border bg-black object-cover shadow-inner md:h-9 md:w-9 ${isSubOut ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'border-gray-700'}`} alt="" />
                    
                    {isSubOut && (
                        <IconSaiu className="absolute -top-1 -left-1 w-4 h-4 z-10" />
                    )}
                    
                    {!isSubOut && atleta.isLuxo && (
                      <div className="absolute -bottom-1 -right-1.5 w-4 h-4 bg-black rounded-full border border-black z-10 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                        <LuxoIcon className="w-2.5 h-2.5" />
                      </div>
                    )}
                </div>

                <div className="flex flex-col truncate flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                        <span className={`truncate text-[7px] font-black uppercase leading-tight md:text-[10px] ${isSubOut ? 'text-gray-400' : 'text-gray-200'}`}>{atleta.nome}</span>
                        {!isSubOut && atleta.isCapitao && <span className="text-[7px] font-black text-yellow-400 bg-yellow-950 px-1 py-0.5 rounded border border-yellow-500/30">C</span>}
                        {!isSubOut && atleta.isLuxo && <span className="text-[7px] font-black text-orange-400 bg-orange-950/40 px-1 py-0.5 rounded border border-orange-500/30">LUXO</span>}
                    </div>
                    <span className="mt-0.5 truncate text-[6px] uppercase leading-none text-gray-500 md:mt-1 md:text-[8px]">
                        {atleta.posicao} {isSubOut && <span className="text-red-500 font-bold ml-1">SAIU</span>}
                    </span>
                </div>
            </div>
            
            <div className="ml-0.5 flex shrink-0 flex-col items-end justify-center rounded-md border border-gray-800 bg-black/40 px-1.5 py-1 md:ml-1 md:rounded-lg md:px-2.5">
                {showDash ? (
                    <span className={`text-[11px] md:text-xs font-black font-mono text-gray-500 ${isSubOut ? 'line-through' : ''}`}>-</span>
                ) : atleta.isCapitao ? (
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} text-[11px] md:text-[12px] font-black font-mono leading-none mt-[1px] ${isSubOut ? 'line-through' : ''}`}>{pts.toFixed(1)}</span>
                        <div className="flex items-center gap-[2px] mt-[3px] opacity-95">
                            <span className={`${baseColorClass} font-mono font-bold text-[8px] md:text-[9px] leading-none ${isSubOut ? 'line-through' : ''}`}>{basePts.toFixed(1)}</span>
                            <span className="text-yellow-500 font-black text-[8px] md:text-[9px] leading-none">x1.5</span>
                        </div>
                    </div>
                ) : (
                    <span className={`${colorClass} text-[11px] md:text-xs font-black font-mono leading-none ${isSubOut ? 'line-through' : ''}`}>{pts.toFixed(1)}</span>
                )}
            </div>
        </div>
    );
}
