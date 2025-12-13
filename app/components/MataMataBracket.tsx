'use client'

import { useState, useRef } from 'react'
import { Medal, Trophy } from 'lucide-react'

type Jogo = {
  id: number;
  rodada: number;
  time_casa: number;
  time_visitante: number | null;
  placar_casa: number | null;
  placar_visitante: number | null;
  status: string;
  pontos_reais_casa?: number;
  pontos_reais_visitante?: number;
  casa: { nome: string; escudo: string };
  visitante?: { nome: string; escudo: string };
};

type Confronto = {
  uuid: string;
  ida: Jogo | null;
  volta: Jogo | null;
  status: 'agendado' | 'finalizado' | 'tbd' | 'bye';
  vencedor?: { nome: string; escudo: string } | null;
  tipo?: 'padrao' | 'final' | 'terceiro';
};

// DIMENSÕES
const CARD_WIDTH = 260;
const CARD_HEIGHT = 88;
const GAP_HORIZ = 80;
const GAP_VERT_BASE = 20;

export default function MataMataBracket({ partidas }: { partidas: Jogo[] }) {
  
  const rodadasNums = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b);
  
  if (rodadasNums.length === 0) return <div className="text-center p-10 text-gray-500">Aguardando jogos...</div>;

  const baseRodada = rodadasNums[0];
  
  // Calcula o tamanho da árvore baseado na primeira fase
  const confrontosFase1 = new Set();
  partidas.filter(p => p.rodada === baseRodada || p.rodada === baseRodada + 1).forEach(j => {
      const key = [j.time_casa, j.time_visitante].sort().join('-');
      confrontosFase1.add(key);
  });
  
  const numConfrontosIniciais = confrontosFase1.size;
  const totalFases = numConfrontosIniciais > 0 ? Math.ceil(Math.log2(numConfrontosIniciais)) + 1 : 0;

  const bracketColumns: Confronto[][] = [];
  const vencedoresMap = new Map<string, { nome: string; escudo: string }>(); // Rastreia vencedores para projeção
  const idsVencedoresSemi = new Set<number>(); // Rastreia IDs dos vencedores da semi para identificar a Final

  // --- LOOP PRINCIPAL (CONSTRUÇÃO DAS FASES) ---
  for (let f = 0; f < totalFases; f++) {
      const numJogosNaFase = numConfrontosIniciais / Math.pow(2, f);
      const colunaAtual: Confronto[] = [];
      const isFinal = f === totalFases - 1;
      const isSemi = f === totalFases - 2;
      
      const rIda = baseRodada + (f * 2);
      const rVolta = rIda + 1;

      // Busca jogos desta fase
      const jogosDestaFase = partidas.filter(p => p.rodada === rIda || p.rodada === rVolta);
      
      // Agrupa Ida e Volta
      const confrontosMap = new Map<string, { ida?: Jogo, volta?: Jogo }>();
      jogosDestaFase.forEach(jogo => {
          const key = [jogo.time_casa, jogo.time_visitante].sort().join('-');
          if (!confrontosMap.has(key)) { confrontosMap.set(key, {}); }
          const entry = confrontosMap.get(key)!;
          if (jogo.rodada === rIda) { entry.ida = jogo; } else { entry.volta = jogo; }
      });

      // Transforma em array
      let confrontosArray = Array.from(confrontosMap.values());

      // --- LÓGICA ESPECIAL PARA A FINAL ---
      // Se for a fase final, precisamos distinguir a FINAL do 3º LUGAR
      if (isFinal && confrontosArray.length > 1) {
          // Tenta encontrar o jogo que tem os vencedores da semi
          const matchFinal = confrontosArray.find(c => {
              if (!c.ida) return false;
              return idsVencedoresSemi.has(c.ida.time_casa) || idsVencedoresSemi.has(c.ida.time_visitante || -1);
          });

          if (matchFinal) {
              confrontosArray = [matchFinal];
          } else {
              // Fallback: ordena por ID
              confrontosArray.sort((a, b) => (a.ida?.id || 0) - (b.ida?.id || 0));
              confrontosArray = [confrontosArray[0]]; 
          }
      } else {
          confrontosArray.sort((a, b) => (a.ida?.id || 0) - (b.ida?.id || 0));
      }

      // Preenche a Coluna
      for (let i = 0; i < numJogosNaFase; i++) {
          const dados = confrontosArray[i];
          let confronto: Confronto;

          if (dados && dados.ida) {
              const ida = dados.ida;
              const volta = dados.volta || null;
              
              // Determina Vencedor
              let vencedor = null;
              let idVencedor = null;

              if (ida.status === 'bye') {
                  vencedor = ida.casa;
                  idVencedor = ida.time_casa;
              } else if (ida.status === 'finalizado' && (!volta || volta.status === 'finalizado')) {
                  const p1 = (ida.placar_casa || 0) + (volta?.placar_visitante || 0);
                  const p2 = (ida.placar_visitante || 0) + (volta?.placar_casa || 0);
                  
                  if (p1 > p2) { vencedor = ida.casa; idVencedor = ida.time_casa; }
                  else if (p2 > p1) { vencedor = ida.visitante; idVencedor = ida.time_visitante; }
                  else { vencedor = ida.casa; idVencedor = ida.time_casa; } 
              }

              if (vencedor && idVencedor) {
                  vencedoresMap.set(`${f}-${i}`, vencedor);
                  if (isSemi) idsVencedoresSemi.add(idVencedor);
              }

              confronto = {
                  uuid: `match-${ida.id}`,
                  ida: ida,
                  volta: volta,
                  status: ida.status === 'bye' ? 'bye' : 'agendado',
                  vencedor: vencedor,
                  tipo: isFinal ? 'final' : 'padrao'
              };

          } else {
              // PLACEHOLDER (Projeção)
              let timeA_Proj = null;
              let timeB_Proj = null;

              if (f > 0) {
                  timeA_Proj = vencedoresMap.get(`${f-1}-${i*2}`);
                  timeB_Proj = vencedoresMap.get(`${f-1}-${i*2 + 1}`);
              }

              const fakeIda: any = {
                  id: 0,
                  casa: timeA_Proj ? { nome: timeA_Proj.nome, escudo: timeA_Proj.escudo } : { nome: 'A definir', escudo: '' },
                  visitante: timeB_Proj ? { nome: timeB_Proj.nome, escudo: timeB_Proj.escudo } : { nome: 'A definir', escudo: '' },
                  placar_casa: null, placar_visitante: null, status: 'tbd'
              };

              confronto = {
                  uuid: `placeholder-${f}-${i}`,
                  ida: fakeIda,
                  volta: null,
                  status: 'tbd',
                  tipo: isFinal ? 'final' : 'padrao'
              };
          }
          colunaAtual.push(confronto);
      }
      bracketColumns.push(colunaAtual);
  }

  // --- DETECÇÃO E CRIAÇÃO DO 3º LUGAR ---
  let confrontoTerceiro: Confronto | null = null;
  
  if (totalFases >= 2) { // Só existe 3º lugar se tiver pelo menos Semifinal (2 fases ou mais)
      const ultimaFaseIndex = totalFases - 1;
      const rFinalIda = baseRodada + (ultimaFaseIndex * 2);
      
      // 1. Tenta achar o jogo REAL no banco
      const idFinalBracket = bracketColumns[ultimaFaseIndex][0]?.ida?.id;
      const jogoTerceiroRaw = partidas.find(p => p.rodada === rFinalIda && p.id !== idFinalBracket);
      
      if (jogoTerceiroRaw) {
          const rFinalVolta = rFinalIda + 1;
          const volta3Place = partidas.find(p => p.rodada === rFinalVolta && 
              ((p.time_casa === jogoTerceiroRaw.time_visitante && p.time_visitante === jogoTerceiroRaw.time_casa) ||
               (p.time_casa === jogoTerceiroRaw.time_casa && p.time_visitante === jogoTerceiroRaw.time_visitante))
          );

          confrontoTerceiro = {
              uuid: `match-3rd-${jogoTerceiroRaw.id}`,
              ida: jogoTerceiroRaw,
              volta: volta3Place || null,
              status: 'agendado',
              tipo: 'terceiro'
          };
      } else {
          // 2. Se não existe jogo real, cria um PLACEHOLDER visual
          const fakeIda: any = {
              id: -99, // ID negativo para indicar fake
              casa: { nome: 'Perdedor Semi 1', escudo: '' },
              visitante: { nome: 'Perdedor Semi 2', escudo: '' },
              placar_casa: null, placar_visitante: null, status: 'tbd'
          };

          confrontoTerceiro = {
              uuid: `placeholder-3rd`,
              ida: fakeIda,
              volta: null,
              status: 'tbd',
              tipo: 'terceiro'
          };
      }
  }

  // --- CONTROLES DE DRAG & SCROLL ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
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
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeftState - walk;
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
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', width: '200%', height: '200%' }}></div>

        <div className="flex min-h-full min-w-max items-center p-20"> 
            {/* ÁRVORE PRINCIPAL */}
            {bracketColumns.map((confrontos, colIndex) => {
                const phasesLeft = totalFases - colIndex;
                let titulo = `${colIndex + 1}ª Fase`;
                if (phasesLeft === 1) titulo = "🏆 GRANDE FINAL";
                else if (phasesLeft === 2) titulo = "SEMIFINAL";
                else if (phasesLeft === 3) titulo = "QUARTAS";
                else if (phasesLeft === 4) titulo = "OITAVAS";

                const power = Math.pow(2, colIndex);
                const gap = (power * GAP_VERT_BASE) + ((power - 1) * CARD_HEIGHT);
                
                return (
                    <div key={colIndex} className="flex flex-col justify-center relative" style={{ marginRight: GAP_HORIZ }}>
                        <div className="absolute -top-10 w-full text-center pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-[#050505]/90 px-3 py-1 rounded border border-gray-800 whitespace-nowrap">
                                {titulo}
                            </span>
                        </div>

                        <div className="flex flex-col" style={{ gap: gap }}>
                            {confrontos.map((conf, idx) => (
                                <div key={conf.uuid} className="relative flex items-center">
                                    <BracketCard confronto={conf} />
                                    {/* Linhas de conexão */}
                                    {colIndex < totalFases - 1 && (
                                        <>
                                            <div className="absolute -right-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]"></div>
                                            {idx % 2 === 0 && (
                                                <div 
                                                    className="absolute -right-[40px] border-r-2 border-[#333] rounded-tr-none rounded-br-none"
                                                    style={{ top: '50%', height: `${gap + CARD_HEIGHT}px`, width: '2px' }}
                                                />
                                            )}
                                        </>
                                    )}
                                    {colIndex > 0 && <div className="absolute -left-[40px] top-1/2 w-[40px] h-[2px] bg-[#333]"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

            {/* --- BLOCO EXTRA: 3º LUGAR --- */}
            {confrontoTerceiro && (
                <div className="flex flex-col gap-4 relative justify-center border-l-2 border-gray-800 border-dashed pl-12 ml-4 opacity-90 h-[200px] mt-20">
                    <h3 className="text-center text-orange-500 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 bg-[#050505] border border-orange-500/30 px-3 py-1 rounded-full shadow-lg mb-2">
                        <Medal size={12} /> 3º Lugar
                    </h3>
                    <div className="flex flex-col justify-center">
                        <BracketCard confronto={confrontoTerceiro} />
                    </div>
                </div>
            )}
        </div>
    </div>
  )
}

// --- CARD DE JOGO ---
function BracketCard({ confronto }: { confronto: Confronto }) {
    const { ida, volta, status, tipo } = confronto;
    const isFinal = tipo === 'final';
    const isTerceiro = tipo === 'terceiro';

    if (status === 'bye' && ida) {
        return (
            <div className="bg-[#0f0f0f] border-l-4 border-l-green-600 border-y border-r border-gray-800 rounded-lg shadow-lg flex flex-col justify-center px-4 relative" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                 <div className="flex items-center gap-3">
                    <img src={ida.casa.escudo} className="w-8 h-8 object-contain" alt={ida.casa.nome} />
                    <div>
                        <p className="text-white font-bold text-xs truncate w-40">{ida.casa.nome}</p>
                        <span className="text-[9px] text-green-500 font-bold uppercase">Avança Direto</span>
                    </div>
                 </div>
            </div>
        )
    }

    const isPlaceholder = status === 'tbd';
    const jogoDados = ida; 

    if (!jogoDados) {
         return (
            <div className="flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-gray-800 rounded-lg opacity-60" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Aguardando</span>
            </div>
        )
    }

    const casa = jogoDados.casa;
    const visitante = jogoDados.visitante;
    
    const p1_ida = jogoDados.placar_casa ?? (isPlaceholder ? null : 0);
    const p2_ida = jogoDados.placar_visitante ?? (isPlaceholder ? null : 0);
    const p1_volta = volta?.placar_visitante ?? (isPlaceholder ? null : 0); 
    const p2_volta = volta?.placar_casa ?? (isPlaceholder ? null : 0);      

    const total1 = !isPlaceholder ? (p1_ida || 0) + (p1_volta || 0) : null;
    const total2 = !isPlaceholder ? (p2_ida || 0) + (p2_volta || 0) : null;
    
    const finalizado = !isPlaceholder && jogoDados.status === 'finalizado' && (!volta || volta.status === 'finalizado');
    
    const w1 = finalizado && (total1 !== null && total2 !== null) && total1 > total2;
    const w2 = finalizado && (total1 !== null && total2 !== null) && total2 > total1;
    const isPenalts = finalizado && total1 === total2;

    return (
        <div className={`
             border rounded-lg shadow-lg overflow-hidden flex flex-col justify-center relative z-10 transition-all
             ${isPlaceholder ? 'bg-[#0a0a0a] border-gray-800 border-dashed opacity-80' : 'bg-[#121212] border-gray-800 hover:border-gray-600'}
             ${isFinal ? 'border-yellow-500/50 shadow-yellow-500/10 scale-105 ring-1 ring-yellow-500/20' : ''}
             ${isTerceiro ? 'border-orange-500/50 shadow-orange-500/10' : ''}
             `}
             style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            
            {/* TIME 1 */}
            <div className={`flex justify-between items-center px-3 py-1.5 border-b border-gray-800/40 ${finalizado && !w1 && !isPenalts ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-2 w-[60%] overflow-hidden">
                    {casa.escudo ? <img src={casa.escudo} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-gray-800 rounded-full"></div>}
                    <span className={`text-[11px] font-bold truncate ${w1 ? 'text-green-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'}`}>{casa.nome}</span>
                </div>
                <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
                    {!isPlaceholder && (
                        <>
                            <span className="w-4 text-center">{p1_ida}</span>
                            {volta && <span className="text-[9px] text-gray-700">+</span>}
                            {volta && <span className="w-4 text-center">{p1_volta}</span>}
                            <div className={`ml-2 w-6 h-5 flex items-center justify-center text-[11px] font-bold text-white rounded ${w1 ? 'bg-green-700' : 'bg-[#222]'}`}>{total1}</div>
                        </>
                    )}
                </div>
            </div>

            {/* TIME 2 */}
            <div className={`flex justify-between items-center px-3 py-1.5 ${finalizado && !w2 && !isPenalts ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-2 w-[60%] overflow-hidden">
                    {visitante?.escudo ? <img src={visitante.escudo} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-gray-800 rounded-full"></div>}
                    <span className={`text-[11px] font-bold truncate ${w2 ? 'text-green-400' : isPlaceholder ? 'text-gray-600' : 'text-gray-300'}`}>{visitante?.nome || 'A definir'}</span>
                </div>
                <div className="flex items-center justify-end gap-1 w-[40%] font-mono text-xs text-gray-500">
                    {!isPlaceholder && (
                        <>
                            <span className="w-4 text-center">{p2_ida}</span>
                            {volta && <span className="text-[9px] text-gray-700">+</span>}
                            {volta && <span className="w-4 text-center">{p2_volta}</span>}
                            <div className={`ml-2 w-6 h-5 flex items-center justify-center text-[11px] font-bold text-white rounded ${w2 ? 'bg-green-700' : 'bg-[#222]'}`}>{total2}</div>
                        </>
                    )}
                </div>
            </div>

            {/* ÍCONES E BADGES */}
            {isPenalts && <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-yellow-600 text-black text-[8px] font-black px-1.5 py-0.5 rounded z-20 shadow-sm">PEN</div>}
            {isFinal && <div className="absolute top-2 right-2 text-yellow-500"><Trophy size={14} /></div>}
        </div>
    )
}