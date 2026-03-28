import { NextRequest, NextResponse } from 'next/server'
import { getDbPrompt, saveDbPrompt, getFeedbackCount } from '@/lib/db/settings'

export async function GET() {
  try {
    const [rekryterarPrompt, feedbackCount] = await Promise.all([
      getDbPrompt(),
      getFeedbackCount().catch(() => 0),
    ])
    return NextResponse.json({ rekryterarPrompt, feedbackCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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
