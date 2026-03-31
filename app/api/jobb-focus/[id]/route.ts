import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET — fetch a single saved query with full results
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = getSupabase()
    const { data, error } = await db
      .from('jobb_focus')
      .select('id, prompt, results, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Sökningen hittades inte.' }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      prompt: data.prompt,
      results: data.results,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — remove a saved query
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = getSupabase()
    const { error } = await db
      .from('jobb_focus')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
