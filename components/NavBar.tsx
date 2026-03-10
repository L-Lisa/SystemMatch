'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/kandidater', label: 'Kandidater' },
  { href: '/rekryterare/nikola', label: 'Nikola' },
  { href: '/rekryterare/2', label: 'Rekryterare 2' },
  { href: '/rekryterare/3', label: 'Rekryterare 3' },
  { href: '/rekryterare/4', label: 'Rekryterare 4' },
  { href: '/installningar', label: 'Inställningar' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 h-14">
          <span className="font-bold text-indigo-700 text-lg mr-4">SystemMatch</span>
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
      </div>
    </nav>
  )
}
