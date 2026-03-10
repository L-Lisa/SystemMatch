import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings'

export async function GET() {
  const settings = loadSettings()
  return NextResponse.json({
    excelPath: settings.excelPath,
    rekryterarPrompt: settings.rekryterarPrompt,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const current = loadSettings()

    saveSettings({
      excelPath: body.excelPath ?? current.excelPath,
      anthropicApiKey: current.anthropicApiKey, // never updated via UI
      rekryterarPrompt: body.rekryterarPrompt ?? current.rekryterarPrompt,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
