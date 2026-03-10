import { NextRequest, NextResponse } from 'next/server'
import { loadFeedback, addFeedback } from '@/lib/feedback'

export async function GET() {
  const feedback = loadFeedback()
  return NextResponse.json(feedback)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const newFeedback = addFeedback(body)
    return NextResponse.json(newFeedback)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
