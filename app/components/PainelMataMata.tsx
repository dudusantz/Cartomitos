'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  atualizarRodadaMataMata, avancarFaseMataMata, 
  listarPartidas, excluirMataMata 
} from '../actions'
import MataMataBracket from './MataMataBracket'
import ModalConfirmacao from './ModalConfirmacao'
// CORREÇÃO: O caminho do arquivo estava incorreto ('./admin/c')
import SorteioMataMata from './admin/SorteioMataMata' 

interface Props {
  campeonatoId: number
  rodadasCorte: number 
}

export default function PainelMataMata({ campeonatoId, rodadasCorte }: Props) {
  const [partidas, setPartidas] = useState<any[]>([])
  const [faseAtual, setFaseAtual] = useState('1')
  const [rodadaIda, setRodadaIda] = useState('')
  const [rodadaVolta, setRodadaVolta] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<any>({})
  
  // Estado para controlar se mostra o sorteio ou as chaves
  const [modoSorteio, setModoSorteio] = useState(false)

  useEffect(() => { carregarDados() }, [campeonatoId])

  async function carregarDados() {
    const todosJogos = await listarPartidas(campeonatoId)
    const jogosMataMata = todosJogos
      .filter((p: any) => p.rodada > rodadasCorte)
      .map((p: any) => ({ ...p, rodada: p.rodada - rodadasCorte }))
    
    setPartidas(jogosMataMata)
    
    // Se não tem jogos, ativa o modo sorteio
    if (jogosMataMata.length === 0) {
        setModoSorteio(true)
    } else {
        setModoSorteio(false)
    }
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
    setModalConfig({ titulo: "Avançar", mensagem: "Fechar confrontos?", onConfirm: async () => {
        const res = await avancarFaseMataMata(campeonatoId, rodadaReal)
        if(res.success) { toast.success(res.msg); carregarDados(); } else toast.error(res.msg)
        setModalOpen(false)
    }, tipo: 'sucesso' })
    setModalOpen(true)
  }

  async function handleLimpar() {
    setModalConfig({ titulo: "Limpar", mensagem: "Apagar todo o mata-mata?", onConfirm: async () => {
        const res = await excluirMataMata(campeonatoId, rodadasCorte + 1)
        if(res.success) { 
            toast.success(res.msg); 
            carregarDados(); // Isso vai ativar o modoSorteio automaticamente
        }
        setModalOpen(false)
    }, tipo: 'perigo' })
    setModalOpen(true)
  }

  // --- SE ESTIVER NO MODO SORTEIO ---
  if (modoSorteio) {
      return (
        <div className="animate-fadeIn">
            {/* Este é o cabeçalho que você queria manter */}
            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 mb-6 text-center">
                <h3 className="text-white font-bold mb-2">Chaveamento Pendente</h3>
                <p className="text-gray-500 text-xs mb-4">Defina os potes abaixo para sortear os confrontos.</p>
            </div>
            
            {/* Componente de Sorteio com Potes (agora limpo, sem bordas extras) */}
            <SorteioMataMata campeonatoId={campeonatoId} onSucesso={carregarDados} />
        </div>
      )
  }

  // --- SE JÁ TIVER JOGOS (PAINEL DE CONTROLE) ---
  return (
    <div className="animate-fadeIn space-y-8">
        <ModalConfirmacao isOpen={modalOpen} {...modalConfig} onCancel={() => setModalOpen(false)} />
        
        <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="text-gray-500 text-xs font-bold uppercase block mb-2">Fase (Ida)</label>
                <select className="w-full bg-black border border-gray-700 text-white p-3 rounded" value={faseAtual} onChange={e => setFaseAtual(e.target.value)}>
                    {fasesIda.map(f => (
                        <option key={f} value={f}>{isJogoUnico(f) ? `Rodada ${f} (Único)` : `Rodada ${f} (Ida) & ${f+1} (Volta)`}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex gap-2">
                <input type="number" placeholder="R. Ida" className="w-20 bg-black border border-gray-700 text-white p-3 rounded text-center" value={rodadaIda} onChange={e => setRodadaIda(e.target.value)} />
                {!isJogoUnico(Number(faseAtual)) && (
                    <input type="number" placeholder="R. Volta" className="w-20 bg-black border border-gray-700 text-white p-3 rounded text-center" value={rodadaVolta} onChange={e => setRodadaVolta(e.target.value)} />
                )}
                <button onClick={handleAtualizar} disabled={loading} className="bg-blue-600 text-white px-4 rounded font-bold uppercase text-xs hover:bg-blue-500 transition">{loading ? '...' : 'Atualizar'}</button>
            </div>

            <button onClick={handleAvancar} className="bg-green-600 text-white px-4 py-3 rounded font-bold uppercase text-xs hover:bg-green-500 transition shadow-lg shadow-green-900/20">Avançar ➜</button>
            <button onClick={handleLimpar} className="text-red-500 border border-red-900 px-4 py-3 rounded font-bold uppercase text-xs hover:bg-red-900/20 transition">Reset</button>
        </div>

        <div className="overflow-x-auto pb-10">
            <MataMataBracket partidas={partidas} />
        </div>
    </div>
  )
}