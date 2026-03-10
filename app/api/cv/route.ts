import { NextRequest, NextResponse } from 'next/server'
import { readCV } from '@/lib/cv-reader'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL saknas' }, { status: 400 })
    }
    const result = await readCV(url)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
