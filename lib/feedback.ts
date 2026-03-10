import * as fs from 'fs'
import path from 'path'
import { Feedback } from './types'

const FEEDBACK_PATH = path.join(process.cwd(), 'data', 'feedback.json')

export function loadFeedback(): Feedback[] {
  try {
    if (fs.existsSync(FEEDBACK_PATH)) {
      const data = fs.readFileSync(FEEDBACK_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Kunde inte läsa feedback:', e)
  }
  return []
}

export function saveFeedback(feedbackList: Feedback[]): void {
  const dir = path.dirname(FEEDBACK_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedbackList, null, 2), 'utf-8')
}

export function addFeedback(feedback: Omit<Feedback, 'id' | 'timestamp'>): Feedback {
  const list = loadFeedback()
  const newFeedback: Feedback = {
    ...feedback,
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }
  list.push(newFeedback)
  saveFeedback(list)
  return newFeedback
}

export function buildFeedbackContext(jobbId: string, allFeedback: Feedback[]): string {
  const relevant = allFeedback
    .filter((f) => f.jobbId === jobbId || f.jobbId === 'general')
    .slice(-20) // last 20 pieces of feedback

  if (relevant.length === 0) return ''

  const lines = relevant.map((f) => {
    const typ =
      f.typ === 'vinkel'
        ? 'Presentation/vinkel'
        : f.typ === 'prioritet'
          ? 'Prioriteringsfeedback'
          : 'Resultat'
    const result = f.resultat
      ? ` [${f.resultat === 'anställd' ? 'ANSTÄLLD' : f.resultat === 'ej_aktuell' ? 'EJ AKTUELL' : 'PÅGÅENDE'}]`
      : ''
    return `- ${typ}${result} (${f.kandidatNamn} / ${f.jobbTitel}): ${f.kommentar}`
  })

  return `\nLÄRDOMARFRÅN TIDIGARE MATCHNINGAR (ta hänsyn till dessa):\n${lines.join('\n')}`
}
