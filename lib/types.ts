export interface CV {
  id: string
  kandidatId: string
  rubrik: string
  url: string
  cvText: string
  skapad: string
}

export interface Kandidat {
  id: string
  namn: string
  bransch: string
  merBransch: string
  nystartsjobb: boolean
  loneansprak: string
  korkort: boolean
  introduktionsjobb: boolean
  slutdatum: string
  cvs: CV[]
  stadsFlag: boolean
  restaurangFlag: boolean
  keywords: string[]
  rad: number // Excel row index
}

export interface MatchResult {
  kandidatId: string
  score: number
  motivering: string
  vinkel: string
  matchningId?: string // DB id — present after a match run that persisted results
}

export interface Jobb {
  id: string
  tjänst: string
  arbetsgivare: string
  plats: string
  sysselsattningsgrad: string
  loneniva: string
  krav: string
  meriter: string
  presenterad: string
  rad: number
}

export interface Rekryterare {
  id: string
  namn: string
  jobb: Jobb[]
}

export interface Matchning {
  id: string
  kandidatId: string
  jobbId: string
  rekryterareId: string
  score: number
  aiMotivering: string
  vinkel: string
  aiMotiveringRedigerad: boolean
  korningDatum: string
}

export interface Feedback {
  id: string
  kandidatId: string
  kandidatNamn: string
  jobbId: string
  jobbTitel: string
  typ: 'vinkel' | 'prioritet' | 'resultat'
  kommentar: string
  resultat?: 'anställd' | 'ej_aktuell' | 'pågående'
  timestamp: string
}

export interface PromptHistoryEntry {
  id: string
  prompt: string
  changesSummary: string | null
  createdAt: string
}

export interface ExcelData {
  kandidater: Kandidat[]
  rekryterare: Rekryterare[]
}
