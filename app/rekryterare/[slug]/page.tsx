'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ExcelData, Jobb, Kandidat, MatchResult } from '@/lib/types'
import { friendlyError } from '@/lib/error'
import Flagga from '@/components/Flagga'
import FeedbackModal from '@/components/FeedbackModal'

const RECRUITER_MAP: Record<string, string> = {
  nikola: 'Nikola',
  '2': 'Rekryterare 2',
  '3': 'Rekryterare 3',
  '4': 'Rekryterare 4',
}

function PresenteradList({
  presenterad,
  kandidater,
  onEdit,
}: {
  presenterad: string
  kandidater: Kandidat[]
  onEdit: () => void
}) {
  const names = presenterad.split(/[;,]/).map((n) => n.trim()).filter(Boolean)
  const kandidatNames = new Set(kandidater.map((k) => k.namn.toLowerCase()))

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs text-gray-400">Presenterad:</p>
        <button onClick={onEdit} className="text-xs text-gray-300 hover:text-indigo-400" title="Redigera">
          ✏
        </button>
      </div>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {names.map((name, i) => {
            const isMatch = kandidatNames.has(name.toLowerCase())
            return (
              <span
                key={i}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isMatch
                    ? 'bg-indigo-100 text-indigo-800 font-bold'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function JobbKort({
  jobb,
  kandidater,
  onMatch,
  matchResults,
  matching,
  onFeedback,
  onPresenteradUpdate,
}: {
  jobb: Jobb
  kandidater: Kandidat[]
  onMatch: (jobb: Jobb) => void
  matchResults: MatchResult[] | null
  matching: boolean
  onFeedback: (jobb: Jobb) => void
  onPresenteradUpdate: (jobbId: string, presenterad: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingPresenterad, setEditingPresenterad] = useState(false)
  const [presenteradDraft, setPresenteradDraft] = useState(jobb.presenterad || '')
  const [savingPresenterad, setSavingPresenterad] = useState(false)
  const [presenteradError, setPresenteradError] = useState<string | null>(null)

  useEffect(() => {
    if (matchResults && matchResults.length > 0) setExpanded(true)
  }, [matchResults])

  async function savePresenterad() {
    setSavingPresenterad(true)
    setPresenteradError(null)
    try {
      const res = await fetch(`/api/jobb/${jobb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presenterad: presenteradDraft }),
      })
      if (!res.ok) throw new Error('Kunde inte spara')
      onPresenteradUpdate(jobb.id, presenteradDraft)
      setEditingPresenterad(false)
    } catch (err) {
      setPresenteradError(err instanceof Error ? err.message : 'Okänt fel')
    } finally {
      setSavingPresenterad(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{jobb.tjänst}</h3>
          <p className="text-sm text-gray-500">{jobb.arbetsgivare}</p>
          {jobb.plats && <p className="text-xs text-gray-400">{jobb.plats}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => onFeedback(jobb)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded"
              title="Lämna feedback"
            >
              Feedback
            </button>
            <button
              onClick={() => onMatch(jobb)}
              disabled={matching}
              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {matching ? 'Matchar...' : 'Matcha'}
            </button>
          </div>
          {(() => {
            const withCV = kandidater.filter((k) => k.cv1 || k.cv2 || k.cv3).length
            return (
              <span className={`text-xs ${withCV === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                {withCV}/{kandidater.length} med CV
              </span>
            )
          })()}
        </div>
      </div>

      {/* Krav/Meriter */}
      {(jobb.krav || jobb.meriter) && (
        <div className="mt-3 space-y-1">
          {jobb.krav && (
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">Krav:</span> {jobb.krav}
            </p>
          )}
          {jobb.meriter && (
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">Meriter:</span> {jobb.meriter}
            </p>
          )}
        </div>
      )}

      {editingPresenterad ? (
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">Presenterad (komma-separerat):</p>
          <input
            autoFocus
            type="text"
            value={presenteradDraft}
            onChange={(e) => setPresenteradDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') savePresenterad()
              if (e.key === 'Escape') setEditingPresenterad(false)
            }}
            className="w-full text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
            placeholder="Namn1, Namn2, ..."
          />
          {presenteradError && <p className="text-xs text-red-500 mt-1">{presenteradError}</p>}
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={savePresenterad}
              disabled={savingPresenterad}
              className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingPresenterad ? 'Sparar...' : 'Spara'}
            </button>
            <button
              onClick={() => { setEditingPresenterad(false); setPresenteradDraft(jobb.presenterad || '') }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <PresenteradList
          presenterad={jobb.presenterad}
          kandidater={kandidater}
          onEdit={() => { setPresenteradDraft(jobb.presenterad || ''); setEditingPresenterad(true) }}
        />
      )}

      {/* Match results */}
      {matchResults && matchResults.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            {expanded ? '▲' : '▼'} {matchResults.length} matchade kandidater
          </button>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-green-600">● Stark 70%+</span>
            <span className="text-xs text-amber-600">● Ok 40–69%</span>
            <span className="text-xs text-gray-400">● Lägre &lt;40%</span>
          </div>
          {expanded && (
            <div className="mt-2 space-y-2">
              {matchResults.map((m, i) => {
                const kandidat = kandidater.find((k) => k.id === m.kandidatId)
                return (
                  <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        {kandidat?.namn || m.kandidatId}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          m.score >= 70
                            ? 'bg-green-100 text-green-700'
                            : m.score >= 40
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {m.score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{m.motivering}</p>
                    {m.vinkel && (
                      <p className="text-xs text-indigo-600 mt-1 italic">
                        💡 {m.vinkel}
                      </p>
                    )}
                    {kandidat && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kandidat.korkort && <Flagga label="Körkort" active color="green" readonly />}
                        {kandidat.nystartsjobb && <Flagga label="Nystartsjobb" active color="blue" readonly />}
                        {kandidat.introduktionsjobb && <Flagga label="Introduktionsjobb" active color="purple" readonly />}
                        {kandidat.loneansprak && <Flagga label="Lön" value={kandidat.loneansprak} active color="amber" readonly />}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RekryterarePage() {
  const params = useParams()
  const slug = (params?.slug as string) || ''
  const rekryterarNamn = RECRUITER_MAP[slug.toLowerCase()] || slug

  const [data, setData] = useState<ExcelData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult[]>>({})
  const [matchingJobbId, setMatchingJobbId] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [cvErrors, setCvErrors] = useState<string[] | null>(null)
  const [feedbackJobb, setFeedbackJobb] = useState<Jobb | null>(null)

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
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleMatch(jobb: Jobb) {
    if (!data) return
    setMatchingJobbId(jobb.id)
    setMatchError(null)
    setCvErrors(null)

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobb, kandidater: data.kandidater }),
      })
      const json = await res.json()

      if (json.error) throw new Error(json.error)
      if (json.cvErrors) setCvErrors(json.cvErrors)

      setMatchResults((prev) => ({ ...prev, [jobb.id]: json.matchningar }))
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : 'Okänt fel vid matchning')
    } finally {
      setMatchingJobbId(null)
    }
  }

  function handlePresenteradUpdate(jobbId: string, presenterad: string) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        rekryterare: prev.rekryterare.map((r) => ({
          ...r,
          jobb: r.jobb.map((j) => (j.id === jobbId ? { ...j, presenterad } : j)),
        })),
      }
    })
  }

  const rekryterare = data?.rekryterare.find(
    (r) => r.namn.toLowerCase() === rekryterarNamn.toLowerCase()
  )
  const jobb = rekryterare?.jobb || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rekryterarNamn}</h1>
          {jobb.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{jobb.length} tjänster</p>
          )}
        </div>
        <button
          onClick={fetchData}
          className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          ↻ Synka Excel
        </button>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Laddar...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">Fel</p>
          <p className="text-sm mt-1">{friendlyError(error)}</p>
          {error.includes('sökväg') && (
            <a href="/installningar" className="text-sm text-indigo-600 underline mt-2 block">
              Gå till Inställningar
            </a>
          )}
        </div>
      )}

      {matchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          ⚠ {friendlyError(matchError)}
        </div>
      )}

      {cvErrors && cvErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-4">
          <p className="text-sm font-medium">CV-varningar (dessa kandidater matchades utan CV):</p>
          <ul className="text-xs mt-1 list-disc list-inside space-y-0.5">
            {cvErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {jobb.length === 0 && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          {rekryterare ? 'Inga tjänster registrerade' : 'Rekryterare har inte data än'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobb.map((j) => (
          <JobbKort
            key={j.id}
            jobb={j}
            kandidater={data?.kandidater || []}
            onMatch={handleMatch}
            matchResults={matchResults[j.id] || null}
            matching={matchingJobbId === j.id}
            onFeedback={(jobb) => setFeedbackJobb(jobb)}
            onPresenteradUpdate={handlePresenteradUpdate}
          />
        ))}
      </div>

      {feedbackJobb && data && (
        <FeedbackModal
          jobb={feedbackJobb}
          kandidater={data.kandidater}
          onClose={() => setFeedbackJobb(null)}
        />
      )}
    </div>
  )
}
