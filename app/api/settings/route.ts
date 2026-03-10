import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings'

export async function GET() {
  const settings = loadSettings()
  // Never expose API key in full
  return NextResponse.json({
    ...settings,
    anthropicApiKey: settings.anthropicApiKey
      ? '***' + settings.anthropicApiKey.slice(-4)
      : '',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const current = loadSettings()

    const updated = {
      excelPath: body.excelPath ?? current.excelPath,
      anthropicApiKey:
        body.anthropicApiKey && !body.anthropicApiKey.startsWith('***')
          ? body.anthropicApiKey
          : current.anthropicApiKey,
      rekryterarPrompt: body.rekryterarPrompt ?? current.rekryterarPrompt,
    }

    saveSettings(updated)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
