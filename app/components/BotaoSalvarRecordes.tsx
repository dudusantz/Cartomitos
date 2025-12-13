'use client';

import { useState, useTransition } from 'react';
import { salvarHistoricoRecordes } from '../actions';
import { Trophy, Save, X, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface BotaoSalvarRecordesProps {
  dados: any[];
}

export default function BotaoSalvarRecordes({ dados }: BotaoSalvarRecordesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  const handleSalvar = () => {
    if (!dados || dados.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Não há recordes para salvar.' });
      return;
    }

    startTransition(async () => {
      // Aqui forçamos o título "Maiores Pontuações"
      const res = await salvarHistoricoRecordes(dados, ano, "Maiores Pontuações");
      
      if (res.success) {
        setMensagem({ tipo: 'sucesso', texto: res.msg });
        setTimeout(() => {
            setMensagem(null);
            setIsOpen(false);
        }, 2000);
      } else {
        setMensagem({ tipo: 'erro', texto: res.msg });
      }
    });
  };

  return (
    <>
      {/* --- BOTÃO DE ACIONAMENTO --- */}
      <button 
        onClick={() => setIsOpen(true)} 
        className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 hover:text-yellow-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 backdrop-blur-sm"
      >
        <Save size={14} /> 
        Salvar Recordes
      </button>

      {/* --- MODAL (DIALOG) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isPending && setIsOpen(false)}
          ></div>

          {/* Conteúdo do Modal */}
          <div className="bg-[#121212] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="bg-[#181818] px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Trophy size={16} className="text-yellow-500" />
                </div>
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Salvar Histórico</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4">
                <p className="text-yellow-200/80 text-xs leading-relaxed">
                  <AlertCircle size={14} className="inline mr-1.5 -mt-0.5" />
                  Você está prestes a salvar a lista atual de pontuações no banco de dados histórico.
                  Isso ficará visível na página de <strong>Histórico</strong> sob o título <strong>"Maiores Pontuações"</strong>.
                </p>
              </div>

              {/* Input de Ano */}
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} />
                    Ano da Temporada
                </label>
                <input 
                  type="number" 
                  value={ano} 
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-colors font-mono text-sm"
                  placeholder="Ex: 2025"
                  disabled={isPending}
                />
              </div>

              {/* Input de Título (Desabilitado/Visual apenas, já que é fixo) */}
              <div className="space-y-2 opacity-60 pointer-events-none">
                 <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">Título do Registro</label>
                 <div className="w-full bg-[#050505] border border-white/5 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm">
                    Maiores Pontuações
                 </div>
              </div>

            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-4 bg-[#151515] border-t border-white/5 flex flex-col gap-3">
                {/* Mensagem de Feedback */}
                {mensagem && (
                    <div className={`text-xs text-center font-bold py-2 rounded ${mensagem.tipo === 'sucesso' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {mensagem.texto}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsOpen(false)}
                        disabled={isPending}
                        className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSalvar}
                        disabled={isPending}
                        className="flex-1 px-4 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <span className="animate-pulse">Salvando...</span>
                        ) : (
                            <>
                                <CheckCircle2 size={16} /> Confirmar
                            </>
                        )}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}