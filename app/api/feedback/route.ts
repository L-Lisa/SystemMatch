import { NextRequest, NextResponse } from 'next/server'
import { getAllFeedback, addFeedback } from '@/lib/db/feedback'

export async function GET() {
  try {
    const feedback = await getAllFeedback()
    return NextResponse.json(feedback)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kandidatId, kandidatNamn, jobbId, jobbTitel, typ, kommentar, resultat } = body

    if (!kandidatNamn || !jobbTitel || !typ || !kommentar) {
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 })
    }

    const feedback = await addFeedback({
      kandidatId,
      kandidatNamn,
      jobbId,
      jobbTitel,
      typ,
      kommentar,
      resultat,
    })

    return NextResponse.json(feedback)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
