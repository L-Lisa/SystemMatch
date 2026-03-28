import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDbPrompt, getFeedbackCount } from '@/lib/db/settings'
import { getUnprocessedFeedback, markFeedbackProcessed } from '@/lib/db/feedback'

export async function POST() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API-nyckel saknas' }, { status: 400 })
    }

    const [unprocessedFeedback, currentPrompt, feedbackCount] = await Promise.all([
      getUnprocessedFeedback(),
      getDbPrompt(),
      getFeedbackCount(),
    ])

    if (feedbackCount < 5) {
      return NextResponse.json(
        { error: `Minst 5 nya feedbacks krävs (${feedbackCount} just nu)` },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey })

    const feedbackText = unprocessedFeedback
      .slice(0, 30)
      .map(
        (f) =>
          `[${f.typ}] ${f.kandidatNamn} / ${f.jobbTitel}${f.resultat ? ` (${f.resultat})` : ''}: ${f.kommentar}`
      )
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Du hjälper en jobbcoach att förbättra sin matchnings-prompt för ett Rusta och Matcha-program.

NUVARANDE PROMPT:
${currentPrompt}

INSAMLAD FEEDBACK (de senaste matchningarna):
${feedbackText}

Analysera feedbacken och föreslå konkreta förbättringar till prompten.
- Behåll kärnfilosofin om inkludering och Rusta och Matcha
- Föreslå specifika tillägg eller ändringar baserat på mönster i feedbacken
- Svara med en förbättrad version av hela prompten

Svara med JSON: { "forbattradPrompt": "...", "vad_andrades": ["punkt 1", "punkt 2"] }`,
        },
      ],
    })

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    const clean = responseText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Inget JSON-svar från Claude')
    const parsed = JSON.parse(jsonMatch[0])

    // Claude succeeded — mark all unprocessed feedback as consumed and reset counter.
    // If this cleanup fails we log it but still return the result — the improvement is valid.
    await markFeedbackProcessed().catch((e) =>
      console.error('Kunde inte markera feedback som behandlad:', e)
    )

    return NextResponse.json({
      forbattradPrompt: parsed.forbattradPrompt,
      vadAndrades: parsed.vad_andrades || [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
