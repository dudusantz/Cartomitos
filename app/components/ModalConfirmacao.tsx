'use client'

interface ModalConfirmacaoProps {
  isOpen: boolean;
  titulo: string;
  mensagem: string;
  onConfirm: () => void;
  onCancel: () => void;
  tipo?: 'perigo' | 'info' | 'sucesso'; // Para mudar a cor do botão
}

export default function ModalConfirmacao({ 
  isOpen, 
  titulo, 
  mensagem, 
  onConfirm, 
  onCancel,
  tipo = 'info' 
}: ModalConfirmacaoProps) {
  
  if (!isOpen) return null;

  // Cores dinâmicas baseadas no tipo
  const corBotao = tipo === 'perigo' ? 'bg-red-600 hover:bg-red-500' : 
                   tipo === 'sucesso' ? 'bg-green-600 hover:bg-green-500' : 
                   'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/70 animate-fadeIn">
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {tipo === 'perigo' && '⚠️'} 
            {tipo === 'sucesso' && '✅'} 
            {tipo === 'info' && 'ℹ️'} 
            {titulo}
          </h3>
        </div>

        {/* Corpo */}
        <div className="p-6 text-gray-300 text-sm leading-relaxed">
          {mensagem}
        </div>

        {/* Rodapé (Botões) */}
        <div className="p-4 bg-black/40 flex justify-end gap-3 border-t border-gray-800">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition text-xs uppercase tracking-wider"
          >
            Cancelar
          </button>
          
          <button 
            onClick={onConfirm}
            className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition text-xs uppercase tracking-wider ${corBotao}`}
          >
            Confirmar
          </button>
        </div>

      </div>
    </div>
  )
}