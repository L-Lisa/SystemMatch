'use client'

import { useEffect, useState, useCallback } from 'react'
import { Kandidat, CV, ExcelData } from '@/lib/types'
import { friendlyError } from '@/lib/error'
import KandidatKort from '@/components/KandidatKort'

export default function KandidaterPage() {
  const [data, setData] = useState<ExcelData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [flagFilter, setFlagFilter] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 24

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

  useEffect(() => {
    setPage(0)
  }, [search, flagFilter])

  async function handleFlagToggle(id: string, flag: string, value: boolean) {
    if (!data) return

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        kandidater: prev.kandidater.map((k) => {
          if (k.id !== id) return k
          const updated = { ...k, [flag]: value }

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

    try {
      const body: Record<string, unknown> = { type: 'flags' }
      if (flag === 'stadsFlag' || flag === 'restaurangFlag') {
        const kandidat = data.kandidater.find((k) => k.id === id)
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
          body.stads_flag = flag === 'stadsFlag' ? value : kandidat.stadsFlag
          body.restaurang_flag = flag === 'restaurangFlag' ? value : kandidat.restaurangFlag
        }
      } else {
        body[flag === 'korkort' ? 'korkort' : flag === 'nystartsjobb' ? 'nystartsjobb' : flag === 'introduktionsjobb' ? 'introduktionsjobb' : flag] = value
      }

      await fetch(`/api/kandidater/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (e) {
      console.error('Kunde inte spara flagga:', e)
    }
  }

  function handleCVAdd(id: string, cv: CV) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        kandidater: prev.kandidater.map((k) =>
          k.id === id ? { ...k, cvs: [...k.cvs, cv] } : k
        ),
      }
    })
  }

  function handleCVDelete(id: string, cvId: string) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        kandidater: prev.kandidater.map((k) =>
          k.id === id ? { ...k, cvs: k.cvs.filter((c) => c.id !== cvId) } : k
        ),
      }
    })
  }

  function toggleFlag(flag: string) {
    setFlagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }

  const FLAG_CHIPS = [
    { key: 'korkort', label: 'Körkort' },
    { key: 'nystartsjobb', label: 'Nystartsjobb' },
    { key: 'introduktionsjobb', label: 'Introduktionsjobb' },
    { key: 'stadsFlag', label: 'Städ' },
    { key: 'restaurangFlag', label: 'Restaurang' },
  ]

  const filtered = data?.kandidater.filter((k) => {
    if (search) {
      const q = search.toLowerCase()
      const matchText =
        k.namn.toLowerCase().includes(q) ||
        k.bransch.toLowerCase().includes(q) ||
        k.merBransch.toLowerCase().includes(q)
      if (!matchText) return false
    }
    for (const flag of flagFilter) {
      if (!k[flag as keyof Kandidat]) return false
    }
    return true
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

      {/* Flag filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FLAG_CHIPS.map(({ key, label }) => {
          const active = flagFilter.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleFlag(key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {label}
            </button>
          )
        })}
        {flagFilter.size > 0 && (
          <button
            onClick={() => setFlagFilter(new Set())}
            className="text-xs px-3 py-1 rounded-full text-gray-400 hover:text-gray-600"
          >
            Rensa filter
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">Laddar kandidater...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">Kunde inte ladda data</p>
          <p className="text-sm mt-1">{friendlyError(error)}</p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((k) => (
              <KandidatKort
                key={k.id}
                kandidat={k}
                onFlagToggle={handleFlagToggle}
                onCVAdd={handleCVAdd}
                onCVDelete={handleCVDelete}
              />
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors"
              >
                ← Föregående
              </button>
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} av {filtered.length}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= filtered.length}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors"
              >
                Nästa →
              </button>
            </div>
          )}
        </>
      )}

      {filtered && filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          {data?.kandidater.length === 0 ? (
            <>
              <p>Inga kandidater importerade ännu.</p>
              <a href="/installningar" className="text-sm text-indigo-500 hover:text-indigo-700 underline mt-2 block">
                Gå till Inställningar för att importera Excel
              </a>
            </>
          ) : (
            'Inga kandidater matchade sökningen'
          )}
        </div>
      )}
    </div>
  )
}
