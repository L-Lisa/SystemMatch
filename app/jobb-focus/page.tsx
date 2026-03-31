'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { JobbFocusQuery, JobbFocusHistoryItem } from '@/lib/types'
import { friendlyError } from '@/lib/error'

const PROMPT_MAX_LENGTH = 2000

export default function JobbFocusPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<JobbFocusQuery | null>(null)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState({ motivering: '', detaljer: '' })
  const [history, setHistory] = useState<JobbFocusHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/jobb-focus')
      const data = await res.json()
      if (Array.isArray(data)) setHistory(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchHistory()
    return () => { abortRef.current?.abort() }
  }, [fetchHistory])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    // Abort any previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setSaveError(null)
    setLoading(true)
    setCurrentQuery(null)

    try {
      const res = await fetch('/api/jobb-focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setCurrentQuery({
        id: data.id,
        prompt: data.prompt,
        results: data.results,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      fetchHistory()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Okänt fel')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadSaved(item: JobbFocusHistoryItem) {
    setShowHistory(false)
    setEditingIdx(null)
    setError(null)
    setSaveError(null)

    try {
      const res = await fetch(`/api/jobb-focus/${item.id}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setCurrentQuery({
        id: data.id,
        prompt: data.prompt,
        results: data.results,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      setPrompt(data.prompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda sökningen')
    }
  }

  async function handleDeleteSaved(id: string) {
    if (!window.confirm('Ta bort denna sparade sökning?')) return

    try {
      await fetch(`/api/jobb-focus/${id}`, { method: 'DELETE' })
      setHistory((prev) => prev.filter((q) => q.id !== id))
      if (currentQuery?.id === id) setCurrentQuery(null)
    } catch { /* best effort */ }
  }

  function startEdit(idx: number) {
    if (!currentQuery) return
    const item = currentQuery.results[idx]
    setEditingIdx(idx)
    setEditText({ motivering: item.motivering, detaljer: item.detaljer })
  }

  function cancelEdit() {
    setEditingIdx(null)
  }

  async function persistResults(queryId: string | null, results: JobbFocusQuery['results']) {
    if (!queryId) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/jobb-focus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: queryId, results }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Kunde inte spara')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(idx: number) {
    if (!currentQuery) return
    const updated = [...currentQuery.results]
    updated[idx] = { ...updated[idx], motivering: editText.motivering, detaljer: editText.detaljer }
    setCurrentQuery({ ...currentQuery, results: updated })
    setEditingIdx(null)
    await persistResults(currentQuery.id, updated)
  }

  async function removeResult(idx: number) {
    if (!currentQuery) return
    if (!window.confirm(`Ta bort ${currentQuery.results[idx].namn} från listan?`)) return

    const previous = currentQuery.results
    const updated = previous.filter((_, i) => i !== idx)
    setCurrentQuery({ ...currentQuery, results: updated })

    if (currentQuery.id) {
      setSaving(true)
      setSaveError(null)
      try {
        const res = await fetch('/api/jobb-focus', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentQuery.id, results: updated }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      } catch (err) {
        // Rollback
        setCurrentQuery({ ...currentQuery, results: previous })
        setSaveError(err instanceof Error ? err.message : 'Kunde inte spara — ändringen har återställts')
      } finally {
        setSaving(false)
      }
    }
  }

  function escapeMd(text: string): string {
    return text.replace(/^(#{1,6}\s)/gm, '\\$1')
  }

  function generateMarkdown(): string {
    if (!currentQuery) return ''
    const lines: string[] = []
    lines.push(`# ${escapeMd(currentQuery.prompt)}`)
    lines.push(`_Genererad ${new Date(currentQuery.createdAt).toLocaleDateString('sv-SE')}_`)
    lines.push('')

    for (const r of currentQuery.results) {
      lines.push(`## ${escapeMd(r.titel)} — ${escapeMd(r.namn)}`)
      if (r.flaggor.length > 0) {
        lines.push(`**Flaggor:** ${r.flaggor.join(', ')}`)
      }
      lines.push('')
      lines.push(escapeMd(r.motivering))
      if (r.detaljer) {
        lines.push('')
        lines.push(escapeMd(r.detaljer))
      }
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  function copyMarkdown() {
    const md = generateMarkdown()
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadMarkdown() {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobb-focus-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobb Focus</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Ställ en fråga — AI analyserar alla CV:n och ger dig en lista
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          {showHistory ? 'Dölj historik' : `Historik (${history.length})`}
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='T.ex. "Lista alla inom IT med info om roller, nystartsjobb och program de jobbat med"'
              rows={3}
              maxLength={PROMPT_MAX_LENGTH}
              className="w-full text-sm border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400 resize-none"
              disabled={loading}
            />
            {prompt.length > PROMPT_MAX_LENGTH * 0.8 && (
              <span className="absolute bottom-2 right-3 text-xs text-gray-300">
                {prompt.length}/{PROMPT_MAX_LENGTH}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || prompt.trim().length < 5}
            className="self-end px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'Analyserar...' : 'Sök'}
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-6 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full mb-3" />
          <p className="text-sm text-indigo-700">Analyserar alla kandidaters CV:n...</p>
          <p className="text-xs text-indigo-400 mt-1">Detta kan ta 30-60 sekunder beroende på antal kandidater</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          <p className="font-medium">Fel</p>
          <p className="text-sm mt-1">{friendlyError(error)}</p>
        </div>
      )}

      {/* Save error (non-blocking) */}
      {saveError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 mb-4 text-sm">
          {saveError}
        </div>
      )}

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sparade sökningar</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((q) => (
              <div key={q.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => handleLoadSaved(q)}
                  className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-sm"
                >
                  <p className="text-gray-800 font-medium truncate group-hover:text-indigo-600">
                    {q.prompt}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(q.createdAt).toLocaleDateString('sv-SE')}
                  </p>
                </button>
                <button
                  onClick={() => handleDeleteSaved(q.id)}
                  className="shrink-0 text-xs px-2 py-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label={`Ta bort sökning: ${q.prompt}`}
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHistory && history.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-center text-sm text-gray-400">
          Inga sparade sökningar ännu
        </div>
      )}

      {/* Results */}
      {currentQuery && currentQuery.results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentQuery.results.length} träffar
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-md">
                {currentQuery.prompt}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {saving && <span className="text-xs text-gray-400">Sparar...</span>}
              <button
                onClick={copyMarkdown}
                className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                {copied ? 'Kopierad!' : 'Kopiera .md'}
              </button>
              <button
                onClick={downloadMarkdown}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ladda ner .md
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {currentQuery.results.map((r, idx) => (
              <div
                key={`${r.kandidatId}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{r.namn}</h3>
                      <span className="text-sm text-indigo-600 font-medium">{r.titel}</span>
                    </div>
                    {r.flaggor.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {r.flaggor.map((f, fi) => (
                          <span
                            key={`${f}-${fi}`}
                            className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(idx)}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      aria-label={`Redigera ${r.namn}`}
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => removeResult(idx)}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Ta bort ${r.namn} från listan`}
                    >
                      Ta bort
                    </button>
                  </div>
                </div>

                {editingIdx === idx ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Motivering</label>
                      <textarea
                        value={editText.motivering}
                        onChange={(e) => setEditText((prev) => ({ ...prev, motivering: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Detaljer</label>
                      <textarea
                        value={editText.detaljer}
                        onChange={(e) => setEditText((prev) => ({ ...prev, detaljer: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(idx)}
                        className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Spara
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">{r.motivering}</p>
                    {r.detaljer && (
                      <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-line">{r.detaljer}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {currentQuery && currentQuery.results.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p>Inga kandidater matchade din fråga.</p>
          <p className="text-sm mt-1">Prova att formulera frågan bredare.</p>
        </div>
      )}
    </div>
  )
}
