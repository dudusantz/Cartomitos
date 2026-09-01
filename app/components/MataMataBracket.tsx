'use client'

import { useRef } from 'react'
import { Medal, Trophy } from 'lucide-react'

export type JogoBracket = {
  id: number;
  rodada: number;
  time_casa: number;
  time_visitante: number | null;
  placar_casa: number | null;
  placar_visitante: number | null;
  desempate_casa?: number | null;
  desempate_visitante?: number | null;
  rodada_desempate?: number | null;
  vencedor_desempate?: number | null;
  status: string;
  pontos_reais_casa?: number;
  pontos_reais_visitante?: number;
  casa: { nome: string; escudo: string; time_id_cartola?: number };
  visitante?: { nome: string; escudo: string; time_id_cartola?: number };
  rodada_cartola?: number;
  rodada_real?: number;
  is_parcial?: boolean;
  is_live?: boolean;
};

type Confronto = {
  uuid: string;
  ida: JogoBracket | null;
  volta: JogoBracket | null;
  status: 'agendado' | 'finalizado' | 'tbd' | 'bye';
  vencedor?: { nome: string; escudo: string } | null;
  tipo?: 'padrao' | 'final' | 'terceiro';
};

const CARD_WIDTH = 276;
const CARD_HEIGHT = 130;
const GAP_HORIZ = 64;
const GAP_VERT_BASE = 20;
const DRAG_THRESHOLD = 6;

type Props = {
  partidas: JogoBracket[];
  onSelectJogo?: (jogo: JogoBracket) => void;
  modoAoVivo?: boolean;
  usarDecimais?: boolean;
  className?: string;
};

function formatPlacar(valor: number | null | undefined, usarDecimais: boolean) {
  if (valor === null || valor === undefined) return '-';
  if (usarDecimais) {
    const n = Number(valor);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  return String(Math.trunc(Number(valor)));
}

export default function MataMataBracket({
  partidas,
  onSelectJogo,
  modoAoVivo = false,
  usarDecimais = false,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  function iniciarPan(clientX: number, clientY: number, target: EventTarget | null) {
    if (!containerRef.current) return;
    const el = target instanceof HTMLElement ? target : null;
    if (el?.closest('a, input, textarea, select')) return;

    dragMovedRef.current = false;
    isDraggingRef.current = true;
    pointerStart.current = {
      x: clientX,
      y: clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
    containerRef.current.classList.add('cursor-grabbing');
    containerRef.current.classList.remove('cursor-grab');
  }

  function moverPan(clientX: number, clientY: number) {
    if (!isDraggingRef.current || !containerRef.current) return;
    const dx = clientX - pointerStart.current.x;
    const dy = clientY - pointerStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragMovedRef.current = true;
    }
    containerRef.current.scrollLeft = pointerStart.current.scrollLeft - dx;
    containerRef.current.scrollTop = pointerStart.current.scrollTop - dy;
  }

  function encerrarPan() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (containerRef.current) {
      containerRef.current.classList.remove('cursor-grabbing');
      containerRef.current.classList.add('cursor-grab');
    }
  }

  function handleSelect(confronto: Confronto) {
    if (dragMovedRef.current || !onSelectJogo) return;
    const ida = confronto.ida;
    if (!ida || ida.id <= 0 || confronto.status === 'tbd' || confronto.status === 'bye') return;

    const jogoAtivo =
      confronto.volta && ida.status === 'finalizado' ? confronto.volta : ida;

    if (!jogoAtivo.rodada_cartola) return;
    onSelectJogo({ ...jogoAtivo, rodada: jogoAtivo.rodada_cartola });
  }

  const rodadasNums = [...new Set(partidas.map((p) => p.rodada))].sort((a, b) => a - b);

  if (rodadasNums.length === 0) {
    return <div className="text-center p-10 text-gray-500">Aguardando jogos...</div>;
  }

  const baseRodada = rodadasNums[0];

  const confrontosFase1 = new Set<string>();
  partidas
    .filter(
      (p) =>
        Number(p.rodada) === Number(baseRodada) ||
        Number(p.rodada) === Number(baseRodada) + 1
    )
    .forEach((j) => {
      const key =
        j.time_casa && j.time_visitante
          ? [j.time_casa, j.time_visitante].sort().join('-')
          : `jogo-${j.id}`;
      confrontosFase1.add(key);
    });

  const numConfrontosIniciais = confrontosFase1.size;
  const totalFases =
    numConfrontosIniciais > 0 ? Math.ceil(Math.log2(numConfrontosIniciais)) + 1 : 0;

  const bracketColumns: Confronto[][] = [];
  const vencedoresMap = new Map<string, { nome: string; escudo: string }>();
  const idsVencedoresSemi = new Set<number>();

  for (let f = 0; f < totalFases; f++) {
    const numJogosNaFase = numConfrontosIniciais / Math.pow(2, f);
    const colunaAtual: Confronto[] = [];
    const isFinal = f === totalFases - 1;
    const isSemi = f === totalFases - 2;

    const rIda = baseRodada + f * 2;
    const rVolta = rIda + 1;

    const jogosDestaFase = partidas.filter(
      (p) => p.rodada === rIda || p.rodada === rVolta
    );

    const confrontosMap = new Map<string, { ida?: JogoBracket; volta?: JogoBracket }>();
    jogosDestaFase.forEach((jogo) => {
      const key = [jogo.time_casa, jogo.time_visitante].sort().join('-');
      if (!confrontosMap.has(key)) confrontosMap.set(key, {});
      const entry = confrontosMap.get(key)!;
      if (jogo.rodada === rIda) entry.ida = jogo;
      else entry.volta = jogo;
    });

    let confrontosArray = Array.from(confrontosMap.values());

    if (isFinal && confrontosArray.length > 1) {
      const matchFinal = confrontosArray.find((c) => {
        if (!c.ida) return false;
        return (
          idsVencedoresSemi.has(c.ida.time_casa) ||
          idsVencedoresSemi.has(c.ida.time_visitante || -1)
        );
      });
      if (matchFinal) confrontosArray = [matchFinal];
      else {
        confrontosArray.sort((a, b) => (a.ida?.id || 0) - (b.ida?.id || 0));
        confrontosArray = [confrontosArray[0]];
      }
    } else {
      confrontosArray.sort((a, b) => (a.ida?.id || 0) - (b.ida?.id || 0));
    }

    for (let i = 0; i < numJogosNaFase; i++) {
      const dados = confrontosArray[i];
      let confronto: Confronto;

      if (dados && dados.ida) {
        const ida = dados.ida;
        const volta = dados.volta || null;

        let vencedor = null;
        let idVencedor: number | null = null;

        if (ida.status === 'bye') {
          vencedor = ida.casa;
          idVencedor = ida.time_casa;
        } else if (
          ida.status === 'finalizado' &&
          (!volta || volta.status === 'finalizado')
        ) {
          const p1 = (ida.placar_casa || 0) + (volta?.placar_visitante || 0);
          const p2 = (ida.placar_visitante || 0) + (volta?.placar_casa || 0);

          if (p1 > p2) {
            vencedor = ida.casa;
            idVencedor = ida.time_casa;
          } else if (p2 > p1) {
            vencedor = ida.visitante || null;
            idVencedor = ida.time_visitante;
          } else {
            const jogoDecisivo = volta || ida;
            const dC = jogoDecisivo.desempate_casa ?? -1;
            const dV = jogoDecisivo.desempate_visitante ?? -1;

            if (dC >= 0 && dV >= 0) {
              if (dC > dV) {
                vencedor = jogoDecisivo.casa;
                idVencedor = jogoDecisivo.time_casa;
              } else {
                vencedor = jogoDecisivo.visitante || null;
                idVencedor = jogoDecisivo.time_visitante;
              }
            }
          }
        }

        if (vencedor && idVencedor) {
          vencedoresMap.set(`${f}-${i}`, vencedor);
          if (isSemi) idsVencedoresSemi.add(idVencedor);
        }

        confronto = {
          uuid: `match-${ida.id}`,
          ida,
          volta,
          status: ida.status === 'bye' ? 'bye' : 'agendado',
          vencedor,
          tipo: isFinal ? 'final' : 'padrao',
        };
      } else {
        let timeA_Proj = null;
        let timeB_Proj = null;
        if (f > 0) {
          timeA_Proj = vencedoresMap.get(`${f - 1}-${i * 2}`);
          timeB_Proj = vencedoresMap.get(`${f - 1}-${i * 2 + 1}`);
        }

        const fakeIda: JogoBracket = {
          id: 0,
          rodada: rIda,
          time_casa: 0,
          time_visitante: null,
          casa: timeA_Proj
            ? { nome: timeA_Proj.nome, escudo: timeA_Proj.escudo }
            : { nome: 'A definir', escudo: '' },
          visitante: timeB_Proj
            ? { nome: timeB_Proj.nome, escudo: timeB_Proj.escudo }
            : { nome: 'A definir', escudo: '' },
          placar_casa: null,
          placar_visitante: null,
          status: 'tbd',
        };

        confronto = {
          uuid: `placeholder-${f}-${i}`,
          ida: fakeIda,
          volta: null,
          status: 'tbd',
          tipo: isFinal ? 'final' : 'padrao',
        };
      }
      colunaAtual.push(confronto);
    }
    bracketColumns.push(colunaAtual);
  }

  let confrontoTerceiro: Confronto | null = null;
  if (totalFases >= 2) {
    const ultimaFaseIndex = totalFases - 1;
    const rFinalIda = baseRodada + ultimaFaseIndex * 2;
    const idFinalBracket = bracketColumns[ultimaFaseIndex][0]?.ida?.id;
    const jogoTerceiroRaw = partidas.find(
      (p) => p.rodada === rFinalIda && p.id !== idFinalBracket
    );

    if (jogoTerceiroRaw) {
      const rFinalVolta = rFinalIda + 1;
      const volta3Place = partidas.find(
        (p) =>
          p.rodada === rFinalVolta &&
          ((p.time_casa === jogoTerceiroRaw.time_visitante &&
            p.time_visitante === jogoTerceiroRaw.time_casa) ||
            (p.time_casa === jogoTerceiroRaw.time_casa &&
              p.time_visitante === jogoTerceiroRaw.time_visitante))
      );
      confrontoTerceiro = {
        uuid: `match-3rd-${jogoTerceiroRaw.id}`,
        ida: jogoTerceiroRaw,
        volta: volta3Place || null,
        status: 'agendado',
        tipo: 'terceiro',
      };
    } else {
      const fakeIda: JogoBracket = {
        id: -99,
        rodada: rFinalIda,
        time_casa: 0,
        time_visitante: null,
        casa: { nome: 'Perdedor Semi 1', escudo: '' },
        visitante: { nome: 'Perdedor Semi 2', escudo: '' },
        placar_casa: null,
        placar_visitante: null,
        status: 'tbd',
      };
      confrontoTerceiro = {
        uuid: `placeholder-3rd`,
        ida: fakeIda,
        volta: null,
        status: 'tbd',
        tipo: 'terceiro',
      };
    }
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-auto bg-[#0a0a0a] relative select-none custom-scrollbar cursor-grab overscroll-contain touch-pan-x touch-pan-y ${
        modoAoVivo ? 'border-green-500/20' : ''
      } ${className}`}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        iniciarPan(e.clientX, e.clientY, e.target);
      }}
      onMouseMove={(e) => {
        if (!isDraggingRef.current) return;
        moverPan(e.clientX, e.clientY);
      }}
      onMouseUp={encerrarPan}
      onMouseLeave={encerrarPan}
    >
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(216,170,50,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(216,170,50,.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          width: '200%',
          height: '200%',
        }}
      />

      <div className="flex min-h-full min-w-max items-center px-7 py-16 md:p-20 snap-x snap-mandatory">
        {bracketColumns.map((confrontos, colIndex) => {
          const phasesLeft = totalFases - colIndex;
          let titulo = `${colIndex + 1}ª Fase`;
          if (phasesLeft === 1) titulo = '🏆 Grande Final';
          else if (phasesLeft === 2) titulo = 'Semifinal';
          else if (phasesLeft === 3) titulo = 'Quartas';
          else if (phasesLeft === 4) titulo = 'Oitavas';

          const power = Math.pow(2, colIndex);
          const gap = power * GAP_VERT_BASE + (power - 1) * CARD_HEIGHT;

          return (
            <div
              key={colIndex}
              className="flex flex-col justify-center relative snap-center"
              style={{ marginRight: GAP_HORIZ }}
            >
              <div className="absolute -top-11 w-full text-center pointer-events-none">
                <span className={`inline-flex text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-md border whitespace-nowrap backdrop-blur-md ${phasesLeft === 1 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-gray-400 bg-[#111310]/95 border-white/10'}`}>
                  {titulo}
                </span>
              </div>
              <div className="flex flex-col" style={{ gap }}>
                {confrontos.map((conf, idx) => (
                  <div key={conf.uuid} className="relative flex items-center">
                    <BracketCard
                      confronto={conf}
                      modoAoVivo={modoAoVivo}
                      usarDecimais={usarDecimais}
                      clicavel={
                        !!onSelectJogo &&
                        conf.status !== 'tbd' &&
                        conf.status !== 'bye' &&
                        !!conf.ida &&
                        conf.ida.id > 0
                      }
                      onClick={() => handleSelect(conf)}
                    />
                    {colIndex < totalFases - 1 && (
                      <>
                        <div className="absolute -right-[32px] top-1/2 w-[32px] h-px bg-yellow-500/25" />
                        {idx % 2 === 0 && (
                          <div
                            className="absolute -right-[32px] border-r border-yellow-500/25"
                            style={{
                              top: '50%',
                              height: `${gap + CARD_HEIGHT}px`,
                              width: '1px',
                            }}
                          />
                        )}
                      </>
                    )}
                    {colIndex > 0 && (
                      <div className="absolute -left-[32px] top-1/2 w-[32px] h-px bg-yellow-500/25" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {confrontoTerceiro && (
          <div className="flex flex-col gap-4 relative justify-center border-l border-white/10 border-dashed pl-10 ml-2 opacity-90 h-[200px] mt-20 snap-center">
            <h3 className="text-center text-yellow-500/80 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 bg-[#111310] border border-yellow-500/20 px-3 py-1.5 rounded-md mb-2">
              <Medal size={12} /> 3º Lugar
            </h3>
            <div className="flex flex-col justify-center">
              <BracketCard
                confronto={confrontoTerceiro}
                modoAoVivo={modoAoVivo}
                usarDecimais={usarDecimais}
                clicavel={
                  !!onSelectJogo &&
                  confrontoTerceiro.status !== 'tbd' &&
                  !!confrontoTerceiro.ida &&
                  confrontoTerceiro.ida.id > 0
                }
                onClick={() => handleSelect(confrontoTerceiro!)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BracketCard({
  confronto,
  onClick,
  clicavel,
  modoAoVivo,
  usarDecimais = false,
}: {
  confronto: Confronto;
  onClick?: () => void;
  clicavel?: boolean;
  modoAoVivo?: boolean;
  usarDecimais?: boolean;
}) {
  const { ida, volta, status, tipo } = confronto;
  const isFinal = tipo === 'final';
  const isTerceiro = tipo === 'terceiro';

  if (status === 'bye' && ida) {
    return (
      <div
        className="bg-[#111310] border-l-2 border-l-yellow-500 border-y border-r border-white/10 rounded-xl flex flex-col justify-center px-4 relative shadow-[0_18px_40px_rgba(0,0,0,.22)]"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        <div className="flex items-center gap-3">
          {ida.casa.escudo ? (
            <img
              src={ida.casa.escudo}
              className="w-8 h-8 object-contain"
              alt={ida.casa.nome}
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
          )}
          <div>
            <p className="text-white font-bold text-xs truncate w-40">{ida.casa.nome}</p>
            <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-wide">Avança direto</span>
          </div>
        </div>
      </div>
    );
  }

  const isPlaceholder = status === 'tbd';
  const jogoDados = ida;

  if (!jogoDados) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-gray-800 rounded-lg opacity-60"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
          Aguardando
        </span>
      </div>
    );
  }

  const casa = jogoDados.casa;
  const visitante = jogoDados.visitante;

  const p1_ida = jogoDados.placar_casa ?? (isPlaceholder ? null : 0);
  const p2_ida = jogoDados.placar_visitante ?? (isPlaceholder ? null : 0);
  const p1_volta = volta?.placar_visitante ?? (isPlaceholder ? null : 0);
  const p2_volta = volta?.placar_casa ?? (isPlaceholder ? null : 0);

  const total1 = !isPlaceholder ? (p1_ida || 0) + (p1_volta || 0) : null;
  const total2 = !isPlaceholder ? (p2_ida || 0) + (p2_volta || 0) : null;

  const finalizado =
    !isPlaceholder &&
    jogoDados.status === 'finalizado' &&
    (!volta || volta.status === 'finalizado');

  const emAndamento =
    !!modoAoVivo &&
    !isPlaceholder &&
    (jogoDados.is_parcial ||
      jogoDados.is_live ||
      volta?.is_parcial ||
      volta?.is_live);

  const jogoDecisivo = volta || ida;
  const desempateC = jogoDecisivo?.desempate_casa ?? -1;
  const desempateV = jogoDecisivo?.desempate_visitante ?? -1;
  const temDesempate = desempateC >= 0 && desempateV >= 0;

  let w1 = false;
  let w2 = false;

  if (finalizado && total1 !== null && total2 !== null) {
    if (total1 > total2) w1 = true;
    else if (total2 > total1) w2 = true;
    else if (temDesempate) {
      let golsT1 = desempateC;
      let golsT2 = desempateV;

      if (volta && volta.time_casa === jogoDados.time_visitante) {
        golsT1 = desempateV;
        golsT2 = desempateC;
      }

      if (golsT1 > golsT2) w1 = true;
      else if (golsT2 > golsT1) w2 = true;
    }
  }

  const isPenalts = finalizado && total1 === total2 && !temDesempate;
  let placarDesempate1 = desempateC;
  let placarDesempate2 = desempateV;
  if (temDesempate && volta && volta.time_casa === jogoDados.time_visitante) {
    placarDesempate1 = desempateV;
    placarDesempate2 = desempateC;
  }

  return (
    <div
      data-bracket-card
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onClick={clicavel ? onClick : undefined}
      onKeyDown={
        clicavel
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`
        border rounded-xl overflow-hidden flex flex-col justify-center relative z-10 transition-all duration-200 shadow-[0_18px_40px_rgba(0,0,0,.22)]
        ${isPlaceholder ? 'bg-[#0a0a0a] border-white/10 border-dashed opacity-70' : 'bg-[#131511] border-white/10'}
        ${clicavel ? 'cursor-pointer hover:border-yellow-500/40 hover:bg-[#181b16] hover:-translate-y-0.5' : ''}
        ${isFinal ? 'border-yellow-500/55 shadow-[0_22px_55px_rgba(155,111,8,.14)] scale-105 ring-1 ring-yellow-500/15' : ''}
        ${isTerceiro ? 'border-yellow-500/25' : ''}
        ${emAndamento ? 'border-green-500/40 shadow-green-900/20' : ''}
      `}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {emAndamento && (
        <div className="absolute left-0 top-0 h-full w-0.5 animate-pulse bg-green-500 z-20" />
      )}

      {!isPlaceholder && (
        <div className="grid h-6 grid-cols-[minmax(0,1fr)_28px_8px_28px_40px] items-center gap-1 border-b border-white/[0.06] bg-black/20 px-3 text-[7px] font-bold uppercase tracking-[0.08em] text-gray-600">
          <span>{finalizado ? 'Confronto encerrado' : emAndamento ? 'Parcial' : 'Confronto'}</span>
          <span className="text-center">Ida</span>
          <span />
          <span className="text-center">{volta ? 'Volta' : ''}</span>
          <span className="text-center text-gray-500">Total</span>
        </div>
      )}

      <div
        className={`grid flex-1 grid-cols-[minmax(0,1fr)_28px_8px_28px_40px] items-center gap-1 border-b border-white/[0.055] px-3 ${
          finalizado && !w1 && !isPenalts && !temDesempate ? 'opacity-45' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {casa.escudo ? (
            <img
              src={casa.escudo}
              className="h-6 w-6 shrink-0 object-contain pointer-events-none"
              alt=""
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-full bg-gray-800" />
          )}
          <span
            className={`truncate text-[10px] font-bold ${
              w1 ? 'text-yellow-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {casa.nome}
          </span>
        </div>
        <span className="text-center font-mono text-xs font-bold text-gray-300">{!isPlaceholder ? formatPlacar(p1_ida, usarDecimais) : ''}</span>
        <span className="text-center text-[8px] text-gray-700">{volta ? '+' : ''}</span>
        <span className="text-center font-mono text-xs font-bold text-gray-300">{volta ? formatPlacar(p1_volta, usarDecimais) : ''}</span>
        {!isPlaceholder ? <span className={`flex h-7 items-center justify-center rounded-md font-mono text-sm font-black ${w1 ? 'bg-yellow-500 text-black' : 'border border-white/[0.07] bg-white/[0.045] text-white'}`}>{formatPlacar(total1, usarDecimais)}</span> : <span />}
      </div>

      <div
        className={`grid flex-1 grid-cols-[minmax(0,1fr)_28px_8px_28px_40px] items-center gap-1 px-3 ${
          finalizado && !w2 && !isPenalts && !temDesempate ? 'opacity-45' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {visitante?.escudo ? (
            <img
              src={visitante.escudo}
              className="h-6 w-6 shrink-0 object-contain pointer-events-none"
              alt=""
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-full bg-gray-800" />
          )}
          <span
            className={`truncate text-[10px] font-bold ${
              w2 ? 'text-yellow-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {visitante?.nome || 'A definir'}
          </span>
        </div>
        <span className="text-center font-mono text-xs font-bold text-gray-300">{!isPlaceholder ? formatPlacar(p2_ida, usarDecimais) : ''}</span>
        <span className="text-center text-[8px] text-gray-700">{volta ? '+' : ''}</span>
        <span className="text-center font-mono text-xs font-bold text-gray-300">{volta ? formatPlacar(p2_volta, usarDecimais) : ''}</span>
        {!isPlaceholder ? <span className={`flex h-7 items-center justify-center rounded-md font-mono text-sm font-black ${w2 ? 'bg-yellow-500 text-black' : 'border border-white/[0.07] bg-white/[0.045] text-white'}`}>{formatPlacar(total2, usarDecimais)}</span> : <span />}
      </div>

      <div className={`flex h-7 items-center justify-between border-t px-3 text-[7px] font-bold uppercase tracking-[0.08em] ${temDesempate ? 'border-yellow-500/20 bg-yellow-500/[0.06]' : isPenalts ? 'border-yellow-500/15 bg-yellow-500/[0.035]' : 'border-white/[0.045] bg-black/10'}`}>
        {temDesempate ? (
          <>
            <span className="flex items-center gap-1.5 text-yellow-500"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Jogo de desempate</span>
            <span className="flex items-center gap-1.5 font-mono text-xs font-black tracking-normal text-white"><span className={w1 ? 'text-yellow-500' : ''}>{formatPlacar(placarDesempate1, usarDecimais)}</span><span className="text-gray-700">×</span><span className={w2 ? 'text-yellow-500' : ''}>{formatPlacar(placarDesempate2, usarDecimais)}</span></span>
          </>
        ) : isPenalts ? (
          <><span className="text-yellow-500">Desempate necessário</span><span className="text-gray-600">Agregado igual</span></>
        ) : (
          <><span className={emAndamento ? 'text-green-400' : 'text-gray-700'}>{emAndamento ? 'Parcial em andamento' : finalizado ? 'Resultado confirmado' : 'Aguardando resultado'}</span><span className="text-gray-700">{volta ? 'Ida e volta' : 'Jogo único'}</span></>
        )}
      </div>

      {isFinal && (
        <div className="absolute top-2 right-2 text-yellow-500">
          <Trophy size={14} />
        </div>
      )}
    </div>
  );
}
