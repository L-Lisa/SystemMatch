import { supabase } from '@/lib/supabase'
import { Rekryterare, Jobb } from '@/lib/types'

export async function getAllRekryterare(): Promise<Rekryterare[]> {
  const { data: rekryterare, error } = await supabase
    .from('rekryterare')
    .select('id, namn, slug, jobb(*)')
    .order('namn')

  if (error) throw new Error(`Kunde inte hämta rekryterare: ${error.message}`)

  return rekryterare.map((r) => ({
    namn: r.namn as string,
    jobb: ((r.jobb as Record<string, unknown>[]) || []).map(rowToJobb),
  }))
}

export async function upsertJobb(
  jobbLista: Omit<Jobb, 'id'>[],
  rekryterareSlug: string
): Promise<void> {
  const { data: rek } = await supabase
    .from('rekryterare')
    .select('id')
    .eq('slug', rekryterareSlug)
    .single()

  if (!rek) throw new Error(`Rekryterare "${rekryterareSlug}" finns inte`)

  // Replace all jobs for this recruiter
  await supabase.from('jobb').delete().eq('rekryterare_id', rek.id)

  if (jobbLista.length === 0) return

  await supabase.from('jobb').insert(
    jobbLista.map((j) => ({
      rekryterare_id: rek.id,
      tjänst: j.tjänst,
      arbetsgivare: j.arbetsgivare,
      plats: j.plats,
      sysselsattningsgrad: j.sysselsattningsgrad,
      loneniva: j.loneniva,
      krav: j.krav,
      meriter: j.meriter,
      presenterad: j.presenterad,
      excel_rad: j.rad,
    }))
  )
}

function rowToJobb(row: Record<string, unknown>): Jobb {
  return {
    id: row.id as string,
    tjänst: row['tjänst'] as string,
    arbetsgivare: row.arbetsgivare as string,
    plats: row.plats as string,
    sysselsattningsgrad: row.sysselsattningsgrad as string,
    loneniva: row.loneniva as string,
    krav: row.krav as string,
    meriter: row.meriter as string,
    presenterad: row.presenterad as string,
    rad: row.excel_rad as number,
  }
}
