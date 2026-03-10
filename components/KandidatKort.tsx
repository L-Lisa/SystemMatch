'use client'

import { useState } from 'react'
import { Kandidat } from '@/lib/types'
import Flagga from './Flagga'

interface KandidatKortProps {
  kandidat: Kandidat
  onFlagToggle: (rad: number, flag: string, value: boolean) => void
  onCVUpdate: (rad: number, cvIndex: 1 | 2 | 3, url: string) => void
}

export default function KandidatKort({ kandidat, onFlagToggle, onCVUpdate }: KandidatKortProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingCV, setEditingCV] = useState<1 | 2 | 3 | null>(null)
  const [cvInput, setCvInput] = useState('')
  const [cvStatus, setCvStatus] = useState<Record<string, 'idle' | 'checking' | 'ok' | 'error'>>({})
  const [cvError, setCvErrorMsg] = useState<Record<string, string>>({})

  const cvLinks = [
    { idx: 1 as const, url: kandidat.cv1 },
    { idx: 2 as const, url: kandidat.cv2 },
    { idx: 3 as const, url: kandidat.cv3 },
  ]

  async function handleCVSave(idx: 1 | 2 | 3) {
    const url = cvInput.trim()
    if (!url) return
    setCvStatus((s) => ({ ...s, [idx]: 'checking' }))
    try {
      const res = await fetch('/api/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.success) {
        setCvStatus((s) => ({ ...s, [idx]: 'ok' }))
        onCVUpdate(kandidat.rad, idx, url)
        setEditingCV(null)
        setCvInput('')
      } else {
        setCvStatus((s) => ({ ...s, [idx]: 'error' }))
        setCvErrorMsg((e) => ({ ...e, [idx]: data.error || 'Kunde inte läsa CV' }))
      }
    } catch {
      setCvStatus((s) => ({ ...s, [idx]: 'error' }))
      setCvErrorMsg((e) => ({ ...e, [idx]: 'Nätverksfel' }))
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
        <Flagga
          label="Körkort"
          active={kandidat.korkort}
          color="green"
          onClick={() => onFlagToggle(kandidat.rad, 'korkort', !kandidat.korkort)}
        />
        <Flagga
          label="Nystartsjobb"
          active={kandidat.nystartsjobb}
          color="blue"
          onClick={() => onFlagToggle(kandidat.rad, 'nystartsjobb', !kandidat.nystartsjobb)}
        />
        <Flagga
          label="Introduktionsjobb"
          active={kandidat.introduktionsjobb}
          color="purple"
          onClick={() => onFlagToggle(kandidat.rad, 'introduktionsjobb', !kandidat.introduktionsjobb)}
        />
        {kandidat.loneansprak && (
          <Flagga
            label="Lön"
            value={kandidat.loneansprak}
            active={true}
            color="amber"
            readonly
          />
        )}
        <Flagga
          label="Städ"
          active={kandidat.stadsFlag}
          color="teal"
          onClick={() => onFlagToggle(kandidat.rad, 'stadsFlag', !kandidat.stadsFlag)}
        />
        <Flagga
          label="Restaurang"
          active={kandidat.restaurangFlag}
          color="rose"
          onClick={() => onFlagToggle(kandidat.rad, 'restaurangFlag', !kandidat.restaurangFlag)}
        />
      </div>

      {/* CV Links */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {cvLinks.map(({ idx, url }) => (
          <div key={idx}>
            {url ? (
              <div className="flex items-center gap-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                >
                  CV {idx}
                </a>
                <button
                  onClick={() => { setEditingCV(idx); setCvInput(url) }}
                  className="text-gray-300 hover:text-gray-500 text-xs"
                  title="Redigera länk"
                >
                  ✎
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingCV(idx); setCvInput('') }}
                className="text-xs bg-gray-50 text-gray-400 border border-dashed border-gray-200 px-2 py-0.5 rounded hover:border-indigo-300 hover:text-indigo-400 transition-colors"
              >
                + CV {idx}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CV Edit Input */}
      {editingCV && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">CV {editingCV} — klistra in Google Drive-länk</p>
          <div className="flex gap-1">
            <input
              type="text"
              value={cvInput}
              onChange={(e) => setCvInput(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => handleCVSave(editingCV)}
              disabled={cvStatus[editingCV] === 'checking'}
              className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {cvStatus[editingCV] === 'checking' ? '...' : 'Testa & spara'}
            </button>
            <button
              onClick={() => { setEditingCV(null); setCvInput('') }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              ✕
            </button>
          </div>
          {cvStatus[editingCV] === 'error' && (
            <p className="text-xs text-red-500 mt-1">⚠ {cvError[editingCV]}</p>
          )}
          {cvStatus[editingCV] === 'ok' && (
            <p className="text-xs text-green-600 mt-1">✓ CV läst och sparad</p>
          )}
        </div>
      )}

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
                <span
                  key={i}
                  className="text-xs bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100"
                >
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
