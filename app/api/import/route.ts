import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import { readExcel } from '@/lib/excel'
import { upsertKandidater } from '@/lib/db/kandidater'
import { upsertJobb } from '@/lib/db/jobb'

export async function POST(req: NextRequest) {
  const tmpPath = '/tmp/import.xlsx'
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx') {
      return NextResponse.json({ error: 'Endast .xlsx-filer stöds' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(tmpPath, buffer)

    const data = await readExcel(tmpPath)

    await upsertKandidater(data.kandidater)

    // Import jobs for ALL recruiters in the Excel (not just the first one)
    let totalJobb = 0
    for (const rek of data.rekryterare) {
      if (rek.jobb.length > 0) {
        await upsertJobb(rek.jobb, rek.namn.toLowerCase())
        totalJobb += rek.jobb.length
      }
    }

    return NextResponse.json({
      ok: true,
      kandidater: data.kandidater.length,
      jobb: totalJobb,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpPath) } catch { /* already gone */ }
  }
}
