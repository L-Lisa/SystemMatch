import { getSupabase } from '@/lib/supabase'

export async function getDbPrompt(): Promise<string | null> {
  const { data } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'rekryterarPrompt')
    .single()

  return data?.value || null
}

export async function saveDbPrompt(prompt: string): Promise<void> {
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert({ key: 'rekryterarPrompt', value: prompt, updated_at: new Date().toISOString() })

  if (error) throw new Error(`Kunde inte spara prompt: ${error.message}`)
}
