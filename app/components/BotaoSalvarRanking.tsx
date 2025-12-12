'use client'

import { salvarHistorico } from '../actions'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ModalSalvarHistorico from './ModalSalvarHistorico'

interface BotaoProps {
  ranking: any[];
  tipo?: 'ranking' | 'recordes';
  tituloPadrao?: string;
}

export default function BotaoSalvarRanking({ 
  ranking, 
  tipo = 'ranking', 
  tituloPadrao = 'Ranking Geral' 
}: BotaoProps) {
    
    const [loading, setLoading] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);

    async function executarSalvamento(anoEscolhido: number) {
        setModalAberto(false);
        if (!ranking || ranking.length === 0) return;

        setLoading(true);
        
        // ENVIA: DADOS, ANO, TIPO, TITULO
        const res = await salvarHistorico(ranking, anoEscolhido, tipo, tituloPadrao);
        
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
                {loading ? 'Salvando...' : '💾 Salvar Histórico'}
            </button>

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