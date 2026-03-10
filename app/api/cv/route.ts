import { NextRequest, NextResponse } from 'next/server'
import { readCV } from '@/lib/cv-reader'

const PRIVATE_HOSTNAME = /^(localhost|.*\.local)$|^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|(^::1$)/

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    if (PRIVATE_HOSTNAME.test(u.hostname)) return false
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL saknas' }, { status: 400 })
    }
    if (!isSafeUrl(url)) {
      return NextResponse.json({ error: 'Ogiltig URL' }, { status: 400 })
    }
    const result = await readCV(url)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
