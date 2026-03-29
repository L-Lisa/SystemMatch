import { getSupabase } from '@/lib/supabase'
import { Kandidat, CV } from '@/lib/types'

export async function getAllKandidater(): Promise<Kandidat[]> {
  const { data, error } = await getSupabase()
    .from('kandidater')
    .select('*, cv(id, kandidat_id, rubrik, url, cv_text, skapad)')
    .eq('aktiv', true)
    .order('namn')

  if (error) throw new Error(`Kunde inte hämta kandidater: ${error.message}`)

  return data.map(rowToKandidat)
}

export async function updateKandidatFlags(
  id: string,
  updates: Partial<{
    nystartsjobb: boolean
    korkort: boolean
    introduktionsjobb: boolean
    stads_flag: boolean
    restaurang_flag: boolean
    bransch: string
  }>
): Promise<void> {
  const { error } = await getSupabase()
    .from('kandidater')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Kunde inte uppdatera flaggor: ${error.message}`)
}

export async function insertKandidatCV(
  kandidatId: string,
  rubrik: string,
  url: string,
  cvText: string
): Promise<CV> {
  const { data, error } = await getSupabase()
    .from('cv')
    .insert({ kandidat_id: kandidatId, rubrik, url, cv_text: cvText })
    .select()
    .single()

  if (error) throw new Error(`Kunde inte spara CV: ${error.message}`)
  return rowToCV(data)
}

export async function deleteKandidatCVById(cvId: string): Promise<void> {
  const { error } = await getSupabase().from('cv').delete().eq('id', cvId)
  if (error) throw new Error(`Kunde inte ta bort CV: ${error.message}`)
}

/** Normalize a name: trim, collapse whitespace, title-case. */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export async function upsertKandidater(rows: Omit<Kandidat, 'id' | 'cvs'>[]): Promise<void> {
  const db = getSupabase()

  for (const k of rows) {
    const namn = normalizeName(k.namn)
    const { data: existing } = await db
      .from('kandidater')
      .select('id, stads_flag, restaurang_flag')
      .ilike('namn', namn)
      .single()

    if (existing) {
      // Excel owns: bransch, merBransch, slutdatum, loneansprak, boolean flags
      // App owns: cv rows, stads_flag, restaurang_flag — never overwritten by import
      await db
        .from('kandidater')
        .update({
          bransch: k.bransch,
          mer_bransch: k.merBransch,
          nystartsjobb: k.nystartsjobb,
          loneansprak: k.loneansprak,
          korkort: k.korkort,
          introduktionsjobb: k.introduktionsjobb,
          slutdatum: k.slutdatum,
          keywords: k.keywords,
          excel_rad: k.rad,
          aktiv: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await db.from('kandidater').insert({
        namn,
        bransch: k.bransch,
        mer_bransch: k.merBransch,
        nystartsjobb: k.nystartsjobb,
        loneansprak: k.loneansprak,
        korkort: k.korkort,
        introduktionsjobb: k.introduktionsjobb,
        slutdatum: k.slutdatum,
        stads_flag: k.stadsFlag,
        restaurang_flag: k.restaurangFlag,
        keywords: k.keywords,
        excel_rad: k.rad,
        aktiv: true,
      })
    }
  }

  // Mark candidates no longer in Excel as inactive
  const names = rows.map((k) => normalizeName(k.namn).toLowerCase())
  const { data: all } = await db.from('kandidater').select('id, namn').eq('aktiv', true)
  if (all) {
    const toDeactivate = all.filter((k) => !names.includes(k.namn.toLowerCase()))
    for (const k of toDeactivate) {
      await db.from('kandidater').update({ aktiv: false }).eq('id', k.id)
    }
  }
}

function rowToCV(row: Record<string, unknown>): CV {
  return {
    id: row.id as string,
    kandidatId: (row.kandidat_id as string) || '',
    rubrik: row.rubrik as string,
    url: row.url as string,
    cvText: (row.cv_text as string) || '',
    skapad: row.skapad as string,
  }
}

function rowToKandidat(row: Record<string, unknown>): Kandidat {
  const cvRows = Array.isArray(row.cv) ? (row.cv as Record<string, unknown>[]) : []
  return {
    id: row.id as string,
    namn: row.namn as string,
    bransch: row.bransch as string,
    merBransch: row.mer_bransch as string,
    nystartsjobb: row.nystartsjobb as boolean,
    loneansprak: row.loneansprak as string,
    korkort: row.korkort as boolean,
    introduktionsjobb: row.introduktionsjobb as boolean,
    slutdatum: row.slutdatum as string,
    cvs: cvRows.map(rowToCV),
    stadsFlag: row.stads_flag as boolean,
    restaurangFlag: row.restaurang_flag as boolean,
    keywords: row.keywords as string[],
    rad: row.excel_rad as number,
  }
}
