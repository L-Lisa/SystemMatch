import { supabase } from '@/lib/supabase'
import { Kandidat } from '@/lib/types'

export async function getAllKandidater(): Promise<Kandidat[]> {
  const { data, error } = await supabase
    .from('kandidater')
    .select('*')
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
  const { error } = await supabase
    .from('kandidater')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Kunde inte uppdatera flaggor: ${error.message}`)
}

export async function updateKandidatCV(
  id: string,
  cvIndex: 1 | 2 | 3,
  url: string
): Promise<void> {
  const { error } = await supabase
    .from('kandidater')
    .update({ [`cv${cvIndex}`]: url, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Kunde inte uppdatera CV: ${error.message}`)
}

export async function upsertKandidater(rows: Omit<Kandidat, 'id'>[]): Promise<void> {
  for (const k of rows) {
    const { data: existing } = await supabase
      .from('kandidater')
      .select('id, cv1, cv2, cv3, stads_flag, restaurang_flag')
      .ilike('namn', k.namn.trim())
      .single()

    if (existing) {
      // Excel owns: bransch, merBransch, slutdatum, loneansprak, boolean flags
      // App owns: cv1/2/3, stads_flag, restaurang_flag — never overwritten by import
      await supabase
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
      // New candidate — no CVs yet, uploaded via app
      await supabase.from('kandidater').insert({
        namn: k.namn,
        bransch: k.bransch,
        mer_bransch: k.merBransch,
        nystartsjobb: k.nystartsjobb,
        loneansprak: k.loneansprak,
        korkort: k.korkort,
        introduktionsjobb: k.introduktionsjobb,
        slutdatum: k.slutdatum,
        cv1: '',
        cv2: '',
        cv3: '',
        stads_flag: k.stadsFlag,
        restaurang_flag: k.restaurangFlag,
        keywords: k.keywords,
        excel_rad: k.rad,
        aktiv: true,
      })
    }
  }

  // Mark candidates no longer in Excel as inactive
  const names = rows.map((k) => k.namn.trim().toLowerCase())
  const { data: all } = await supabase.from('kandidater').select('id, namn')
  if (all) {
    const toDeactivate = all.filter((k) => !names.includes(k.namn.toLowerCase()))
    for (const k of toDeactivate) {
      await supabase.from('kandidater').update({ aktiv: false }).eq('id', k.id)
    }
  }
}

function rowToKandidat(row: Record<string, unknown>): Kandidat {
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
    cv1: row.cv1 as string,
    cv2: row.cv2 as string,
    cv3: row.cv3 as string,
    stadsFlag: row.stads_flag as boolean,
    restaurangFlag: row.restaurang_flag as boolean,
    keywords: row.keywords as string[],
    rad: row.excel_rad as number,
  }
}
