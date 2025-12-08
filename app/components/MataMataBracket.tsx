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
  uuid: string;
  ida: Jogo | null;
  volta: Jogo | null;
  status: 'agendado' | 'finalizado' | 'tbd' | 'bye';
};

// DIMENSÕES FIXAS
const CARD_WIDTH = 260;
const CARD_HEIGHT = 88;
const GAP_HORIZ = 80; // Aumentei um pouco para caber as linhas
const GAP_VERT_BASE = 20;

export default function MataMataBracket({ partidas }: { partidas: Jogo[] }) {
  
  // 1. PREPARAÇÃO DOS DADOS
  const rodadasNums = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b);
  
  if (rodadasNums.length === 0) return <div className="text-center p-10 text-gray-500">Aguardando jogos...</div>;

  const baseRodada = rodadasNums[0];
  
  // Conta jogos da primeira fase
  const jogosFase1Total = partidas.filter(p => p.rodada === baseRodada || p.rodada === baseRodada + 1);
  
  // Lógica para contar confrontos únicos
  const confrontosUnicosFase1 = new Set();
  jogosFase1Total.forEach(j => {
      // Cria uma chave única independente da ordem (A vs B ou B vs A)
      const key = [j.time_casa, j.time_visitante].sort().join('-');
      confrontosUnicosFase1.add(key);
  });
  
  const numConfrontosIniciais = confrontosUnicosFase1.size;
  // Garante potência de 2 (4, 8, 16, 32...)
  const totalFases = numConfrontosIniciais > 0 ? Math.ceil(Math.log2(numConfrontosIniciais)) + 1 : 0;

  const bracketColumns: Confronto[][] = [];

  for (let f = 0; f < totalFases; f++) {
      const numJogosNaFase = numConfrontosIniciais / Math.pow(2, f);
      const colunaAtual: Confronto[] = [];
      
      const rIda = baseRodada + (f * 2);
      const rVolta = rIda + 1;

      const jogosDestaFase = partidas.filter(p => p.rodada === rIda || p.rodada === rVolta);
      
      const confrontosMap = new Map<string, { ida?: Jogo, volta?: Jogo }>();

      jogosDestaFase.forEach(jogo => {
          const key = [jogo.time_casa, jogo.time_visitante].sort().join('-');
          if (!confrontosMap.has(key)) { confrontosMap.set(key, {}); }
          const entry = confrontosMap.get(key)!;
          if (jogo.rodada === rIda) { entry.ida = jogo; } else { entry.volta = jogo; }
      });

      // Ordena pelo ID da Ida para manter consistência visual
      const confrontosArray = Array.from(confrontosMap.values()).sort((a, b) => (a.ida?.id || 0) - (b.ida?.id || 0));

      for (let i = 0; i < numJogosNaFase; i++) {
          const dados = confrontosArray[i];
          if (dados && dados.ida) {
              colunaAtual.push({
                  uuid: `match-${dados.ida.id}`,
                  ida: dados.ida,
                  volta: dados.volta || null,
                  status: dados.ida.status === 'bye' ? 'bye' : 'agendado'
              });
          } else {
              colunaAtual.push({
                  uuid: `placeholder-${f}-${i}`,
                  ida: null,
                  volta: null,
                  status: 'tbd'
              });
          }
      }
      bracketColumns.push(colunaAtual);
  }

  // --- DRAG AND SCROLL ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-[700px] overflow-auto bg-[#050505] border border-gray-800 rounded-xl relative select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown} 
        onMouseLeave={handleMouseUp} 
        onMouseUp={handleMouseUp} 
        onMouseMove={handleMouseMove}
    >
        {/* Grid de Fundo */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', width: '200%', height: '200%' }}></div>

        {/* Container Flex com Padding Grande para evitar cortes */}
        <div className="flex min-h-full min-w-max items-center p-20"> 
            {bracketColumns.map((confrontos, colIndex) => {
                const phasesLeft = totalFases - colIndex;
                let titulo = `${colIndex + 1}ª Fase`;
                if (phasesLeft === 1) titulo = "🏆 GRANDE FINAL";
                else if (phasesLeft === 2) titulo = "SEMIFINAL";
                else if (phasesLeft === 3) titulo = "QUARTAS";
                else if (phasesLeft === 4) titulo = "OITAVAS";

                // Cálculo de Gap Exponencial
                // Fase 0: Gap Base
                // Fase 1: (2 * Gap Base) + Altura do Card
                // ...
                const power = Math.pow(2, colIndex);
                const gap = (power * GAP_VERT_BASE) + ((power - 1) * CARD_HEIGHT);
                
                // Ajuste de Margem Superior para centralizar a primeira caixa com a conexão
                // Não usamos margin negativa, apenas margin-top positiva na coluna
                // Mas com Flexbox 'items-center' no pai e 'justify-center' na coluna, 
                // o alinhamento deve ocorrer naturalmente pelo gap.
                // O truque é garantir que o gap esteja correto.

                return (
                    <div key={colIndex} className="flex flex-col justify-center relative" style={{ marginRight: GAP_HORIZ }}>
                        {/* Título Flutuante acima da coluna */}
                        <div className="absolute -top-10 w-full text-center pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-[#050505]/90 px-3 py-1 rounded border border-gray-800 whitespace-nowrap">
                                {titulo}
                            </span>
                        </div>

                        <div className="flex flex-col" style={{ gap: gap }}>
                            {confrontos.map((conf, idx) => {
                                return (
                                    <div key={conf.uuid} className="relative flex items-center">
                                        <BracketCard confronto={conf} />

                                        {/* Conectores */}
                                        {colIndex < totalFases - 1 && (
                                            <>
                                                {/* Linha Horizontal Direita */}
                                                <div className="absolute -right-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]"></div>
                                                
                                                {/* Haste Vertical (Conecta pares 0-1, 2-3...) */}
                                                {idx % 2 === 0 && (
                                                    <div 
                                                        className="absolute -right-[40px] border-r-2 border-[#333] rounded-tr-none rounded-br-none"
                                                        style={{ 
                                                            top: '50%', 
                                                            // A altura conecta o meio deste card ao meio do card de baixo (o próximo, idx+1)
                                                            // A distância é exatamente o GAP atual + a altura de um CARD
                                                            height: `${gap + CARD_HEIGHT}px`,
                                                            width: '2px'
                                                        }}
                                                    />
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Linha Horizontal Esquerda (Chegada) */}
                                        {colIndex > 0 && (
                                            <div className="absolute -left-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]"></div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  )
}

function BracketCard({ confronto }: { confronto: Confronto }) {
    const { ida, volta, status } = confronto;

    if (status === 'tbd' || !ida) {
        return (
            <div className="flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-gray-800 rounded-lg opacity-60"
                 style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Aguardando</span>
            </div>
        )
    }

    if (status === 'bye') {
        return (
            <div className="bg-[#0f0f0f] border-l-4 border-l-green-600 border-y border-r border-gray-800 rounded-lg shadow-lg flex flex-col justify-center px-4 relative"
                 style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                 <div className="flex items-center gap-3">
                    <img src={ida.casa.escudo} className="w-8 h-8 object-contain" />
                    <div>
                        <p className="text-white font-bold text-xs truncate w-40">{ida.casa.nome}</p>
                        <span className="text-[9px] text-green-500 font-bold uppercase">Avança Direto</span>
                    </div>
                 </div>
            </div>
        )
    }

    const p1_ida = ida.placar_casa ?? 0;
    const p2_ida = ida.placar_visitante ?? 0;
    const p1_volta = volta?.placar_visitante ?? 0; 
    const p2_volta = volta?.placar_casa ?? 0;      

    const total1 = p1_ida + p1_volta;
    const total2 = p2_ida + p2_volta;
    const finalizado = ida.status === 'finalizado' && (!volta || volta.status === 'finalizado');
    
    const w1 = finalizado && total1 > total2;
    const w2 = finalizado && total2 > total1;
    const isPenalts = finalizado && total1 === total2;

    return (
        <div className="bg-[#121212] border border-gray-800 hover:border-gray-600 transition-colors rounded-lg shadow-lg overflow-hidden flex flex-col justify-center relative z-10"
             style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            
            <div className={`flex justify-between items-center px-3 py-1.5 border-b border-gray-800/40 ${finalizado && !w1 && !isPenalts ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-2 w-[60%] overflow-hidden">
                    <img src={ida.casa.escudo} className="w-5 h-5 object-contain" />
                    <span className={`text-[11px] font-bold truncate ${w1 ? 'text-green-400' : 'text-gray-300'}`}>
                        {ida.casa.nome}
                    </span>
                </div>
                <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
                    <span className="w-4 text-center">{p1_ida}</span>
                    {volta && <span className="text-[9px] text-gray-700">+</span>}
                    {volta && <span className="w-4 text-center">{p1_volta}</span>}
                    <div className={`ml-2 w-6 h-5 flex items-center justify-center text-[11px] font-bold text-white rounded ${w1 ? 'bg-green-700' : 'bg-[#222]'}`}>
                        {total1}
                    </div>
                </div>
            </div>

            <div className={`flex justify-between items-center px-3 py-1.5 ${finalizado && !w2 && !isPenalts ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-2 w-[60%] overflow-hidden">
                    <img src={ida.visitante?.escudo} className="w-5 h-5 object-contain" />
                    <span className={`text-[11px] font-bold truncate ${w2 ? 'text-green-400' : 'text-gray-300'}`}>
                        {ida.visitante?.nome}
                    </span>
                </div>
                <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
                    <span className="w-4 text-center">{p2_ida}</span>
                    {volta && <span className="text-[9px] text-gray-700">+</span>}
                    {volta && <span className="w-4 text-center">{p2_volta}</span>}
                    <div className={`ml-2 w-6 h-5 flex items-center justify-center text-[11px] font-bold text-white rounded ${w2 ? 'bg-green-700' : 'bg-[#222]'}`}>
                        {total2}
                    </div>
                </div>
            </div>

            {isPenalts && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-yellow-600 text-black text-[8px] font-black px-1.5 py-0.5 rounded z-20 shadow-sm">
                    PEN
                </div>
            )}
        </div>
    )
}