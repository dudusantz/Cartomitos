import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-10 font-sans">
      
      {/* Cabeçalho do Admin */}
      <div className="max-w-4xl mx-auto mb-12 flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Painel do Cartoleiro
          </h1>
          <p className="text-gray-400 mt-1">Bem-vindo à área de gestão da liga.</p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-white border border-gray-700 px-4 py-2 rounded transition">
          ← Voltar para o Site
        </Link>
      </div>

      {/* Grid de Opções (O Menu Funcional) */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* OPÇÃO 1: TIMES */}
        <Link href="/admin/times" className="group">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl hover:border-green-500 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] h-full">
            <div className="bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
              <span className="text-3xl">🛡️</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-green-400">Cadastrar Times</h2>
            <p className="text-gray-400">
              Adicione novos times buscando direto da API do Cartola ou edite os existentes.
            </p>
          </div>
        </Link>

        {/* OPÇÃO 2: LIGAS */}
        <Link href="/admin/ligas" className="group">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl hover:border-blue-500 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] h-full">
            <div className="bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
              <span className="text-3xl">🏆</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-400">Gerenciar Ligas</h2>
            <p className="text-gray-400">
              Crie campeonatos, gere tabelas automáticas, atualize pontuações e veja a classificação.
            </p>
          </div>
        </Link>

      </div>

      <div className="max-w-4xl mx-auto mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-800 text-center">
        <p className="text-gray-500 text-sm">
          Dica: Sempre cadastre os times na aba "Cadastrar Times" antes de tentar adicioná-los em uma liga.
        </p>
      </div>

    </div>
  )
}