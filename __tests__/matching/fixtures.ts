import { Kandidat, Jobb } from '@/lib/types'

// Real examples from Lisa (2026-03-28)

export const dimitry: Kandidat = {
  id: 'k-dimitry',
  namn: 'Dimitry',
  bransch: 'office 365 utvecklare, tekniker, bygg, öppen',
  merBransch: '',
  nystartsjobb: false,
  loneansprak: '',
  korkort: false,
  introduktionsjobb: false,
  slutdatum: '',
  cvs: [],
  stadsFlag: false,
  restaurangFlag: false,
  keywords: ['office 365 utvecklare', 'tekniker', 'bygg', 'öppen'],
  rad: 1,
}

export const anastasia: Kandidat = {
  id: 'k-anastasia',
  namn: 'Anastasia',
  bransch: 'Admin, cafe, restaurang, hundar',
  merBransch: '',
  nystartsjobb: false,
  loneansprak: '',
  korkort: true,
  introduktionsjobb: false,
  slutdatum: '',
  cvs: [],
  stadsFlag: false,
  restaurangFlag: false,
  keywords: ['Admin', 'cafe', 'restaurang', 'hundar'],
  rad: 2,
}

export const husein: Kandidat = {
  id: 'k-husein',
  namn: 'C. Husein',
  bransch: 'Utvecklare, fullstack, lager, truckkort',
  merBransch: '',
  nystartsjobb: false,
  loneansprak: '',
  korkort: false,
  introduktionsjobb: false,
  slutdatum: '',
  cvs: [],
  stadsFlag: false,
  restaurangFlag: false,
  keywords: ['Utvecklare', 'fullstack', 'lager', 'truckkort'],
  rad: 3,
}

// Jobs from real DB data

/** GOOD for Dimitry — Windows/Microsoft 365 match */
export const jobbMultimindIT: Jobb = {
  id: 'j-multimind-it',
  tjänst: 'it-support',
  arbetsgivare: 'Multimind ab',
  plats: 'Stockholm',
  krav: 'Windows Client, Active Directory, Exchange Online, Microsoft 365 och Intune',
  meriter: '',
  presenterad: '',
  rad: 1,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** BAD for Dimitry — requires Linux, which he lacks */
export const jobbEcceraIT: Jobb = {
  id: 'j-eccera-it',
  tjänst: 'it-support/linuxtekniker',
  arbetsgivare: 'Eccera',
  plats: 'Stockholm',
  krav: '1–3 års arbetslivserfarenhet inom Linux',
  meriter: '',
  presenterad: '',
  rad: 2,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** GOOD for Anastasia — direct restaurang match */
export const jobbRestaurang: Jobb = {
  id: 'j-aspire-restaurang',
  tjänst: 'restaurangbiträde',
  arbetsgivare: 'Aspire lounge Arlanda',
  plats: 'Arlanda',
  krav: '1-2 år erfarenhet',
  meriter: '',
  presenterad: '',
  rad: 3,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** BAD for Anastasia — no städ background */
export const jobbHemsstad: Jobb = {
  id: 'j-cs-stad',
  tjänst: 'Hemstädare',
  arbetsgivare: 'CS Städ AB',
  plats: 'Stockholm',
  krav: '6 månaders erfarenhet',
  meriter: '',
  presenterad: '',
  rad: 4,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** GOOD for Husein — IT/support adjacent */
export const jobbJuniorIT: Jobb = {
  id: 'j-dsource-junior',
  tjänst: 'junior IT/supporttekniker',
  arbetsgivare: 'D-source',
  plats: 'Solna',
  krav: 'UI/UX',
  meriter: '',
  presenterad: '',
  rad: 5,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** BAD for Husein — no sales background */
export const jobbSaljare: Jobb = {
  id: 'j-synoptik-salj',
  tjänst: 'Säljare',
  arbetsgivare: 'Synoptik Sweden AB',
  plats: 'Kungsholmen',
  krav: 'erfarenhet från serviceyrket, gärna från butik',
  meriter: '',
  presenterad: '',
  rad: 6,
  sysselsattningsgrad: '',
  loneniva: '',
}

/** Hard block: körkort required in krav */
export const jobbKorkortKrav: Jobb = {
  id: 'j-korkort',
  tjänst: 'Städledare',
  arbetsgivare: 'Mickes Fönsterputs',
  plats: 'Stockholm',
  krav: 'B-körkort och 5 års erfarenhet',
  meriter: '',
  presenterad: '',
  rad: 7,
  sysselsattningsgrad: '',
  loneniva: '',
} as unknown as Jobb
