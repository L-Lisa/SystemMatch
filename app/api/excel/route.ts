import { NextResponse } from 'next/server'
import { getAllKandidater } from '@/lib/db/kandidater'
import { getAllRekryterare } from '@/lib/db/jobb'

export async function GET() {
  try {
    const [kandidater, rekryterare] = await Promise.all([
      getAllKandidater(),
      getAllRekryterare(),
    ])
    return NextResponse.json({ kandidater, rekryterare })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
