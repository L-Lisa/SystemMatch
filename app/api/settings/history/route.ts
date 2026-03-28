import { NextResponse } from 'next/server'
import { getPromptHistory } from '@/lib/db/settings'

export async function GET() {
  try {
    const history = await getPromptHistory(10)
    return NextResponse.json(history)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
