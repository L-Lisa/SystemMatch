import { NextRequest, NextResponse } from 'next/server'
import { loadSettings } from '@/lib/settings'
import { getDbPrompt, saveDbPrompt, getFeedbackCount } from '@/lib/db/settings'

export async function GET() {
  const settings = loadSettings()
  const [dbPrompt, feedbackCount] = await Promise.all([
    getDbPrompt().catch(() => null),
    getFeedbackCount().catch(() => 0),
  ])
  return NextResponse.json({
    rekryterarPrompt: dbPrompt || settings.rekryterarPrompt,
    feedbackCount,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (typeof body.rekryterarPrompt === 'string') {
      const changesSummary = typeof body.changesSummary === 'string' ? body.changesSummary : undefined
      await saveDbPrompt(body.rekryterarPrompt, changesSummary)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
