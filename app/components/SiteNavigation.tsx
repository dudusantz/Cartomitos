'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Início' },
  { href: '/campeonatos', label: 'Campeonatos' },
  { href: '/campeoes', label: 'Troféus' },
]

export default function SiteNavigation() {
  const pathname = usePathname()

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Navegação principal">
        <Link href="/" className="brand-lockup" aria-label="Cartomitos — início">
          <span className="brand-mark">
            <Image src="/logo-atual.png" alt="" width={42} height={42} priority />
          </span>
          <span className="brand-word">CARTO<strong>MITOS</strong></span>
        </Link>

        <div className="site-links">
          {links.map(link => {
            const ativo = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link key={link.href} href={link.href} className="site-link" aria-current={ativo ? 'page' : undefined}>
                {link.label}
              </Link>
            )
          })}
        </div>

        <Link href="/admin" className={`admin-entry ${pathname.startsWith('/admin') ? 'is-active' : ''}`}>
          Admin
        </Link>
      </nav>
    </header>
  )
}
