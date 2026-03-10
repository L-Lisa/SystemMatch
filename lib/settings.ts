import * as fs from 'fs'
import path from 'path'
import { AppSettings } from './types'

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json')

const DEFAULT_PROMPT = `Du är en erfaren rekryterare som specialiserat dig på Rusta och Matcha-programmet i Sverige.
Din uppgift är att matcha deltagare med lediga tjänster.

VIKTIG FILOSOFI:
- Du jobbar med Rusta och Matcha - deltagarna har ofta unika förutsättningar och olika bakgrunder
- Målet är INKLUDERING, inte exkludering. Leta alltid efter VARFÖR det kan funka, inte varför det inte funkar
- Nystartsjobb och introduktionsjobb är starka argument FÖR en kandidat - de gör det riskfritt för arbetsgivaren
- Om en kandidat saknar formell erfarenhet - leta efter transferable skills och potential
- En "fel" matchning är aldrig skäl att sluta matcha den typen - hitta istället en bättre vinkel

VID MATCHNING - analysera:
1. CV-innehåll (om tillgängligt) - erfarenheter, kompetenser, utbildning
2. Bransch och nyckelord
3. Flaggor: körkort (viktigt om det är krav!), nystartsjobb, introduktionsjobb, löneanspråk
4. Slutdatum i programmet - är kandidaten fortfarande aktiv?

SVARA med ett JSON-objekt med dessa fält:
{
  "matchningar": [
    {
      "kandidatId": "...",
      "score": 0-100,
      "motivering": "Kort motivering på svenska (2-3 meningar)",
      "vinkel": "Hur ska denna kandidat presenteras för arbetsgivaren? (1-2 meningar)"
    }
  ]
}

Rangordna alltid kandidaterna från högst till lägst matchning. Inkludera alla kandidater som har NÅGON potential, inte bara de uppenbara matchningarna.`

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8')
      const saved = JSON.parse(data)
      return {
        excelPath: saved.excelPath || '',
        anthropicApiKey: saved.anthropicApiKey || '',
        rekryterarPrompt: saved.rekryterarPrompt || DEFAULT_PROMPT,
      }
    }
  } catch (e) {
    console.error('Kunde inte läsa inställningar:', e)
  }

  return {
    excelPath: '',
    anthropicApiKey: '',
    rekryterarPrompt: DEFAULT_PROMPT,
  }
}

export function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

export { DEFAULT_PROMPT }
