import { NextRequest, NextResponse } from 'next/server'
import { updateKandidatFlags } from '@/lib/db/kandidater'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type, ...updates } = body

    if (type === 'flags') {
      const ALLOWED_FLAGS = ['nystartsjobb', 'korkort', 'introduktionsjobb', 'stads_flag', 'restaurang_flag', 'bransch']
      const safe = Object.fromEntries(
        Object.entries(updates).filter(([k]) => ALLOWED_FLAGS.includes(k))
      )
      await updateKandidatFlags(id, safe)
    } else {
      return NextResponse.json({ error: 'Okänd uppdateringstyp' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
