import { NextRequest, NextResponse } from 'next/server'
import { readExcel, writeKandidatFlags, writeKandidatCV } from '@/lib/excel'
import { loadSettings } from '@/lib/settings'

export async function GET() {
  try {
    const settings = loadSettings()
    if (!settings.excelPath) {
      return NextResponse.json(
        { error: 'Excel-sökväg ej konfigurerad. Gå till Inställningar.' },
        { status: 400 }
      )
    }
    const data = await readExcel(settings.excelPath)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const settings = loadSettings()
    if (!settings.excelPath) {
      return NextResponse.json({ error: 'Excel-sökväg ej konfigurerad' }, { status: 400 })
    }

    const body = await req.json()
    const { rad, type, ...updates } = body

    if (type === 'flags') {
      writeKandidatFlags(settings.excelPath, rad, updates)
    } else if (type === 'cv') {
      writeKandidatCV(settings.excelPath, rad, updates.cvIndex, updates.url)
    } else {
      return NextResponse.json({ error: 'Okänd uppdateringstyp' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
