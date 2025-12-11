'use client'

import { useState, useEffect } from 'react'
import { listarTimesDoCampeonato, gerarMataMataInteligente } from '../../actions'
import toast from 'react-hot-toast'

interface Props {
  campeonatoId: number
  onSucesso: () => void
}

export default function SorteioMataMata({ campeonatoId, onSucesso }: Props) {
  const [timesOrdenados, setTimesOrdenados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
        const dados = await listarTimesDoCampeonato(campeonatoId)
        // Inicializa a lista. Se já tiver pontuação (ex: vindo de pontos corridos), 
        // idealmente viria ordenado. Aqui assumimos a ordem que o banco entrega ou alfabética.
        setTimesOrdenados(dados)
    }
    load()
  }, [campeonatoId])

  // Função para mover os times na lista (Definir Seeds)
  function moverTime(index: number, direcao: 'cima' | 'baixo') {
      if (direcao === 'cima' && index === 0) return;
      if (direcao === 'baixo' && index === timesOrdenados.length - 1) return;

      const novaLista = [...timesOrdenados];
      const indexTroca = direcao === 'cima' ? index - 1 : index + 1;
      
      const temp = novaLista[index];
      novaLista[index] = novaLista[indexTroca];
      novaLista[indexTroca] = temp;

      setTimesOrdenados(novaLista);
  }

  async function handleGerarConfrontos() {
      if (timesOrdenados.length < 2) return toast.error("É necessário pelo menos 2 times.");
      
      setLoading(true)
      
      // Extrai apenas os IDs na ordem definida visualmente (Seed 1, Seed 2, ...)
      const seeds = timesOrdenados.map(t => t.time_id)

      // Chama a função passando a ordem EXATA (aleatorio = false)
      const res = await gerarMataMataInteligente(campeonatoId, seeds, false)
      
      if (res.success) {
          toast.success("Mata-mata gerado por Seed com sucesso!")
          onSucesso()
      } else {
          toast.error(res.msg)
      }
      setLoading(false)
  }

  return (
    <div className="w-full mt-4 bg-[#121212] border border-gray-800 rounded-2xl p-6">
        <div className="mb-6 text-center">
            <h3 className="text-white font-bold text-lg mb-1">Definição de Seeds (Ranking)</h3>
            <p className="text-gray-500 text-xs">
                Ordene os times abaixo. O 1º da lista é o <strong>Seed #1</strong> (Melhor campanha). <br/>
                Em chaves incompletas, os melhores seeds avançam direto (BYE).
            </p>
        </div>

        {/* Lista de Ordenação */}
        <div className="space-y-2 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {timesOrdenados.map((t, idx) => (
                <div key={t.time_id} className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-xl border border-gray-800 hover:border-gray-600 transition group">
                    <div className="flex items-center gap-4">
                        <span className={`font-mono font-bold text-xs w-6 text-right ${idx < 4 ? 'text-green-500' : 'text-gray-600'}`}>
                            #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                            <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-6 h-6 object-contain" />
                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition">{t.times?.nome}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => moverTime(idx, 'cima')} 
                            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-lg transition"
                            title="Subir Rank"
                        >
                            ▲
                        </button>
                        <button 
                            onClick={() => moverTime(idx, 'baixo')} 
                            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-lg transition"
                            title="Descer Rank"
                        >
                            ▼
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="text-center text-xs text-gray-500 mb-4">
            {timesOrdenados.length} times qualificados identificados.
        </div>

        <button 
            onClick={handleGerarConfrontos} 
            disabled={loading || timesOrdenados.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-xs transition shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
            {loading ? 'Gerando Chaves...' : 'Gerar Mata-Mata por Seed'}
        </button>
    </div>
  )
}