import { NextRequest, NextResponse } from 'next/server'
import { readCV } from '@/lib/cv-reader'
import { saveMatchningar } from '@/lib/db/matchningar'
import { getSupabase } from '@/lib/supabase'
import { runMatchingEngine } from '@/lib/matching/engine'
import { Kandidat, Jobb } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API-nyckel saknas. Konfigurera den i Vercel-inställningar.' },
        { status: 400 }
      )
    }

    const { jobb, kandidater }: { jobb: Jobb; kandidater: Kandidat[] } = await req.json()

    if (!Array.isArray(kandidater) || kandidater.length === 0) {
      return NextResponse.json({ error: 'Inga kandidater att matcha' }, { status: 400 })
    }
    if (kandidater.length > 60) {
      return NextResponse.json(
        { error: `För många kandidater (${kandidater.length}). Filtrera ned till max 60 och försök igen.` },
        { status: 400 }
      )
    }

    // Build CV text map — prefer stored cv_text, fall back to URL fetch for legacy rows
    const cvErrors: string[] = []
    const cvTexts = new Map<string, string>()

    await Promise.all(
      kandidater.map(async (k) => {
        const stored = k.cvs.filter((cv) => cv.cvText).map((cv) => cv.cvText)
        const toFetch = k.cvs.filter((cv) => !cv.cvText && cv.url)
        const fetched = await Promise.all(toFetch.map((cv) => readCV(cv.url)))

        fetched
          .filter((r) => !r.success)
          .forEach((r) => cvErrors.push(`${k.namn}: ${r.error}`))

        // Cache fetched CV text back to DB so future runs skip the URL fetch
        const db = getSupabase()
        await Promise.all(
          toFetch.map((cv, i) => {
            if (fetched[i].success && fetched[i].text) {
              return db.from('cv').update({ cv_text: fetched[i].text }).eq('id', cv.id)
                .then(({ error }) => {
                  if (error) cvErrors.push(`CV-cache misslyckades för ${k.namn}`)
                })
            }
          })
        )

        const allText = [
          ...stored,
          ...fetched.filter((r) => r.success).map((r) => r.text ?? ''),
        ].join('\n\n---\n\n')

        if (allText) cvTexts.set(k.id, allText)
      })
    )

    const { matchningar, filtered } = await runMatchingEngine(jobb, kandidater, cvTexts, apiKey)

    // Persist results
    const { data: jobbRow } = await getSupabase()
      .from('jobb')
      .select('rekryterare_id')
      .eq('id', jobb.id)
      .single()

    let matchningarWithIds = matchningar
    if (jobbRow?.rekryterare_id && matchningar.length > 0) {
      const idMap = await saveMatchningar(
        matchningar.map((m) => ({
          kandidatId: m.kandidatId,
          jobbId: jobb.id,
          rekryterareId: jobbRow.rekryterare_id as string,
          score: m.score,
          aiMotivering: m.motivering,
          vinkel: m.vinkel,
        }))
      ).catch((e) => {
        console.error('Kunde inte spara matchningar:', e)
        return new Map<string, string>()
      })
      matchningarWithIds = matchningar.map((m) => ({
        ...m,
        matchningId: idMap.get(m.kandidatId),
      }))
    }

    return NextResponse.json({
      matchningar: matchningarWithIds,
      filtered,
      cvErrors: cvErrors.length > 0 ? cvErrors : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
