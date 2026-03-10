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
  cv1: string
  cv2: string
  cv3: string
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
  namn: string
  jobb: Jobb[]
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

export interface AppSettings {
  excelPath: string
  anthropicApiKey: string
  rekryterarPrompt: string
}

export interface ExcelData {
  kandidater: Kandidat[]
  rekryterare: Rekryterare[]
}
