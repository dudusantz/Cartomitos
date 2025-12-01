import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'; // Importe o Toaster

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Cartomitos',
  description: 'Sua liga Cartola FC personalizada',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-right" // Posição no canto superior direito
          toastOptions={{
            duration: 3000, // Mensagem some em 3 segundos
            style: {
              background: '#333',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              border: '1px solid #555'
            },
            success: {
              iconTheme: { primary: '#22C55E', secondary: '#fff' }, // Verde
              style: { background: '#1a472a', color: '#a7f3d0' }
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' }, // Vermelho
              style: { background: '#450a0a', color: '#fecaca' }
            }
          }}
        />
      </body>
    </html>
  )
}