'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ExcelData, Jobb, Kandidat, MatchResult } from '@/lib/types'
import { friendlyError } from '@/lib/error'
import Flagga from '@/components/Flagga'
import FeedbackModal from '@/components/FeedbackModal'

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

function MatchResultRow({
  result,
  kandidat,
  onMotiveringSaved,
}: {
  result: MatchResult
  kandidat: Kandidat | undefined
  onMotiveringSaved: (newText: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(result.motivering)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function save() {
    if (!result.matchningId) {
      // No DB id — update optimistically in UI only
      onMotiveringSaved(draft)
      setEditing(false)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/matchningar/${result.matchningId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivering: draft }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      onMotiveringSaved(draft)
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Kunde inte spara')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">
          {kandidat?.namn || result.kandidatId}
        </span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            result.score >= 70
              ? 'bg-green-100 text-green-700'
              : result.score >= 40
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          {result.score}%
        </span>
      </div>

      {editing ? (
        <div className="mt-1">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 resize-none"
          />
          {saveError && <p className="text-xs text-red-500 mt-0.5">{saveError}</p>}
          <div className="flex gap-2 mt-1">
            <button
              onClick={save}
              disabled={saving}
              className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Sparar...' : 'Spara'}
            </button>
            <button
              onClick={() => { setDraft(result.motivering); setEditing(false); setSaveError(null) }}
              disabled={saving}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 group flex items-start gap-1">
          <p className="text-xs text-gray-600 flex-1">{result.motivering}</p>
          <button
            onClick={() => { setDraft(result.motivering); setEditing(true) }}
            className="text-gray-300 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            title="Redigera motivering"
          >
            ✏
          </button>
        </div>
      )}

      {result.vinkel && (
        <p className="text-xs text-indigo-600 mt-1 italic">
          💡 {result.vinkel}
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
}

function FilteredSection({ candidates }: { candidates: FilteredCandidate[] }) {
  const [open, setOpen] = useState(false)
  const l1 = candidates.filter((c) => c.reason === 'L1')
  const rest = candidates.filter((c) => c.reason !== 'L1')

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>{candidates.length} uteslutna kandidater</span>
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {l1.length > 0 && (
            <div className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-1.5">
              <span className="font-medium text-gray-500">Körkort saknas:</span>{' '}
              {l1.map((c) => c.namn).join(', ')}
            </div>
          )}
          {rest.map((c, i) => (
            <div key={i} className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-1.5">
              <span className="text-gray-500">{c.namn}</span>
              {c.reasons && c.reasons.length > 0 && (
                <span className="ml-1">— {c.reasons.join(', ')}</span>
              )}
              {(!c.reasons || c.reasons.length === 0) && c.score !== undefined && (
                <span className="ml-1">— poäng: {c.score}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface FilteredCandidate {
  namn: string
  reason: string
  score?: number
  reasons?: string[]
}

function JobbKort({
  jobb,
  kandidater,
  onMatch,
  matchResults,
  matching,
  cvErrors,
  filteredCandidates,
  onFeedback,
  onPresenteradUpdate,
  onMotiveringUpdate,
}: {
  jobb: Jobb
  kandidater: Kandidat[]
  onMatch: (jobb: Jobb) => void
  matchResults: MatchResult[] | null
  matching: boolean
  cvErrors: string[]
  filteredCandidates: FilteredCandidate[]
  onFeedback: (jobb: Jobb) => void
  onPresenteradUpdate: (jobbId: string, presenterad: string) => void
  onMotiveringUpdate: (jobbId: string, kandidatId: string, motivering: string) => void
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
            const withCV = kandidater.filter((k) => k.cvs && k.cvs.length > 0).length
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
            className="w-full flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-2 transition-colors"
          >
            <span className="text-sm font-medium text-indigo-700">
              {matchResults.length} matchade kandidater
            </span>
            <span className="text-indigo-500 text-sm">{expanded ? '▲ Dölj' : '▼ Visa'}</span>
          </button>
          {!expanded && (
            <div className="flex gap-3 mt-1 px-1">
              <span className="text-xs text-green-600">● {matchResults.filter(m => m.score >= 70).length} starka</span>
              <span className="text-xs text-amber-600">● {matchResults.filter(m => m.score >= 40 && m.score < 70).length} ok</span>
              <span className="text-xs text-gray-400">● {matchResults.filter(m => m.score < 40).length} lägre</span>
            </div>
          )}
          {cvErrors.length > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-xs font-medium text-amber-700 mb-1">CV kunde inte läsas ({cvErrors.length} kandidater matchade utan CV):</p>
              <ul className="text-xs text-amber-600 list-disc list-inside space-y-0.5">
                {cvErrors.map((e, i) => <li key={i}>{e.split(':')[0]}</li>)}
              </ul>
            </div>
          )}
          {expanded && (
            <div className="mt-2 space-y-2">
              {matchResults.map((m, i) => (
                <MatchResultRow
                  key={i}
                  result={m}
                  kandidat={kandidater.find((k) => k.id === m.kandidatId)}
                  onMotiveringSaved={(newText) => {
                    onMotiveringUpdate(jobb.id, m.kandidatId, newText)
                  }}
                />
              ))}
            </div>
          )}
          {expanded && filteredCandidates.length > 0 && (
            <FilteredSection candidates={filteredCandidates} />
          )}
        </div>
      )}
    </div>
  )
}

function buildExportText(
  jobb: Jobb[],
  matchResults: Record<string, MatchResult[]>,
  kandidater: Kandidat[]
): string {
  const sections: string[] = []

  for (const j of jobb) {
    const results = matchResults[j.id]
    if (!results || results.length === 0) continue

    const heading = [j.tjänst, j.arbetsgivare, j.plats].filter(Boolean).join(' — ')
    const lines: string[] = [`**${heading}**`]

    results.forEach((m, i) => {
      const namn = kandidater.find((k) => k.id === m.kandidatId)?.namn || m.kandidatId
      const flags: string[] = []
      const k = kandidater.find((c) => c.id === m.kandidatId)
      if (k?.nystartsjobb) flags.push('Nystartsjobb')
      if (k?.introduktionsjobb) flags.push('Introduktionsjobb')
      if (k?.korkort) flags.push('Körkort')

      lines.push(`${i + 1}. ${namn} (${m.score}%)${flags.length ? '  [' + flags.join(', ') + ']' : ''}`)
      if (m.motivering) lines.push(`   ${m.motivering}`)
      if (m.vinkel) lines.push(`   → ${m.vinkel}`)
    })

    sections.push(lines.join('\n'))
  }

  return sections.join('\n\n')
}

export default function RekryterarePage() {
  const params = useParams()
  const slug = (params?.slug as string) || ''

  const [data, setData] = useState<ExcelData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult[]>>({})
  const [matchingJobbId, setMatchingJobbId] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [cvErrors, setCvErrors] = useState<Record<string, string[]>>({})
  const [filteredResults, setFilteredResults] = useState<Record<string, { namn: string; reason: string; score?: number; reasons?: string[] }[]>>({})
  const [feedbackJobb, setFeedbackJobb] = useState<Jobb | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [copied, setCopied] = useState(false)

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

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobb, kandidater: data.kandidater }),
      })
      const json = await res.json()

      if (json.error) throw new Error(json.error)

      setCvErrors((prev) => ({ ...prev, [jobb.id]: json.cvErrors || [] }))
      setFilteredResults((prev) => ({ ...prev, [jobb.id]: json.filtered || [] }))
      setMatchResults((prev) => ({ ...prev, [jobb.id]: json.matchningar }))
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : 'Okänt fel vid matchning')
    } finally {
      setMatchingJobbId(null)
    }
  }

  function handleMotiveringUpdate(jobbId: string, kandidatId: string, motivering: string) {
    setMatchResults((prev) => ({
      ...prev,
      [jobbId]: (prev[jobbId] || []).map((m) =>
        m.kandidatId === kandidatId ? { ...m, motivering } : m
      ),
    }))
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

  // Match slug against recruiter name (case-insensitive, handles URL-encoded names)
  const rekryterare = data?.rekryterare.find(
    (r) => r.namn.toLowerCase() === decodeURIComponent(slug).toLowerCase()
  )
  const rekryterarNamn = rekryterare?.namn || decodeURIComponent(slug)
  const jobb = rekryterare?.jobb || []
  const hasAnyResults = jobb.some((j) => (matchResults[j.id]?.length ?? 0) > 0)

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rekryterarNamn}</h1>
          {jobb.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{jobb.length} tjänster</p>
          )}
        </div>
        <div className="flex gap-2">
          {hasAnyResults && (
            <button
              onClick={() => setShowExport(true)}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Exportera
            </button>
          )}
          <button
            onClick={fetchData}
            className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            ↻ Synka Excel
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Laddar...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">Fel</p>
          <p className="text-sm mt-1">{friendlyError(error)}</p>
        </div>
      )}

      {matchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          ⚠ {friendlyError(matchError)}
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
            cvErrors={cvErrors[j.id] || []}
            filteredCandidates={filteredResults[j.id] || []}
            onFeedback={(jobb) => setFeedbackJobb(jobb)}
            onPresenteradUpdate={handlePresenteradUpdate}
            onMotiveringUpdate={handleMotiveringUpdate}
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

      {showExport && data && (() => {
        const exportText = buildExportText(jobb, matchResults, data.kandidater)
        return (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowExport(false) }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">Exportera matchningar</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Kopiera och klistra in i Teams, e-post eller dokument.
                  </p>
                </div>
                <button
                  onClick={() => setShowExport(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                <textarea
                  readOnly
                  value={exportText}
                  className="w-full h-full min-h-64 text-sm font-mono border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-300 bg-gray-50 text-gray-700 leading-relaxed"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Klicka i texten för att markera allt · Rubriker visas fetstilta i Teams och Slack
                </p>
                <button
                  onClick={() => handleCopy(exportText)}
                  className={`text-sm font-medium px-5 py-2 rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copied ? '✓ Kopierat!' : 'Kopiera all text'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
