'use client'

import { salvarHistoricoTemporada } from '../actions'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ModalSalvarHistorico from './ModalSalvarHistorico' // <--- Importe o novo modal

export default function BotaoSalvarRanking({ ranking }: { ranking: any[] }) {
    const [loading, setLoading] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);

    async function executarSalvamento(anoEscolhido: number) {
        setModalAberto(false); // Fecha o modal
        
        if (!ranking || ranking.length === 0) return;
        if (isNaN(anoEscolhido) || anoEscolhido < 2000 || anoEscolhido > 2100) {
            return toast.error("Ano inválido!");
        }

        setLoading(true);
        const res = await salvarHistoricoTemporada(ranking, anoEscolhido);
        setLoading(false);

        if (res.success) {
            toast.success(res.msg, { duration: 5000 });
        } else {
            toast.error(res.msg);
        }
    }

    if (!ranking || ranking.length === 0) return null;

    const campeaoNome = ranking[0]?.time || 'Desconhecido';

    return (
        <>
            <button 
            onClick={() => setModalAberto(true)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50"
        >
            {loading ? 'Salvando...' : '💾 Salvar Ranking'}
        </button>

            {/* Componente do Modal */}
            <ModalSalvarHistorico 
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                onConfirm={executarSalvamento}
                campeao={campeaoNome}
                totalTimes={ranking.length}
            />
        </>
    )
}