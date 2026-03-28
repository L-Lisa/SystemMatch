'use client'

import { useEffect, useState } from 'react'

interface Settings {
  rekryterarPrompt: string
  feedbackCount: number
}

interface FeedbackItem {
  id: string
  kandidatNamn: string
  jobbTitel: string
  typ: string
  kommentar: string
  resultat?: string
  timestamp: string
}

export default function InstallningarPage() {
  const [settings, setSettings] = useState<Settings>({
    rekryterarPrompt: '',
    feedbackCount: 0,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [improving, setImproving] = useState(false)
  const [improveResult, setImproveResult] = useState<{
    forbattradPrompt: string
    vadAndrades: string[]
  } | null>(null)
  const [improveError, setImproveError] = useState<string | null>(null)
  const [showPromptDiff, setShowPromptDiff] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})

    fetch('/api/feedback')
      .then((r) => r.json())
      .then(setFeedback)
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setSaving(false)
    }
  }

  async function handleImprovePrompt() {
    setImproving(true)
    setImproveError(null)
    setImproveResult(null)
    try {
      const res = await fetch('/api/improve-prompt', { method: 'POST' })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setImproveResult(json)
      setShowPromptDiff(true)
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setImproving(false)
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: form })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setImportResult(`✓ Importerade ${json.kandidater} kandidater och ${json.jobb} jobb`)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setImporting(false)
      // Reset input so same file can be re-uploaded
      e.target.value = ''
    }
  }

  async function applyImprovedPrompt() {
    if (!improveResult) return
    setApplying(true)
    setApplyError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rekryterarPrompt: improveResult.forbattradPrompt }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSettings((s) => ({ ...s, rekryterarPrompt: improveResult.forbattradPrompt }))
      setImproveResult(null)
      setShowPromptDiff(false)
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Kunde inte spara – försök igen')
    } finally {
      setApplying(false)
    }
  }

  const suggestImprove = settings.feedbackCount >= 5

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inställningar</h1>

      {/* Excel Import */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">Importera från Excel</h2>
        <p className="text-sm text-gray-500 mb-3">
          Ladda upp din Excel-fil (.xlsx) för att synka kandidater och jobb med databasen. Befintliga CV-länkar och flaggor bevaras.
        </p>
        <label className={`inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          {importing ? 'Importerar...' : '↑ Välj Excel-fil'}
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={importing}
            onChange={handleFileImport}
          />
        </label>
        {importResult && <p className="text-sm text-green-600 mt-2">{importResult}</p>}
        {importError && <p className="text-sm text-red-500 mt-2">⚠ {importError}</p>}
      </section>

      {/* API Key */}
      <section className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-1">Anthropic API-nyckel</h2>
        <p className="text-sm text-gray-500">
          Hanteras via miljövariabel <code className="bg-gray-100 px-1 rounded text-xs">ANTHROPIC_API_KEY</code> i{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> eller Vercel-inställningar.
          Läggs aldrig i webbläsaren.
        </p>
      </section>

      {/* Recruiter Prompt */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">RekryterarClaude – Prompt</h2>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleImprovePrompt}
              disabled={improving || settings.feedbackCount === 0}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                suggestImprove
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={settings.feedbackCount === 0 ? 'Lägg till feedback först' : 'Analysera feedback och förbättra prompten'}
            >
              {improving ? 'Analyserar...' : '✨ Förbättra prompt'}
            </button>
            {settings.feedbackCount > 0 && (
              <span className={`text-xs ${suggestImprove ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                {suggestImprove
                  ? `${settings.feedbackCount} nya feedbacks – redo att köra!`
                  : `${settings.feedbackCount} feedback sedan senaste förbättring`}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-2">
          Denna prompt styr hur Claude matchar kandidater. Du kan redigera den direkt.
        </p>

        <textarea
          value={settings.rekryterarPrompt}
          onChange={(e) => setSettings((s) => ({ ...s, rekryterarPrompt: e.target.value }))}
          rows={16}
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono resize-y focus:outline-none focus:border-indigo-400"
        />

        {improveError && (
          <p className="text-xs text-red-500 mt-2">⚠ {improveError}</p>
        )}

        {improveResult && showPromptDiff && (
          <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <p className="text-sm font-medium text-indigo-800 mb-2">
              Claude föreslår dessa förbättringar:
            </p>
            <ul className="text-xs text-indigo-700 list-disc list-inside space-y-1 mb-3">
              {improveResult.vadAndrades.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            {applyError && (
              <p className="text-xs text-red-600 mb-2">⚠ {applyError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={applyImprovedPrompt}
                disabled={applying}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {applying ? 'Sparar...' : 'Tillämpa förbättring'}
              </button>
              <button
                onClick={() => { setImproveResult(null); setApplyError(null) }}
                disabled={applying}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 disabled:opacity-50"
              >
                Avfärda
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '✓ Sparat' : saving ? 'Sparar...' : 'Spara inställningar'}
        </button>
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
      </div>

      {/* Feedback History */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">
          Feedback-historik ({feedback.length})
        </h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-400">Ingen feedback ännu</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...feedback].reverse().map((f) => (
              <div key={f.id} className="p-2 bg-gray-50 rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-700">{f.kandidatNamn}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">{f.jobbTitel}</span>
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded text-xs ${
                      f.typ === 'resultat'
                        ? f.resultat === 'anställd'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {f.typ}
                    {f.resultat ? ` · ${f.resultat}` : ''}
                  </span>
                </div>
                <p className="text-gray-600">{f.kommentar}</p>
                <p className="text-gray-300 mt-0.5">{new Date(f.timestamp).toLocaleDateString('sv-SE')}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
