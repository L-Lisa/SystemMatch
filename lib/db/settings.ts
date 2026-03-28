import { getSupabase } from '@/lib/supabase'
import { PromptHistoryEntry } from '@/lib/types'
import { MATCH_SYSTEM_PROMPT_DEFAULT } from '@/lib/constants/prompts'

export async function getDbPrompt(): Promise<string> {
  const { data } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'rekryterarPrompt')
    .single()

  if (data?.value) return data.value

  // DB has no prompt yet — seed it with the default so subsequent reads are consistent
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert({ key: 'rekryterarPrompt', value: MATCH_SYSTEM_PROMPT_DEFAULT, updated_at: new Date().toISOString() })
  if (error) console.error('Kunde inte seeda standard-prompt:', error.message)

  return MATCH_SYSTEM_PROMPT_DEFAULT
}

export async function saveDbPrompt(prompt: string, changesSummary?: string): Promise<void> {
  const db = getSupabase()

  // Archive the current prompt before overwriting it
  const current = await getDbPrompt()
  if (current) {
    const { error: historyError } = await db.from('app_settings_history').insert({
      prompt: current,
      changes_summary: changesSummary ?? null,
    })
    if (historyError) {
      console.error('Kunde inte spara prompt till historik:', historyError.message)
    }
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

