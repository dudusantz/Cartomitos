'use client'

interface ModalConfirmacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    titulo: string;
    descricao: string;
    textoBotao?: string;
    corBotao?: string; // 'red' | 'blue' | 'green' | 'yellow'
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
        red: "bg-red-600 hover:bg-red-700 shadow-red-900/20 text-white",
        blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 text-white",
        green: "bg-green-600 hover:bg-green-700 shadow-green-900/20 text-white",
        yellow: "bg-yellow-500 hover:bg-yellow-400 shadow-yellow-900/20 text-black",
    };

    const btnClass = colorClasses[corBotao as keyof typeof colorClasses] || colorClasses.blue;
    const iconClass = corBotao === 'yellow' ? 'text-yellow-500' : 'text-blue-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#141614] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-all animate-scaleIn">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-5 rounded-xl border border-white/[0.08] bg-[#0e100e] p-3.5">
                        <svg className={`w-8 h-8 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>

                    <h3 className="mb-3 text-xl font-bold text-white">
                        {titulo}
                    </h3>
                    
                    <p className="mb-7 text-sm leading-relaxed text-gray-400">
                        {descricao}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 font-medium text-gray-300 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-bold shadow-lg transition-all transform active:scale-95 ${btnClass}`}
                        >
                            {textoBotao}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
