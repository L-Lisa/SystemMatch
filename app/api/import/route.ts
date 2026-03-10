import { NextRequest, NextResponse } from 'next/server'
import { readExcel } from '@/lib/excel'
import { loadSettings } from '@/lib/settings'
import { upsertKandidater } from '@/lib/db/kandidater'
import { upsertJobb } from '@/lib/db/jobb'

export async function POST(_req: NextRequest) {
  try {
    const settings = loadSettings()
    if (!settings.excelPath) {
      return NextResponse.json(
        { error: 'Excel-sökväg ej konfigurerad. Gå till Inställningar.' },
        { status: 400 }
      )
    }

    const data = await readExcel(settings.excelPath)

    await upsertKandidater(data.kandidater)
    await upsertJobb(data.rekryterare[0].jobb, 'nikola')

    return NextResponse.json({
      ok: true,
      kandidater: data.kandidater.length,
      jobb: data.rekryterare[0].jobb.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
