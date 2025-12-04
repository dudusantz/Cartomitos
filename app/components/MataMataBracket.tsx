'use client'

import { useState, useRef, useEffect } from 'react'

type Jogo = {
  id: number;
  rodada: number;
  time_casa: number;
  time_visitante: number | null;
  placar_casa: number | null;
  placar_visitante: number | null;
  status: string;
  casa: { nome: string; escudo: string };
  visitante?: { nome: string; escudo: string };
};

type Confronto = {
  ida: Jogo | null;
  volta: Jogo | null;
  isBye: boolean;
  idFake?: string;
  timeProjetadoA?: { nome: string; escudo: string };
  timeProjetadoB?: { nome: string; escudo: string };
};

// CONFIGURAÇÕES VISUAIS
const CARD_HEIGHT = 70; 
const BASE_GAP = 20;     
const ROW_HEIGHT = CARD_HEIGHT + BASE_GAP;

export default function MataMataBracket({ partidas, modoAoVivo = false }: { partidas: Jogo[], modoAoVivo?: boolean }) {
  
  // --- LÓGICA DE ARRASTAR (PAN) ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Inicia o arraste
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollTop(containerRef.current.scrollTop);
    containerRef.current.style.cursor = 'grabbing'; // Muda cursor para "agarrando"
  };

  // Para o arraste
  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.style.cursor = 'grab'; // Volta cursor
  };

  // Move enquanto arrasta
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walkX = (x - startX) * 1.5; // Velocidade horizontal
    containerRef.current.scrollLeft = scrollLeft - walkX;

    const y = e.pageY - containerRef.current.offsetTop;
    const walkY = (y - startY) * 1.5; // Velocidade vertical
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  // Garante que o cursor volta ao normal se sair da tela
  useEffect(() => {
    const handleGlobalMouseUp = () => {
        if(isDragging) handleMouseUp();
    }
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // --- CÁLCULO DO TORNEIO ---
  const jogosFase1 = partidas.filter(p => p.rodada === 1);
  const countByes = jogosFase1.filter(j => j.status === 'bye').length;
  const countJogosNormais = jogosFase1.filter(j => j.status !== 'bye').length / 2;
  const totalConfrontosIniciais = countByes + countJogosNormais;
  
  let slotsBase = 2;
  while (slotsBase < totalConfrontosIniciais) slotsBase *= 2;
  
  const numFases = Math.log2(slotsBase) + 1;
  const fasesParaRenderizar = Array.from({ length: Math.max(numFases, 1) }, (_, i) => i + 1);
  const vencedoresPorFase: { [key: number]: any[] } = {};

  return (
    // CONTAINER EXTERNO (JANELA VISÍVEL)
    <div 
        ref={containerRef}
        className="w-full h-[700px] overflow-auto cursor-grab active:cursor-grabbing border border-gray-800/50 rounded-xl bg-[#080808] relative shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {/* CONTEÚDO (ÁRVORE GIGANTE) */}
      <div className="flex gap-12 p-20 min-w-max items-start select-none"> {/* select-none evita selecionar texto ao arrastar */}
          
          {fasesParaRenderizar.map((fase, faseIndex) => {
            const power = Math.pow(2, faseIndex);
            const dynamicGap = (power * ROW_HEIGHT) - CARD_HEIGHT;
            const marginTop = (power - 1) * (ROW_HEIGHT / 2);

            const jogosReais = partidas.filter(p => p.rodada === fase);
            const confrontosMap = new Map<string, Confronto>();

            jogosReais.forEach(jogo => {
                if (jogo.status === 'bye') {
                    confrontosMap.set(`bye-${jogo.id}`, { ida: jogo, volta: null, isBye: true });
                } else {
                    const key = [jogo.time_casa, jogo.time_visitante].sort((a,b)=>(a||0)-(b||0)).join('-');
                    if (!confrontosMap.has(key)) {
                        confrontosMap.set(key, { ida: jogo, volta: null, isBye: false });
                    } else {
                        const c = confrontosMap.get(key)!;
                        if (c.ida?.id !== jogo.id) c.volta = jogo;
                    }
                }
            });

            let listaConfrontos = Array.from(confrontosMap.values());
            const slotsEsperados = Math.max(slotsBase / power, 1);
            
            if (listaConfrontos.length < slotsEsperados) {
                const faltam = slotsEsperados - listaConfrontos.length;
                const timesVindosDaAnterior = vencedoresPorFase[faseIndex - 1] || [];
                const slotsOcupados = listaConfrontos.length;

                const placeholders = Array(faltam).fill(null).map((_, i) => {
                    const slotIndexGlobal = i + slotsOcupados;
                    const projA = modoAoVivo ? timesVindosDaAnterior[slotIndexGlobal * 2] : null;
                    const projB = modoAoVivo ? timesVindosDaAnterior[slotIndexGlobal * 2 + 1] : null;

                    return {
                        ida: null, volta: null, isBye: false, idFake: `futuro-${fase}-${i}`,
                        timeProjetadoA: projA,
                        timeProjetadoB: projB
                    };
                });
                
                // @ts-ignore
                listaConfrontos = [...listaConfrontos, ...placeholders];
            }

            if (modoAoVivo) {
                const vencedoresDestaFase: any[] = [];
                listaConfrontos.forEach(conf => {
                    let vencedor = getVencedorProvisorio(conf);
                    vencedoresDestaFase.push(vencedor);
                });
                vencedoresPorFase[faseIndex] = vencedoresDestaFase;
            }

            let nomeFase = `${fase}ª Fase`;
            if (slotsEsperados === 1) nomeFase = "🏆 Final";
            else if (slotsEsperados === 2) nomeFase = "Semifinal";
            else if (slotsEsperados === 4) nomeFase = "Quartas";

            return (
              <div key={fase} className="flex flex-col min-w-[260px] relative">
                <h3 className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-6">
                  {nomeFase}
                </h3>

                <div className="flex flex-col" style={{ marginTop: `${marginTop}px`, gap: `${dynamicGap}px` }}>
                  {listaConfrontos.map((conf, idx) => (
                    <div key={idx} className="relative flex items-center group">
                       <div style={{ height: `${CARD_HEIGHT}px` }} className="w-full relative z-10">
                           <CardConfrontoVisual confronto={conf} modoAoVivo={modoAoVivo} />
                       </div>
                       
                       {faseIndex < numFases && (
                         <>
                            <div className="absolute -right-6 top-1/2 w-6 h-[1px] bg-gray-600"></div>
                            {idx % 2 === 0 && (
                                <div className="absolute -right-6 border-r border-gray-600 rounded-tr-none rounded-br-none" style={{ top: '50%', height: `${dynamicGap + CARD_HEIGHT}px`, width: '1px' }}></div>
                            )}
                            {faseIndex > 0 && (
                                <div className="absolute -left-6 top-1/2 w-6 h-[1px] bg-gray-600"></div>
                            )}
                         </>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// Helper e Card (Mantém iguais ao anterior, só copiei para garantir completude)
function getVencedorProvisorio(conf: any) {
    if (conf.isBye && conf.ida) return conf.ida.casa;
    if (!conf.ida) return null; 
    const p1c = conf.ida.placar_casa ?? 0;
    const p1v = conf.ida.placar_visitante ?? 0;
    const p2c = conf.volta?.placar_casa ?? 0;
    const p2v = conf.volta?.placar_visitante ?? 0;
    const totalA = p1c + (conf.volta ? p2v : 0);
    const totalB = p1v + (conf.volta ? p2c : 0);
    if (totalA > totalB) return conf.ida.casa;
    if (totalB > totalA) return conf.ida.visitante;
    return conf.ida.casa; 
}

function CardConfrontoVisual({ confronto, modoAoVivo }: { confronto: any, modoAoVivo: boolean }) {
  const { ida, volta, isBye, timeProjetadoA, timeProjetadoB } = confronto;

  if (!ida && !isBye) {
      if (modoAoVivo && (timeProjetadoA || timeProjetadoB)) {
          return (
            <div className="w-full h-full bg-[#0f0f0f] border border-blue-900/30 rounded-lg flex flex-col justify-center relative shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 text-[6px] px-1 text-white font-bold">PROJEÇÃO</div>
                <div className="flex items-center h-1/2 px-3 border-b border-gray-800/30">
                    {timeProjetadoA ? (
                        <><img src={timeProjetadoA.escudo} className="w-4 h-4 object-contain mr-2 opacity-70 grayscale" /><span className="text-[10px] font-bold text-blue-200/70 truncate">{timeProjetadoA.nome}</span></>
                    ) : <span className="text-[8px] text-gray-800">---</span>}
                </div>
                <div className="flex items-center h-1/2 px-3">
                    {timeProjetadoB ? (
                        <><img src={timeProjetadoB.escudo} className="w-4 h-4 object-contain mr-2 opacity-70 grayscale" /><span className="text-[10px] font-bold text-blue-200/70 truncate">{timeProjetadoB.nome}</span></>
                    ) : <span className="text-[8px] text-gray-800">---</span>}
                </div>
            </div>
          )
      }
      return (
        <div className="w-full h-full bg-[#111] border border-gray-800 border-dashed rounded flex items-center justify-center">
            <span className="text-gray-700 text-[9px] font-bold">A DEFINIR</span>
        </div>
      )
  }

  if (isBye && ida) {
    return (
        <div className="w-full h-full bg-[#151515] border-l-4 border-l-green-500 border border-gray-800 rounded flex items-center px-3 shadow-md">
            <img src={ida.casa.escudo} className="w-8 h-8 object-contain mr-3" />
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-xs truncate">{ida.casa.nome}</p>
                <span className="text-[9px] text-green-500 uppercase font-bold">Classificado</span>
            </div>
        </div>
    )
  }

  if (ida) {
      const p1c = ida.placar_casa ?? 0;
      const p1v = ida.placar_visitante ?? 0;
      const p2c = volta?.placar_casa ?? 0;
      const p2v = volta?.placar_visitante ?? 0;
      const totalA = p1c + (volta ? p2v : 0);
      const totalB = p1v + (volta ? p2c : 0);
      const isFinalizado = ida.status === 'finalizado' && volta?.status === 'finalizado';
      const winnerA = totalA > totalB;
      const winnerB = totalB > totalA;

      return (
        <div className="w-full h-full bg-[#1a1a1a] border border-gray-800 rounded shadow-lg overflow-hidden flex flex-col">
          <div className={`flex items-center h-1/2 px-3 border-b border-gray-800/50 ${isFinalizado && !winnerA ? 'opacity-40' : ''}`}>
             <img src={ida.casa.escudo} className="w-5 h-5 object-contain mr-2" />
             <span className={`text-[11px] font-bold truncate flex-1 ${winnerA && isFinalizado ? 'text-cartola-gold' : 'text-gray-300'}`}>{ida.casa.nome}</span>
             <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-gray-600 w-4 text-right">{p1c}</span>
                {volta && <span className="text-gray-600 w-4 text-right">{p2v}</span>}
                <span className={`w-6 text-center font-bold ${winnerA && isFinalizado ? 'text-white bg-green-600 rounded px-1' : 'text-gray-400 bg-black/40 rounded px-1'}`}>{totalA}</span>
             </div>
          </div>
          <div className={`flex items-center h-1/2 px-3 ${isFinalizado && !winnerB ? 'opacity-40' : ''}`}>
             <img src={ida.visitante?.escudo} className="w-5 h-5 object-contain mr-2" />
             <span className={`text-[11px] font-bold truncate flex-1 ${winnerB && isFinalizado ? 'text-cartola-gold' : 'text-gray-300'}`}>{ida.visitante?.nome}</span>
             <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-gray-600 w-4 text-right">{p1v}</span>
                {volta && <span className="text-gray-600 w-4 text-right">{p2c}</span>}
                <span className={`w-6 text-center font-bold ${winnerB && isFinalizado ? 'text-white bg-green-600 rounded px-1' : 'text-gray-400 bg-black/40 rounded px-1'}`}>{totalB}</span>
             </div>
          </div>
        </div>
      );
  }
  return null;
}