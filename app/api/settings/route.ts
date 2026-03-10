import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings'
import { getDbPrompt, saveDbPrompt } from '@/lib/db/settings'

export async function GET() {
  const settings = loadSettings()
  const dbPrompt = await getDbPrompt().catch(() => null)
  return NextResponse.json({
    excelPath: settings.excelPath,
    rekryterarPrompt: dbPrompt || settings.rekryterarPrompt,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const current = loadSettings()

    // Save excelPath to file (only field needed server-side for import)
    saveSettings({
      excelPath: body.excelPath ?? current.excelPath,
      anthropicApiKey: current.anthropicApiKey,
      rekryterarPrompt: current.rekryterarPrompt,
    })

    // Save prompt to Supabase for persistence across cold starts
    if (typeof body.rekryterarPrompt === 'string') {
      await saveDbPrompt(body.rekryterarPrompt)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
