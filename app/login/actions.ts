'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logar(prevState: any, formData: FormData) {
  const senhaDigitada = formData.get('password') as string
  
  // VOLTE A USAR A VARIÁVEL DE AMBIENTE AQUI:
  const senhaSecreta = process.env.ADMIN_PASSWORD

  if (senhaDigitada === senhaSecreta) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, 
      path: '/',
    })

    redirect('/admin')
  } else {
    return { error: 'Senha incorreta!' }
  }
}

export async function deslogar() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  redirect('/login')
}