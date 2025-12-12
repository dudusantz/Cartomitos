import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Verifica se a rota acessada começa com /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // Tenta pegar o cookie de sessão
    const adminSession = request.cookies.get('admin_session')

    // Se não tiver o cookie, manda pro login
    if (!adminSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Se tiver o cookie ou não for rota admin, deixa passar
  return NextResponse.next()
}

// Configura quais rotas o middleware deve vigiar
export const config = {
  matcher: '/admin/:path*',
}