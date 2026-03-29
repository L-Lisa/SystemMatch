import { NextRequest, NextResponse } from 'next/server'
import { updateMatchningMotivering } from '@/lib/db/matchningar'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { motivering } = await req.json()

    if (typeof motivering !== 'string' || motivering.trim().length === 0) {
      return NextResponse.json({ error: 'motivering krävs' }, { status: 400 })
    }

    await updateMatchningMotivering(id, motivering.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
