'use client'

import { salvarHistorico } from '../actions'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ModalSalvarHistorico from './ModalSalvarHistorico'
import { Save } from 'lucide-react'

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
        
        // Salva usando a Server Action
        const res = await salvarHistorico(ranking, anoEscolhido, tipo, tituloPadrao);
        
        setLoading(false);

        if (res.success) {
            toast.success(res.msg, { duration: 5000, style: { background: '#121212', color: '#fff', border: '1px solid #333' } });
        } else {
            toast.error(res.msg, { style: { background: '#121212', color: '#fff', border: '1px solid #333' } });
        }
    }

    if (!ranking || ranking.length === 0) return null;

    const campeaoNome = ranking[0]?.time || 'Desconhecido';

    return (
        <>
            <button 
                onClick={() => setModalAberto(true)}
                disabled={loading}
                className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 hover:text-yellow-400 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-sm group disabled:opacity-50"
            >
                <Save size={16} className="group-hover:scale-110 transition-transform" />
                {loading ? 'Salvando...' : 'Salvar Ranking da Temporada'}
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