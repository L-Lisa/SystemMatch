import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { updateKandidatCV } from '@/lib/db/kandidater'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    const cvIndex = Number(form.get('cvIndex')) as 1 | 2 | 3

    if (!file) return NextResponse.json({ error: 'Ingen fil' }, { status: 400 })
    if (![1, 2, 3].includes(cvIndex)) return NextResponse.json({ error: 'Ogiltigt CV-index' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      return NextResponse.json({ error: 'Endast PDF och Word-filer stöds' }, { status: 400 })
    }

    const path = `${id}/cv-${cvIndex}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Remove old file at this slot if it exists
    await getSupabase().storage.from('cvs').remove([`${id}/cv-${cvIndex}.pdf`, `${id}/cv-${cvIndex}.docx`, `${id}/cv-${cvIndex}.doc`])

    const { error: uploadError } = await getSupabase().storage
      .from('cvs')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw new Error(`Uppladdning misslyckades: ${uploadError.message}`)

    // Generate a long-lived signed URL (10 years)
    const { data: signed, error: signError } = await getSupabase().storage
      .from('cvs')
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

    if (signError || !signed) throw new Error('Kunde inte generera URL')

    await updateKandidatCV(id, cvIndex, signed.signedUrl)

    return NextResponse.json({ ok: true, url: signed.signedUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { cvIndex } = await req.json()

    // Remove all possible extensions
    await getSupabase().storage.from('cvs').remove([
      `${id}/cv-${cvIndex}.pdf`,
      `${id}/cv-${cvIndex}.docx`,
      `${id}/cv-${cvIndex}.doc`,
    ])

    await updateKandidatCV(id, cvIndex, '')

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
