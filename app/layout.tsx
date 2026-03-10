import type { Metadata } from 'next'
import './globals.css'
import ConditionalNavBar from '@/components/ConditionalNavBar'

export const metadata: Metadata = {
  title: 'SystemMatch',
  description: 'Jobbcoach matchningsverktyg',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        <ConditionalNavBar />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
