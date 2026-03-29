'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavLink {
  href: string
  label: string
}

const staticLinks: NavLink[] = [
  { href: '/kandidater', label: 'Kandidater' },
]

const trailingLinks: NavLink[] = [
  { href: '/installningar', label: 'Inställningar' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rekryterareLinks, setRekryterareLinks] = useState<NavLink[]>([])

  useEffect(() => {
    fetch('/api/excel')
      .then((r) => r.json())
      .then((data) => {
        if (data.rekryterare && Array.isArray(data.rekryterare)) {
          setRekryterareLinks(
            data.rekryterare
              .filter((r: { namn: string; jobb: unknown[] }) => r.jobb && r.jobb.length > 0)
              .map((r: { namn: string }) => ({
                href: `/rekryterare/${encodeURIComponent(r.namn.toLowerCase())}`,
                label: r.namn,
              }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const links = [...staticLinks, ...rekryterareLinks, ...trailingLinks]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <span className="font-bold text-indigo-700 text-lg">SystemMatch</span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Logout — desktop */}
          <button
            onClick={handleLogout}
            className="hidden md:block text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
          >
            Logga ut
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50"
            aria-label="Meny"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 px-4 py-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="block w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600"
          >
            Logga ut
          </button>
        </div>
      )}
    </nav>
  )
}
