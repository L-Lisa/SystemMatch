import { NextRequest, NextResponse } from 'next/server'
import { updateJobbPresenterad } from '@/lib/db/jobb'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()

    if (typeof body.presenterad !== 'string') {
      return NextResponse.json({ error: 'presenterad måste vara en sträng' }, { status: 400 })
    }

    await updateJobbPresenterad(id, body.presenterad)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
