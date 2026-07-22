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

const CARD_WIDTH = 260;
const CARD_HEIGHT = 88;
const GAP_HORIZ = 80;
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

    const rodadaCartola =
      jogoAtivo.rodada_cartola ??
      jogoAtivo.rodada_real ??
      jogoAtivo.rodada;

    onSelectJogo({ ...jogoAtivo, rodada: rodadaCartola });
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
            } else {
              vencedor = ida.casa;
              idVencedor = ida.time_casa;
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
      className={`w-full h-full overflow-auto bg-[#0a0a0a] relative select-none custom-scrollbar cursor-grab ${
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
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          width: '200%',
          height: '200%',
        }}
      />

      <div className="flex min-h-full min-w-max items-center p-12 md:p-20">
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
              className="flex flex-col justify-center relative"
              style={{ marginRight: GAP_HORIZ }}
            >
              <div className="absolute -top-10 w-full text-center pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-[#0a0a0a]/90 px-3 py-1 rounded border border-gray-800 whitespace-nowrap">
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
                        <div className="absolute -right-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]" />
                        {idx % 2 === 0 && (
                          <div
                            className="absolute -right-[40px] border-r-2 border-[#333]"
                            style={{
                              top: '50%',
                              height: `${gap + CARD_HEIGHT}px`,
                              width: '2px',
                            }}
                          />
                        )}
                      </>
                    )}
                    {colIndex > 0 && (
                      <div className="absolute -left-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {confrontoTerceiro && (
          <div className="flex flex-col gap-4 relative justify-center border-l-2 border-gray-800 border-dashed pl-12 ml-4 opacity-90 h-[200px] mt-20">
            <h3 className="text-center text-orange-500 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 bg-[#0a0a0a] border border-orange-500/30 px-3 py-1 rounded-full shadow-lg mb-2">
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
        className="bg-[#0f0f0f] border-l-4 border-l-green-600 border-y border-r border-gray-800 rounded-lg shadow-lg flex flex-col justify-center px-4 relative"
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
            <span className="text-[9px] text-green-500 font-bold uppercase">Avança Direto</span>
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
        border rounded-lg shadow-lg overflow-hidden flex flex-col justify-center relative z-10 transition-all
        ${isPlaceholder ? 'bg-[#0a0a0a] border-gray-800 border-dashed opacity-80' : 'bg-[#121212] border-gray-800'}
        ${clicavel ? 'cursor-pointer hover:border-blue-500/50 hover:bg-[#151515]' : ''}
        ${isFinal ? 'border-yellow-500/50 shadow-yellow-500/10 scale-105 ring-1 ring-yellow-500/20' : ''}
        ${isTerceiro ? 'border-orange-500/50 shadow-orange-500/10' : ''}
        ${emAndamento ? 'border-green-500/40 shadow-green-900/20' : ''}
      `}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {emAndamento && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-bl-lg animate-pulse z-20" />
      )}

      <div
        className={`flex justify-between items-center px-3 py-1.5 border-b border-gray-800/40 ${
          finalizado && !w1 && !isPenalts && !temDesempate ? 'opacity-40 grayscale' : ''
        }`}
      >
        <div className="flex items-center gap-2 w-[60%] overflow-hidden">
          {casa.escudo ? (
            <img
              src={casa.escudo}
              className="w-5 h-5 object-contain pointer-events-none"
              alt=""
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-5 h-5 bg-gray-800 rounded-full" />
          )}
          <span
            className={`text-[11px] font-bold truncate ${
              w1 ? 'text-green-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {casa.nome}
          </span>
        </div>
        <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
          {!isPlaceholder && (
            <>
              <span className="min-w-4 text-center">{formatPlacar(p1_ida, usarDecimais)}</span>
              {volta && <span className="text-[9px] text-gray-700">+</span>}
              {volta && <span className="min-w-4 text-center">{formatPlacar(p1_volta, usarDecimais)}</span>}
              <div
                className={`ml-2 min-w-6 h-5 px-0.5 flex items-center justify-center text-[11px] font-bold text-white rounded ${
                  w1 ? 'bg-green-700' : 'bg-[#222]'
                }`}
              >
                {formatPlacar(total1, usarDecimais)}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={`flex justify-between items-center px-3 py-1.5 ${
          finalizado && !w2 && !isPenalts && !temDesempate ? 'opacity-40 grayscale' : ''
        }`}
      >
        <div className="flex items-center gap-2 w-[60%] overflow-hidden">
          {visitante?.escudo ? (
            <img
              src={visitante.escudo}
              className="w-5 h-5 object-contain pointer-events-none"
              alt=""
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-5 h-5 bg-gray-800 rounded-full" />
          )}
          <span
            className={`text-[11px] font-bold truncate ${
              w2 ? 'text-green-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {visitante?.nome || 'A definir'}
          </span>
        </div>
        <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
          {!isPlaceholder && (
            <>
              <span className="min-w-4 text-center">{formatPlacar(p2_ida, usarDecimais)}</span>
              {volta && <span className="text-[9px] text-gray-700">+</span>}
              {volta && <span className="min-w-4 text-center">{formatPlacar(p2_volta, usarDecimais)}</span>}
              <div
                className={`ml-2 min-w-6 h-5 px-0.5 flex items-center justify-center text-[11px] font-bold text-white rounded ${
                  w2 ? 'bg-green-700' : 'bg-[#222]'
                }`}
              >
                {formatPlacar(total2, usarDecimais)}
              </div>
            </>
          )}
        </div>
      </div>

      {isPenalts && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-yellow-600 text-black text-[8px] font-black px-1.5 py-0.5 rounded z-20 shadow-sm">
          PEN
        </div>
      )}

      {temDesempate && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded z-20 shadow-sm flex flex-col items-center leading-tight">
          <span>EXTRA</span>
          <span>
            {desempateC} x {desempateV}
          </span>
        </div>
      )}

      {isFinal && (
        <div className="absolute top-2 right-2 text-yellow-500">
          <Trophy size={14} />
        </div>
      )}
    </div>
  );
}
