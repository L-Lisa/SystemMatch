import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { readCV } from '@/lib/cv-reader'
import { loadSettings } from '@/lib/settings'
import { getDbPrompt } from '@/lib/db/settings'
import { getAllFeedback, buildFeedbackContext } from '@/lib/db/feedback'
import { Kandidat, Jobb } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const settings = loadSettings()
    if (!settings.anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API-nyckel saknas. Konfigurera den i Inställningar.' },
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

    const client = new Anthropic({ apiKey: settings.anthropicApiKey })

    // Read CVs for all candidates
    const kandidaterMedCV = await Promise.all(
      kandidater.map(async (k) => {
        const cvUrls = [k.cv1, k.cv2, k.cv3].filter(Boolean)
        const cvResults = await Promise.all(cvUrls.map(readCV))

        const cvErrors = cvResults.filter((r) => !r.success)
        const cvTexts = cvResults.filter((r) => r.success).map((r) => r.text || '')

        return {
          ...k,
          cvText: cvTexts.join('\n\n---\n\n'),
          cvErrors: cvErrors.map((e) => e.error),
          hasCVErrors: cvErrors.length > 0,
        }
      })
    )

    // Check for CV errors - report them but don't block
    const cvErrorReport = kandidaterMedCV
      .filter((k) => k.hasCVErrors)
      .map((k) => `${k.namn}: ${k.cvErrors.join(', ')}`)

    // Build kandidat summaries for Claude
    const kandidatSummaries = kandidaterMedCV.map((k) => {
      const flags = []
      if (k.korkort) flags.push('Körkort: JA')
      if (k.nystartsjobb) flags.push('Nystartsjobb: JA')
      if (k.introduktionsjobb) flags.push('Introduktionsjobb/Utvecklingsgarantin: JA')
      if (k.loneansprak) flags.push(`Löneanspråk: ${k.loneansprak}`)
      if (k.stadsFlag) flags.push('Erfarenhet: Städ')
      if (k.restaurangFlag) flags.push('Erfarenhet: Restaurang')
      if (k.slutdatum) flags.push(`Slutdatum program: ${k.slutdatum}`)

      return `=== KANDIDAT: ${k.namn} (ID: ${k.id}) ===
Bransch/Kompetenser: ${k.bransch}
${k.merBransch ? `Mer info: ${k.merBransch}` : ''}
${flags.length > 0 ? `Flaggor: ${flags.join(' | ')}` : ''}
${k.cvText ? `CV:\n${k.cvText.slice(0, 3000)}` : '[INGET CV UPPLADDAT - matcha enbart på bransch och flaggor]'}`
    })

    const [allFeedback, dbPrompt] = await Promise.all([getAllFeedback(), getDbPrompt()])
    const feedbackContext = buildFeedbackContext(jobb.id, allFeedback)
    const prompt = dbPrompt || settings.rekryterarPrompt

    const userMessage = `Tjänst att matcha mot:
Titel: ${jobb.tjänst}
Arbetsgivare: ${jobb.arbetsgivare}
Plats: ${jobb.plats}
Krav: ${jobb.krav || 'Inga specifika krav angivna'}
Meriter: ${jobb.meriter || 'Inga meriter angivna'}
${feedbackContext}

Kandidater att matcha:

${kandidatSummaries.join('\n\n')}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\n' + userMessage,
        },
      ],
    })

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    let matchningar
    try {
      const clean = responseText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Inget JSON-svar från Claude')
      const parsed = JSON.parse(jsonMatch[0])
      matchningar = parsed.matchningar
    } catch (e) {
      return NextResponse.json(
        {
          error: `Kunde inte tolka svar från Claude: ${e instanceof Error ? e.message : 'okänt fel'}`,
          rawResponse: responseText,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      matchningar,
      cvErrors: cvErrorReport.length > 0 ? cvErrorReport : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
