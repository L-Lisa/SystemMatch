'use client'

import { useRef, useState } from 'react'
import { Kandidat } from '@/lib/types'
import Flagga from './Flagga'

interface KandidatKortProps {
  kandidat: Kandidat
  onFlagToggle: (id: string, flag: string, value: boolean) => void
  onCVUpdate: (id: string, cvIndex: 1 | 2 | 3, url: string) => void
}

export default function KandidatKort({ kandidat, onFlagToggle, onCVUpdate }: KandidatKortProps) {
  const [expanded, setExpanded] = useState(false)
  const [uploadingCV, setUploadingCV] = useState<1 | 2 | 3 | null>(null)
  const [cvStatus, setCvStatus] = useState<Record<number, 'idle' | 'uploading' | 'ok' | 'error'>>({})
  const [cvError, setCvError] = useState<Record<number, string>>({})
  const fileInputRefs = {
    1: useRef<HTMLInputElement>(null),
    2: useRef<HTMLInputElement>(null),
    3: useRef<HTMLInputElement>(null),
  }

  const cvSlots = [
    { idx: 1 as const, url: kandidat.cv1 },
    { idx: 2 as const, url: kandidat.cv2 },
    { idx: 3 as const, url: kandidat.cv3 },
  ]

  async function handleFileUpload(idx: 1 | 2 | 3, file: File) {
    setCvStatus((s) => ({ ...s, [idx]: 'uploading' }))
    setCvError((e) => ({ ...e, [idx]: '' }))
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('cvIndex', String(idx))

      const res = await fetch(`/api/kandidater/${kandidat.id}/cv`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Uppladdning misslyckades')

      onCVUpdate(kandidat.id, idx, data.url)
      setCvStatus((s) => ({ ...s, [idx]: 'ok' }))
      setTimeout(() => setCvStatus((s) => ({ ...s, [idx]: 'idle' })), 2000)
    } catch (err) {
      setCvStatus((s) => ({ ...s, [idx]: 'error' }))
      setCvError((e) => ({ ...e, [idx]: err instanceof Error ? err.message : 'Okänt fel' }))
    }
    setUploadingCV(null)
  }

  async function handleDelete(idx: 1 | 2 | 3) {
    setCvStatus((s) => ({ ...s, [idx]: 'uploading' }))
    try {
      const res = await fetch(`/api/kandidater/${kandidat.id}/cv`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvIndex: idx }),
      })
      if (!res.ok) throw new Error('Kunde inte ta bort CV')
      onCVUpdate(kandidat.id, idx, '')
      setCvStatus((s) => ({ ...s, [idx]: 'idle' }))
    } catch (err) {
      setCvStatus((s) => ({ ...s, [idx]: 'error' }))
      setCvError((e) => ({ ...e, [idx]: err instanceof Error ? err.message : 'Okänt fel' }))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{kandidat.namn}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kandidat.bransch}</p>
        </div>
        {kandidat.slutdatum && (
          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
            t.o.m. {kandidat.slutdatum}
          </span>
        )}
      </div>

      {/* Flaggor */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Flagga label="Körkort" active={kandidat.korkort} color="green"
          onClick={() => onFlagToggle(kandidat.id, 'korkort', !kandidat.korkort)} />
        <Flagga label="Nystartsjobb" active={kandidat.nystartsjobb} color="blue"
          onClick={() => onFlagToggle(kandidat.id, 'nystartsjobb', !kandidat.nystartsjobb)} />
        <Flagga label="Introduktionsjobb" active={kandidat.introduktionsjobb} color="purple"
          onClick={() => onFlagToggle(kandidat.id, 'introduktionsjobb', !kandidat.introduktionsjobb)} />
        {kandidat.loneansprak && (
          <Flagga label="Lön" value={kandidat.loneansprak} active color="amber" readonly />
        )}
        <Flagga label="Städ" active={kandidat.stadsFlag} color="teal"
          onClick={() => onFlagToggle(kandidat.id, 'stadsFlag', !kandidat.stadsFlag)} />
        <Flagga label="Restaurang" active={kandidat.restaurangFlag} color="rose"
          onClick={() => onFlagToggle(kandidat.id, 'restaurangFlag', !kandidat.restaurangFlag)} />
      </div>

      {/* CV Slots */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {cvSlots.map(({ idx, url }) => (
          <div key={idx}>
            <input
              ref={fileInputRefs[idx]}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(idx, file)
                e.target.value = ''
              }}
            />

            {url ? (
              <div className="flex items-center gap-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    cvStatus[idx] === 'ok'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {cvStatus[idx] === 'uploading' ? '...' : cvStatus[idx] === 'ok' ? '✓ CV ' + idx : 'CV ' + idx}
                </a>
                <button
                  onClick={() => fileInputRefs[idx].current?.click()}
                  className="text-gray-300 hover:text-indigo-400 text-xs"
                  title="Byt ut CV"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="text-gray-300 hover:text-red-400 text-xs"
                  title="Ta bort CV"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs[idx].current?.click()}
                disabled={cvStatus[idx] === 'uploading'}
                className="text-xs bg-gray-50 text-gray-400 border border-dashed border-gray-200 px-2 py-0.5 rounded hover:border-indigo-300 hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                {cvStatus[idx] === 'uploading' ? '...' : `+ CV ${idx}`}
              </button>
            )}

            {cvStatus[idx] === 'error' && (
              <p className="text-xs text-red-500 mt-1">⚠ {cvError[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Expandable Keywords */}
      {kandidat.keywords.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <span>{expanded ? '▲' : '▼'}</span>
            <span>Nyckelord ({kandidat.keywords.length})</span>
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-1">
              {kandidat.keywords.map((kw, i) => (
                <span key={i} className="text-xs bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
