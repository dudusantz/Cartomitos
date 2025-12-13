'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  atualizarRodadaMataMata, avancarFaseMataMata, 
  listarPartidas, excluirMataMata 
} from '../actions'
import MataMataBracket from './MataMataBracket'
import ModalConfirmacao from './ModalConfirmacao'
import SorteioMataMata from './admin/SorteioMataMata'
import BotaoFinalizarCampeonato from './BotaoFinalizarCampeonato'
import { RefreshCw, PlayCircle, Trash2, Trophy } from 'lucide-react'

interface Props {
  campeonatoId: number
  rodadasCorte: number
  bloquearGerador?: boolean 
}

export default function PainelMataMata({ campeonatoId, rodadasCorte, bloquearGerador = false }: Props) {
  const [partidas, setPartidas] = useState<any[]>([])
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  
  const [modoSorteio, setModoSorteio] = useState(false)

  useEffect(() => { carregarDados() }, [campeonatoId])

  async function carregarDados() {
    setLoading(true)
    const todosJogos = await listarPartidas(campeonatoId)
    
    // Filtra e normaliza as rodadas (R21 vira R1 para o bracket)
    const jogosMataMata = todosJogos
      .filter((p: any) => p.rodada > rodadasCorte)
      .map((p: any) => ({ ...p, rodada: p.rodada - rodadasCorte }))
    
    setPartidas(jogosMataMata)
    
    if (jogosMataMata.length === 0) {
        setModoSorteio(!bloquearGerador)
    } else {
        setModoSorteio(false)
    }
    setLoading(false)
  }

  const fasesDisponiveis = [...new Set(partidas.map(p => p.rodada))].sort((a, b) => a - b)
  const fasesIda = fasesDisponiveis.filter(r => r % 2 !== 0) 
  const isJogoUnico = (fase: number) => !fasesDisponiveis.includes(fase + 1)

  async function handleAtualizar() {
    const f = Number(faseAtual)
    const unico = isJogoUnico(f)
    if(!rodadaIda && (!unico && !rodadaVolta)) return toast.error("Preencha as rodadas.")
    
    setLoading(true)
    const rodadaReal = f + rodadasCorte
    const volta = unico ? 0 : Number(rodadaVolta)
    
    const res = await atualizarRodadaMataMata(campeonatoId, rodadaReal, Number(rodadaIda), volta)
    if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
    setLoading(false)
  }

  async function handleAvancar() {
    const rodadaReal = Number(faseAtual) + rodadasCorte
    setModalConfig({ titulo: "Avançar Fase", mensagem: "Deseja verificar os resultados e avançar para a próxima fase?", onConfirm: async () => {
        const res = await avancarFaseMataMata(campeonatoId, rodadaReal)
        if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
        setModalOpen(false)
    }, tipo: 'sucesso' })
    setModalOpen(true)
  }

  async function handleLimpar() {
    setModalConfig({ titulo: "Limpar Chaveamento", mensagem: "Isso apagará todos os jogos do mata-mata atual. Tem certeza?", onConfirm: async () => {
        const res = await excluirMataMata(campeonatoId, rodadasCorte + 1)
        if(res.success) { 
            toast.success(res.msg); 
            carregarDados(); 
        }
        setModalOpen(false)
    }, tipo: 'perigo' })
    setModalOpen(true)
  }

  if (loading && partidas.length === 0) return <div className="text-center py-10 text-gray-500 animate-pulse">Carregando chaveamento...</div>

  // --- CASOS DE EXIBIÇÃO ---
  
  if (partidas.length === 0 && bloquearGerador) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl bg-white/5 animate-fadeIn">
            <div className="text-4xl mb-4 text-gray-700"><Trophy size={48} /></div>
            <h3 className="text-white font-bold text-lg">Aguardando Fase de Grupos</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-md text-center">
                O chaveamento aparecerá aqui automaticamente após você clicar em "Gerar Chave Final" no painel acima.
            </p>
        </div>
      )
  }

  if (modoSorteio) {
      return (
        <div className="animate-fadeIn">
            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 mb-6 text-center">
                <h3 className="text-white font-bold mb-2">Chaveamento Pendente</h3>
                <p className="text-gray-500 text-xs mb-4">Defina os potes abaixo para sortear os confrontos.</p>
            </div>
            <SorteioMataMata campeonatoId={campeonatoId} onSucesso={carregarDados} />
        </div>
      )
  }

  return (
    <div className="animate-fadeIn space-y-8">
        <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
        
        <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 flex flex-wrap gap-4 items-end shadow-lg">
            <div className="flex-1 min-w-[200px]">
                <label className="text-gray-500 text-xs font-bold uppercase block mb-2">Fase (Ida)</label>
                <select className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-blue-600 transition" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                    {fasesIda.map(f => (
                        <option key={f} value={f}>{isJogoUnico(f) ? `Rodada ${f} (Único)` : `Rodada ${f} (Ida) & ${f+1} (Volta)`}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex gap-2">
                <div className="flex flex-col">
                    <label className="text-[9px] text-gray-500 font-bold uppercase mb-1 ml-1">Ida</label>
                    <input type="number" placeholder="00" className="w-16 bg-black border border-gray-700 text-white p-3 rounded-lg text-center outline-none focus:border-blue-600 transition" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                </div>
                {!isJogoUnico(Number(faseAtual)) && (
                    <div className="flex flex-col">
                        <label className="text-[9px] text-gray-500 font-bold uppercase mb-1 ml-1">Volta</label>
                        <input type="number" placeholder="00" className="w-16 bg-black border border-gray-700 text-white p-3 rounded-lg text-center outline-none focus:border-blue-600 transition" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                    </div>
                )}
                <div className="flex items-end">
                    <button onClick={handleAtualizar} disabled={loading} className="h-[46px] bg-blue-600 text-white px-4 rounded-lg font-bold uppercase text-xs hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 flex items-center gap-2">
                        {loading ? <RefreshCw className="animate-spin w-4 h-4"/> : <RefreshCw className="w-4 h-4" />} Atualizar
                    </button>
                </div>
            </div>

            <div className="flex gap-2 ml-auto items-center">
                <button onClick={handleAvancar} className="h-[46px] bg-green-600 text-white px-5 rounded-lg font-bold uppercase text-xs hover:bg-green-500 transition shadow-lg shadow-green-900/20 flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" /> Avançar
                </button>
                <button onClick={handleLimpar} className="h-[46px] text-red-500 border border-red-900/30 bg-red-500/5 px-4 rounded-lg font-bold uppercase text-xs hover:bg-red-500 hover:text-white transition flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Reset
                </button>
            </div>
        </div>

        <div className="overflow-x-auto pb-10 custom-scrollbar">
            <MataMataBracket partidas={partidas} />
        </div>
    </div>
  )
}