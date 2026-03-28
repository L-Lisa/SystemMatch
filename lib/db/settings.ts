import { getSupabase } from '@/lib/supabase'
import { PromptHistoryEntry } from '@/lib/types'

export async function getDbPrompt(): Promise<string | null> {
  const { data } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'rekryterarPrompt')
    .single()

  return data?.value || null
}

export async function saveDbPrompt(prompt: string, changesSummary?: string): Promise<void> {
  const db = getSupabase()

  // Archive the current prompt before overwriting it
  const current = await getDbPrompt()
  if (current) {
    await db.from('app_settings_history').insert({
      prompt: current,
      changes_summary: changesSummary ?? null,
    })
    // History insert failure is non-fatal — we still save the new prompt
  }

  const { error } = await db
    .from('app_settings')
    .upsert({ key: 'rekryterarPrompt', value: prompt, updated_at: new Date().toISOString() })

  if (error) throw new Error(`Kunde inte spara prompt: ${error.message}`)
}

export async function getPromptHistory(limit = 10): Promise<PromptHistoryEntry[]> {
  const { data, error } = await getSupabase()
    .from('app_settings_history')
    .select('id, prompt, changes_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Kunde inte hämta versionshistorik: ${error.message}`)

  return data.map((row) => ({
    id: row.id as string,
    prompt: row.prompt as string,
    changesSummary: row.changes_summary as string | null,
    createdAt: row.created_at as string,
  }))
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
  const { error } = await getSupabase().rpc('increment_feedback_count')
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
