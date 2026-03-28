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

export async function getFeedbackCount(): Promise<number> {
  const { data } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'feedback_count_since_last_improvement')
    .single()

  return data ? parseInt(data.value, 10) || 0 : 0
}

export async function incrementFeedbackCount(): Promise<void> {
  const current = await getFeedbackCount()
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert({
      key: 'feedback_count_since_last_improvement',
      value: String(current + 1),
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Kunde inte uppdatera feedback-räknare: ${error.message}`)
}

export async function resetFeedbackCount(): Promise<void> {
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert({
      key: 'feedback_count_since_last_improvement',
      value: '0',
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Kunde inte nollställa feedback-räknare: ${error.message}`)
}
