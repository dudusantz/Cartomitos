'use client'

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
};

// --- CONFIGURAÇÕES VISUAIS ---
// Card mais compacto para parecer chaveamento profissional
const CARD_HEIGHT = 70; 
const BASE_GAP = 20;     
const ROW_HEIGHT = CARD_HEIGHT + BASE_GAP;

export default function MataMataBracket({ partidas }: { partidas: Jogo[] }) {
  
  // 1. Calcular estrutura
  const jogosFase1 = partidas.filter(p => p.rodada === 1);
  const countByes = jogosFase1.filter(j => j.status === 'bye').length;
  const countJogosNormais = jogosFase1.filter(j => j.status !== 'bye').length / 2;
  const totalConfrontosIniciais = countByes + countJogosNormais;
  
  let slotsBase = 2;
  while (slotsBase < totalConfrontosIniciais) slotsBase *= 2;
  
  const numFases = Math.log2(slotsBase) + 1;
  const fasesParaRenderizar = Array.from({ length: Math.max(numFases, 1) }, (_, i) => i + 1);

  return (
    <div className="flex gap-12 overflow-x-auto pb-20 pt-10 px-8 custom-scrollbar items-start min-h-[600px]">
      {fasesParaRenderizar.map((fase, faseIndex) => {
        
        // Cálculos de geometria
        const power = Math.pow(2, faseIndex);
        const dynamicGap = (power * ROW_HEIGHT) - CARD_HEIGHT;
        const marginTop = (power - 1) * (ROW_HEIGHT / 2);

        // Buscar jogos
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
        
        // Placeholders
        if (listaConfrontos.length < slotsEsperados) {
            const faltam = slotsEsperados - listaConfrontos.length;
            const placeholders = Array(faltam).fill(null).map((_, i) => ({
                ida: null, volta: null, isBye: false, idFake: `futuro-${fase}-${i}`
            }));
            listaConfrontos = [...listaConfrontos, ...placeholders];
        }

        // Nome da Fase
        let nomeFase = `${fase}ª Fase`;
        if (slotsEsperados === 1) nomeFase = "🏆 Final";
        else if (slotsEsperados === 2) nomeFase = "Semifinal";
        else if (slotsEsperados === 4) nomeFase = "Quartas";

        return (
          <div key={fase} className="flex flex-col min-w-[260px] relative">
            <h3 className="text-center text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-6">
              {nomeFase}
            </h3>

            <div 
                className="flex flex-col"
                style={{ marginTop: `${marginTop}px`, gap: `${dynamicGap}px` }}
            >
              {listaConfrontos.map((conf, idx) => (
                <div key={idx} className="relative flex items-center group">
                   <div style={{ height: `${CARD_HEIGHT}px` }} className="w-full relative z-10">
                       <CardConfrontoVisual confronto={conf} />
                   </div>
                   
                   {/* LINHAS CONECTORAS (Árvore) */}
                   {faseIndex < numFases && (
                     <>
                        {/* Linha horizontal saindo */}
                        <div className="absolute -right-6 top-1/2 w-6 h-[1px] bg-gray-600"></div>
                        
                        {/* Haste Vertical (apenas nos pares) */}
                        {idx % 2 === 0 && (
                            <div 
                                className="absolute -right-6 border-r border-gray-600 rounded-tr-none rounded-br-none"
                                style={{ 
                                    top: '50%', 
                                    height: `${dynamicGap + CARD_HEIGHT}px`, // Altura exata até o centro do próximo
                                    width: '1px' // Espessura fina
                                }}
                            ></div>
                        )}
                        
                        {/* Linha horizontal entrando */}
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
  );
}

// === CARD COMPACTO E ELEGANTE ===
function CardConfrontoVisual({ confronto }: { confronto: Confronto }) {
  const { ida, volta, isBye } = confronto;

  // Placeholder
  if (!ida && !isBye) {
      return (
        <div className="w-full h-full bg-[#111] border border-gray-800 border-dashed rounded flex items-center justify-center">
            <span className="text-gray-700 text-[9px] font-bold">A DEFINIR</span>
        </div>
      )
  }

  // Bye (Classificado)
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

  // Jogo Real
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
          
          {/* TIME A (Topo) */}
          <div className={`flex items-center h-1/2 px-3 border-b border-gray-800/50 ${isFinalizado && !winnerA ? 'opacity-40' : ''}`}>
             <img src={ida.casa.escudo} className="w-5 h-5 object-contain mr-2" />
             <span className={`text-[11px] font-bold truncate flex-1 ${winnerA && isFinalizado ? 'text-cartola-gold' : 'text-gray-300'}`}>
                {ida.casa.nome}
             </span>
             {/* Placar */}
             <div className="flex items-center gap-2 text-[10px] font-mono">
                {/* Parciais sutis */}
                <span className="text-gray-600 w-4 text-right">{p1c}</span>
                {volta && <span className="text-gray-600 w-4 text-right">{p2v}</span>}
                {/* Total destacado */}
                <span className={`w-6 text-center font-bold ${winnerA && isFinalizado ? 'text-white bg-green-600 rounded px-1' : 'text-gray-400 bg-black/40 rounded px-1'}`}>
                    {totalA}
                </span>
             </div>
          </div>

          {/* TIME B (Baixo) */}
          <div className={`flex items-center h-1/2 px-3 ${isFinalizado && !winnerB ? 'opacity-40' : ''}`}>
             <img src={ida.visitante?.escudo} className="w-5 h-5 object-contain mr-2" />
             <span className={`text-[11px] font-bold truncate flex-1 ${winnerB && isFinalizado ? 'text-cartola-gold' : 'text-gray-300'}`}>
                {ida.visitante?.nome}
             </span>
             {/* Placar */}
             <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-gray-600 w-4 text-right">{p1v}</span>
                {volta && <span className="text-gray-600 w-4 text-right">{p2c}</span>}
                <span className={`w-6 text-center font-bold ${winnerB && isFinalizado ? 'text-white bg-green-600 rounded px-1' : 'text-gray-400 bg-black/40 rounded px-1'}`}>
                    {totalB}
                </span>
             </div>
          </div>

        </div>
      );
  }
  return null;
}