import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { readCV } from '@/lib/cv-reader'
import { insertKandidatCV, deleteKandidatCVById } from '@/lib/db/kandidater'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    const rubrik = (form.get('rubrik') as string | null) || ''

    if (!file) return NextResponse.json({ error: 'Ingen fil' }, { status: 400 })

    // Max 10 MB
    const MAX_CV_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_CV_SIZE) {
      return NextResponse.json(
        { error: `Filen är för stor (${Math.round(file.size / 1024 / 1024)} MB). Max 10 MB.` },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      return NextResponse.json({ error: 'Endast PDF och Word-filer stöds' }, { status: 400 })
    }

    // Check max 4 CVs per kandidat
    const { count } = await getSupabase()
      .from('cv')
      .select('id', { count: 'exact', head: true })
      .eq('kandidat_id', id)

    if ((count ?? 0) >= 4) {
      return NextResponse.json({ error: 'Max 4 CV per kandidat' }, { status: 400 })
    }

    const path = `${id}/cv-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await getSupabase().storage
      .from('cvs')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw new Error(`Uppladdning misslyckades: ${uploadError.message}`)

    // Signed URL valid for 30 days — regenerated at match time if needed
    const { data: signed, error: signError } = await getSupabase().storage
      .from('cvs')
      .createSignedUrl(path, 60 * 60 * 24 * 30)

    if (signError || !signed) throw new Error('Kunde inte generera URL')

    // Parse the CV text at upload time (store once, never re-parse on match)
    const cvResult = await readCV(signed.signedUrl)
    const cvText = cvResult.success ? (cvResult.text ?? '') : ''

    const cvRow = await insertKandidatCV(
      id,
      rubrik || file.name.replace(/\.[^.]+$/, ''),
      signed.signedUrl,
      cvText
    )

    return NextResponse.json({ ok: true, cv: cvRow })
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
    const { cvId } = await req.json()

    if (!cvId) return NextResponse.json({ error: 'cvId saknas' }, { status: 400 })

    // Fetch the cv row to find the storage path
    const { data: cvRow } = await getSupabase()
      .from('cv')
      .select('url')
      .eq('id', cvId)
      .eq('kandidat_id', id)
      .single()

    if (cvRow?.url) {
      // Extract path from the signed URL
      const urlObj = new URL(cvRow.url)
      const pathMatch = urlObj.pathname.match(/\/object\/sign\/cvs\/(.+?)(\?|$)/)
      if (pathMatch) {
        await getSupabase().storage.from('cvs').remove([decodeURIComponent(pathMatch[1])])
      }
    }

    await deleteKandidatCVById(cvId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
