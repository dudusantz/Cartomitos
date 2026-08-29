import './globals.css'
import { Outfit, Space_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import SiteNavigation from './components/SiteNavigation'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' })

export const metadata = {
  title: { default: 'Cartomitos', template: '%s · Cartomitos' },
  description: 'Campeonatos, rankings e história das ligas Cartomitos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className={`${outfit.variable} ${spaceMono.variable}`}>
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
        <SiteNavigation />

        {/* CONTEÚDO */}
        <main id="conteudo" className="site-main">
            {children}
        </main>

        <footer className="site-footer">
          <div>
            <span className="brand-word">CARTO<strong>MITOS</strong></span>
            <p>Competições organizadas, rivalidades preservadas.</p>
          </div>
          <span>Cartola FC é uma marca da Globo. Projeto independente.</span>
        </footer>

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
