import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Cartomitos',
  description: 'Gerenciador de Ligas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className={`${inter.className} bg-[#050505] text-white selection:bg-yellow-500/30`}>
        
        {/* --- NAVBAR --- */}
        <nav className="border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 transition-transform group-hover:scale-110 duration-300">
                    <Image 
                        src="/logo.png" 
                        alt="Logo" 
                        width={40} 
                        height={40}
                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                    />
                </div>
                <span className="font-black text-xl tracking-tighter hidden sm:block text-white">
                    CARTO<span className="text-yellow-500">MITOS</span>
                </span>
            </Link>

            {/* MENU DE NAVEGAÇÃO */}
            <div className="hidden md:flex gap-8 text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">
              <Link href="/" className="hover:text-yellow-500 transition-colors py-2">Início</Link>
              {/* Link atualizado para a lista de campeonatos */}
              <Link href="/campeonatos" className="hover:text-yellow-500 transition-colors py-2">Campeonatos</Link>
              <Link href="/#recordes" className="hover:text-yellow-500 transition-colors py-2">Recordes</Link>
            </div>

            {/* BOTÃO ADMIN */}
            <Link 
              href="/admin" 
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Área Admin
            </Link>
          </div>
        </nav>

        {/* CONTEÚDO */}
        <main className="min-h-[calc(100vh-80px)]">
            {children}
        </main>

        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              fontSize: '12px',
              fontWeight: 'bold',
            }
          }}
        />
      </body>
    </html>
  )
}