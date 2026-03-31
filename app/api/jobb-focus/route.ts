import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase } from '@/lib/supabase'
import { getAllKandidater } from '@/lib/db/kandidater'
import { Kandidat, JobbFocusResultItem } from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { truncateCV } from '@/lib/utils/text'
import { JOBB_FOCUS_SYSTEM_PROMPT } from '@/lib/constants/prompts'
import { jobbFocusPostSchema, jobbFocusPatchSchema } from '@/lib/schemas'

const BATCH_SIZE = 10
const MAX_CV_CHARS = 2500

function buildCandidateBlock(k: Kandidat & { cvText: string }): string {
  const flags = [
    k.korkort && 'Körkort',
    k.nystartsjobb && 'Nystartsjobb',
    k.introduktionsjobb && 'Introduktionsjobb',
    k.stadsFlag && 'Städ',
    k.restaurangFlag && 'Restaurang',
    k.loneansprak && `Lön: ${k.loneansprak}`,
    k.slutdatum && `Slutdatum: ${k.slutdatum}`,
  ].filter(Boolean).join(', ')

  return `--- KANDIDAT: ${k.namn} (ID: ${k.id}) ---
Bransch: ${k.bransch || '–'}
${k.merBransch ? `Mer info: ${k.merBransch}` : ''}
Flaggor: ${flags || 'Inga'}
CV:
${k.cvText ? truncateCV(k.cvText, MAX_CV_CHARS) : '[INGET CV]'}
`
}

function parseClaudeResponse(text: string): JobbFocusResultItem[] {
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

  // Try parsing full text first (safest), fall back to regex extraction
  let parsed: unknown
  try {
    parsed = JSON.parse(clean)
  } catch {
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    parsed = JSON.parse(jsonMatch[0])
  }

  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.results)) return []

  return obj.results.map((r: Record<string, unknown>) => ({
    kandidatId: String(r.kandidatId || ''),
    namn: String(r.namn || ''),
    titel: String(r.titel || ''),
    flaggor: Array.isArray(r.flaggor) ? r.flaggor.map(String) : [],
    motivering: String(r.motivering || ''),
    detaljer: String(r.detaljer || ''),
  }))
}

// POST — run a new Jobb Focus query
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API-nyckel saknas.' }, { status: 400 })
    }

    const body = await req.json()
    const validated = jobbFocusPostSchema.safeParse(body)
    if (!validated.success) {
      const msg = validated.error.issues[0]?.message || 'Ogiltig input.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { prompt } = validated.data

    const kandidater = await getAllKandidater()
    if (kandidater.length === 0) {
      return NextResponse.json({ error: 'Inga kandidater finns. Importera Excel först.' }, { status: 400 })
    }

    // Prepare candidate data with CV text
    const enriched = kandidater.map((k) => ({
      ...k,
      cvText: k.cvs.map((cv) => cv.cvText).filter(Boolean).join('\n\n---\n\n'),
    }))

    // Batch candidates and call Claude sequentially (rate limit safety)
    const client = new Anthropic({ apiKey })
    const allResults: JobbFocusResultItem[] = []
    const totalBatches = Math.ceil(enriched.length / BATCH_SIZE)

    for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
      const batch = enriched.slice(i, i + BATCH_SIZE)
      const candidateBlocks = batch.map(buildCandidateBlock).join('\n')

      const userMessage = `FRÅGA FRÅN JOBBCOACH:
${prompt}

KANDIDATER ATT ANALYSERA (${batch.length} st, batch ${Math.floor(i / BATCH_SIZE) + 1} av ${totalBatches}):

${candidateBlocks}`

      const response = await withRetry(() =>
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: JOBB_FOCUS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        })
      )

      const first = response.content[0]
      const text = first?.type === 'text' ? first.text : ''

      try {
        allResults.push(...parseClaudeResponse(text))
      } catch {
        console.error(`Jobb Focus batch ${Math.floor(i / BATCH_SIZE) + 1} parse error:`, text.slice(0, 200))
      }
    }

    // Save to database
    const db = getSupabase()
    const { data: saved, error: saveError } = await db
      .from('jobb_focus')
      .insert({ prompt, results: allResults })
      .select('id, prompt, results, created_at, updated_at')
      .single()

    if (saveError) {
      console.error('Kunde inte spara Jobb Focus-sökning:', saveError)
      return NextResponse.json({
        id: null,
        prompt,
        results: allResults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      id: saved.id,
      prompt: saved.prompt,
      results: saved.results,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — list saved searches (summaries only — full results loaded per query via [id])
export async function GET() {
  try {
    const db = getSupabase()
    const { data, error } = await db
      .from('jobb_focus')
      .select('id, prompt, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    // Count results without transferring full JSONB — use a separate count query
    // For now, we don't have result count in summary. Add it via DB function if needed.
    return NextResponse.json(
      (data || []).map((row) => ({
        id: row.id,
        prompt: row.prompt,
        createdAt: row.created_at,
      }))
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — update results (after editing)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = jobbFocusPatchSchema.safeParse(body)
    if (!validated.success) {
      const msg = validated.error.issues[0]?.message || 'Ogiltig input.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { id, results } = validated.data

    const db = getSupabase()

    // Verify the row exists
    const { data: existing, error: fetchError } = await db
      .from('jobb_focus')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Sökningen hittades inte.' }, { status: 404 })
    }

    const { error } = await db
      .from('jobb_focus')
      .update({ results })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
