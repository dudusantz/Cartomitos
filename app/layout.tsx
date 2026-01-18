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
          <div className="max-w-7xl mx-auto px-4 py-3 md:h-20 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
            
            {/* LINHA SUPERIOR (MOBILE): Logo + Admin */}
            <div className="w-full md:w-auto flex items-center justify-between">
                {/* LOGO */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-110 duration-300">
                        <Image 
                            src="/logo-atual.png"
                            alt="Logo" 
                            width={40} 
                            height={40}
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                        />
                    </div>
                    <span className="font-black text-lg md:text-xl tracking-tighter text-white">
                        CARTO<span className="text-yellow-500">MITOS</span>
                    </span>
                </Link>

                {/* BOTÃO ADMIN (Visível aqui no Mobile) */}
                <div className="md:hidden">
                    <Link 
                    href="/admin" 
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20"
                    >
                    Admin
                    </Link>
                </div>
            </div>

            {/* LINHA INFERIOR (MOBILE) / CENTRO (PC): MENU */}
            {/* Usei gap-4 no mobile para caber "Galeria de Troféus" sem quebrar */}
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-4 md:gap-8 border-t border-white/5 md:border-none pt-2 md:pt-0">
              <Link href="/" className="text-[11px] font-bold text-gray-400 hover:text-yellow-500 uppercase tracking-widest transition-colors">
                Início
              </Link>
              <Link href="/campeonatos" className="text-[11px] font-bold text-gray-400 hover:text-yellow-500 uppercase tracking-widest transition-colors">
                Campeonatos
              </Link>
              {/* Texto completo restaurado */}
              <Link href="/campeoes" className="text-[11px] font-bold text-gray-400 hover:text-yellow-500 uppercase tracking-widest transition-colors">
                Galeria de Troféus
              </Link>
            </div>

            {/* BOTÃO ADMIN (Visível aqui no PC) */}
            <div className="hidden md:block">
                <Link 
                href="/admin" 
                className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95"
                >
                Admin
                </Link>
            </div>
          </div>
        </nav>

        {/* CONTEÚDO */}
        <main className="min-h-[calc(100vh-100px)] md:min-h-[calc(100vh-80px)]">
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