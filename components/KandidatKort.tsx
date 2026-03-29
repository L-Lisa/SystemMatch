'use client'

import { useRef, useState } from 'react'
import { Kandidat, CV } from '@/lib/types'
import Flagga from './Flagga'

interface KandidatKortProps {
  kandidat: Kandidat
  onFlagToggle: (id: string, flag: string, value: boolean) => void
  onCVAdd: (id: string, cv: CV) => void
  onCVDelete: (id: string, cvId: string) => void
}

function isExpired(slutdatum: string | undefined | null): boolean {
  if (!slutdatum) return false
  const d = new Date(slutdatum)
  return !isNaN(d.getTime()) && d < new Date()
}

export default function KandidatKort({ kandidat, onFlagToggle, onCVAdd, onCVDelete }: KandidatKortProps) {
  const expired = isExpired(kandidat.slutdatum)
  const [expanded, setExpanded] = useState(false)
  const [cvStatus, setCvStatus] = useState<Record<string, 'uploading' | 'ok' | 'error'>>({})
  const [cvError, setCvError] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddCV = kandidat.cvs.length < 4

  async function handleFileUpload(file: File) {
    const tempKey = `new-${Date.now()}`
    setCvStatus((s) => ({ ...s, [tempKey]: 'uploading' }))
    setCvError((e) => ({ ...e, [tempKey]: '' }))
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('rubrik', file.name.replace(/\.[^.]+$/, ''))

      const res = await fetch(`/api/kandidater/${kandidat.id}/cv`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Uppladdning misslyckades')

      onCVAdd(kandidat.id, data.cv)
      setCvStatus((s) => {
        const next = { ...s }
        delete next[tempKey]
        return next
      })
    } catch (err) {
      setCvStatus((s) => ({ ...s, [tempKey]: 'error' }))
      setCvError((e) => ({ ...e, [tempKey]: err instanceof Error ? err.message : 'Okänt fel' }))
    }
  }

  async function handleDelete(cv: CV) {
    setCvStatus((s) => ({ ...s, [cv.id]: 'uploading' }))
    try {
      const res = await fetch(`/api/kandidater/${kandidat.id}/cv`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId: cv.id }),
      })
      if (!res.ok) throw new Error('Kunde inte ta bort CV')
      onCVDelete(kandidat.id, cv.id)
      setCvStatus((s) => {
        const next = { ...s }
        delete next[cv.id]
        return next
      })
    } catch (err) {
      setCvStatus((s) => ({ ...s, [cv.id]: 'error' }))
      setCvError((e) => ({ ...e, [cv.id]: err instanceof Error ? err.message : 'Okänt fel' }))
    }
  }

  const uploadingNew = Object.entries(cvStatus).some(
    ([k, v]) => k.startsWith('new-') && v === 'uploading'
  )
  const newUploadError = Object.entries(cvError).find(([k]) => k.startsWith('new-'))?.[1]

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 transition-shadow ${expired ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:shadow-md'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-base ${expired ? 'text-gray-400' : 'text-gray-900'}`}>{kandidat.namn}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kandidat.bransch}</p>
        </div>
        {kandidat.slutdatum && (
          <span className={`text-xs whitespace-nowrap ml-2 ${expired ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
            {expired ? 'Utgången' : `t.o.m. ${kandidat.slutdatum}`}
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

      {/* CV list */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />

        {kandidat.cvs.map((cv) => (
          <div key={cv.id}>
            <div className="flex items-center gap-1">
              <a
                href={cv.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  cvStatus[cv.id] === 'ok'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
                title={cv.rubrik}
              >
                {cvStatus[cv.id] === 'uploading' ? '...' : cv.rubrik || 'CV'}
              </a>
              <button
                onClick={() => handleDelete(cv)}
                disabled={cvStatus[cv.id] === 'uploading'}
                className="text-gray-300 hover:text-red-400 text-xs disabled:opacity-50"
                title="Ta bort CV"
              >
                ✕
              </button>
            </div>
            {cvStatus[cv.id] === 'error' && (
              <p className="text-xs text-red-500 mt-1">⚠ {cvError[cv.id]}</p>
            )}
          </div>
        ))}

        {canAddCV && (
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingNew}
              className="text-xs bg-gray-50 text-gray-400 border border-dashed border-gray-200 px-2 py-0.5 rounded hover:border-indigo-300 hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              {uploadingNew ? '...' : '+ CV'}
            </button>
            {newUploadError && (
              <p className="text-xs text-red-500 mt-1">⚠ {newUploadError}</p>
            )}
          </div>
        )}
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
