'use client'

import { useState } from 'react'
import { Kandidat, Jobb, Feedback } from '@/lib/types'

interface FeedbackModalProps {
  jobb: Jobb
  kandidater: Kandidat[]
  onClose: () => void
  maxFeedback?: number
}

export default function FeedbackModal({
  jobb,
  kandidater,
  onClose,
  maxFeedback = 10,
}: FeedbackModalProps) {
  const [feedbackList, setFeedbackList] = useState<
    Array<{
      kandidatId: string
      typ: 'vinkel' | 'prioritet' | 'resultat'
      kommentar: string
      resultat?: 'anställd' | 'ej_aktuell' | 'pågående'
    }>
  >([{ kandidatId: '', typ: 'vinkel', kommentar: '', resultat: undefined }])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    if (feedbackList.length >= maxFeedback) return
    setFeedbackList((l) => [
      ...l,
      { kandidatId: '', typ: 'vinkel', kommentar: '', resultat: undefined },
    ])
  }

  function updateRow(i: number, field: string, value: string) {
    setFeedbackList((l) =>
      l.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    )
  }

  function removeRow(i: number) {
    setFeedbackList((l) => l.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    const valid = feedbackList.filter((f) => f.kandidatId && f.kommentar.trim())
    if (valid.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all(
        valid.map(async (f) => {
          const kandidat = kandidater.find((k) => k.id === f.kandidatId)
          const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kandidatId: f.kandidatId,
              kandidatNamn: kandidat?.namn || f.kandidatId,
              jobbId: jobb.id,
              jobbTitel: jobb.tjänst,
              typ: f.typ,
              kommentar: f.kommentar,
              resultat: f.resultat,
            }),
          })
          if (!res.ok) throw new Error(`Kunde inte spara feedback (${res.status})`)
        })
      )
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel, försök igen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Feedback</h2>
              <p className="text-sm text-gray-500">{jobb.tjänst} – {jobb.arbetsgivare}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Din feedback används för att förbättra framtida matchningar (upp till {maxFeedback} per gång).
          </p>

          <div className="space-y-4">
            {feedbackList.map((fb, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex gap-2 mb-2">
                  <select
                    value={fb.kandidatId}
                    onChange={(e) => updateRow(i, 'kandidatId', e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Välj kandidat...</option>
                    {kandidater.map((k) => (
                      <option key={k.id} value={k.id}>{k.namn}</option>
                    ))}
                  </select>
                  <select
                    value={fb.typ}
                    onChange={(e) => updateRow(i, 'typ', e.target.value)}
                    className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="vinkel">Presentation/vinkel</option>
                    <option value="prioritet">Prioritering</option>
                    <option value="resultat">Resultat</option>
                  </select>
                  <button
                    onClick={() => removeRow(i)}
                    className="text-gray-300 hover:text-red-400 text-sm px-1"
                  >
                    ✕
                  </button>
                </div>

                {fb.typ === 'resultat' && (
                  <div className="flex gap-2 mb-2">
                    {(['anställd', 'ej_aktuell', 'pågående'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => updateRow(i, 'resultat', r)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          fb.resultat === r
                            ? r === 'anställd'
                              ? 'bg-green-500 text-white border-green-500'
                              : r === 'ej_aktuell'
                                ? 'bg-red-100 text-red-600 border-red-200'
                                : 'bg-amber-100 text-amber-600 border-amber-200'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {r === 'anställd' ? '✓ Anställd' : r === 'ej_aktuell' ? '✗ Ej aktuell' : '⟳ Pågående'}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={fb.kommentar}
                  onChange={(e) => updateRow(i, 'kommentar', e.target.value)}
                  placeholder="Skriv din kommentar..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>

          {feedbackList.length < maxFeedback && (
            <button
              onClick={addRow}
              className="mt-3 text-sm text-indigo-500 hover:text-indigo-700"
            >
              + Lägg till feedback ({feedbackList.length}/{maxFeedback})
            </button>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saved ? '✓ Sparat!' : saving ? 'Sparar...' : 'Spara feedback'}
            </button>
            <button
              onClick={onClose}
              className="px-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
