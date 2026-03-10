'use client'

import { useEffect, useState, useCallback } from 'react'
import { Kandidat, ExcelData } from '@/lib/types'
import KandidatKort from '@/components/KandidatKort'

export default function KandidaterPage() {
  const [data, setData] = useState<ExcelData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/excel')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleFlagToggle(rad: number, flag: string, value: boolean) {
    if (!data) return

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        kandidater: prev.kandidater.map((k) => {
          if (k.rad !== rad) return k
          const updated = { ...k, [flag]: value }

          // Update bransch string for städ/restaurang
          if (flag === 'stadsFlag' || flag === 'restaurangFlag') {
            let bransch = k.bransch
            if (flag === 'stadsFlag') {
              if (value && !bransch.toLowerCase().includes('städ')) {
                bransch = bransch ? bransch + ', städ' : 'städ'
              } else if (!value) {
                bransch = bransch.replace(/,?\s*städ\b/gi, '').trim().replace(/^,/, '').trim()
              }
            }
            if (flag === 'restaurangFlag') {
              if (value && !bransch.toLowerCase().includes('restaurang')) {
                bransch = bransch ? bransch + ', restaurang' : 'restaurang'
              } else if (!value) {
                bransch = bransch.replace(/,?\s*restaurang\b/gi, '').trim().replace(/^,/, '').trim()
              }
            }
            updated.bransch = bransch
          }
          return updated
        }),
      }
    })

    // Persist to Excel
    try {
      const body: Record<string, unknown> = { rad, type: 'flags' }
      if (flag === 'stadsFlag' || flag === 'restaurangFlag') {
        const kandidat = data.kandidater.find((k) => k.rad === rad)
        if (kandidat) {
          let bransch = kandidat.bransch
          if (flag === 'stadsFlag') {
            if (value && !bransch.toLowerCase().includes('städ')) {
              bransch = bransch ? bransch + ', städ' : 'städ'
            } else if (!value) {
              bransch = bransch.replace(/,?\s*städ\b/gi, '').trim().replace(/^,/, '').trim()
            }
          }
          if (flag === 'restaurangFlag') {
            if (value && !bransch.toLowerCase().includes('restaurang')) {
              bransch = bransch ? bransch + ', restaurang' : 'restaurang'
            } else if (!value) {
              bransch = bransch.replace(/,?\s*restaurang\b/gi, '').trim().replace(/^,/, '').trim()
            }
          }
          body.bransch = bransch
        }
      } else {
        body[flag] = value
      }

      await fetch('/api/excel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (e) {
      console.error('Kunde inte spara flagga:', e)
    }
  }

  async function handleCVUpdate(rad: number, cvIndex: 1 | 2 | 3, url: string) {
    if (!data) return

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        kandidater: prev.kandidater.map((k) => {
          if (k.rad !== rad) return k
          const cvKey = `cv${cvIndex}` as 'cv1' | 'cv2' | 'cv3'
          return { ...k, [cvKey]: url }
        }),
      }
    })

    try {
      await fetch('/api/excel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rad, type: 'cv', cvIndex, url }),
      })
    } catch (e) {
      console.error('Kunde inte spara CV-länk:', e)
    }
  }

  const filtered = data?.kandidater.filter((k) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      k.namn.toLowerCase().includes(q) ||
      k.bransch.toLowerCase().includes(q) ||
      k.merBransch.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidater</h1>
          {data && (
            <p className="text-sm text-gray-400 mt-0.5">{data.kandidater.length} deltagare</p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök namn eller bransch..."
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-56 focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => { setSyncing(true); fetchData() }}
            disabled={syncing}
            className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Synkar...' : '↻ Synka Excel'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">Laddar kandidater...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">Kunde inte ladda data</p>
          <p className="text-sm mt-1">{error}</p>
          {error.includes('sökväg') && (
            <a href="/installningar" className="text-sm text-indigo-600 underline mt-2 block">
              Gå till Inställningar för att konfigurera Excel-sökväg
            </a>
          )}
        </div>
      )}

      {filtered && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((k) => (
            <KandidatKort
              key={k.id}
              kandidat={k}
              onFlagToggle={handleFlagToggle}
              onCVUpdate={handleCVUpdate}
            />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          Inga kandidater matchade sökningen
        </div>
      )}
    </div>
  )
}
