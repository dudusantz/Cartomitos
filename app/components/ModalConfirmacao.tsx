'use client'

interface ModalConfirmacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    titulo: string;
    descricao: string;
    textoBotao?: string;
    corBotao?: string; // 'red' | 'blue' | 'green'
}

export function ModalConfirmacao({ 
    isOpen, 
    onClose, 
    onConfirm, 
    titulo, 
    descricao, 
    textoBotao = "Confirmar",
    corBotao = "blue"
}: ModalConfirmacaoProps) {
    if (!isOpen) return null;

    // Cores dos botões de ação (Mantivemos vibrantes para contraste)
    const colorClasses = {
        red: "bg-red-600 hover:bg-red-700 shadow-red-900/20",
        blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20",
        green: "bg-green-600 hover:bg-green-700 shadow-green-900/20",
    };

    const btnClass = colorClasses[corBotao as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Escuro com Blur (Fundo) */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* Conteúdo do Modal (Dark Theme) */}
            <div className="relative bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-scaleIn">
                <div className="flex flex-col items-center text-center">
                    
                    {/* Ícone com fundo escuro translúcido */}
                    <div className="mb-5 p-4 bg-slate-800/50 rounded-full border border-slate-700">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>

                    {/* Título Branco */}
                    <h3 className="text-xl font-bold text-white mb-3">
                        {titulo}
                    </h3>
                    
                    {/* Descrição Cinza Claro */}
                    <p className="text-slate-300 mb-8 text-sm leading-relaxed">
                        {descricao}
                    </p>

                    {/* Botões */}
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-medium transition-colors duration-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-bold shadow-lg transition-all transform active:scale-95 ${btnClass}`}
                        >
                            {textoBotao}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}