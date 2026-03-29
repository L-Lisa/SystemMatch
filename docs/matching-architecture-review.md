# Matchningsarkitektur — Analys och förslag

> Författare: Claude (AI-assisterad arkitekturanalys)
> Datum: 2026-03-29
> Status: Förslag — inväntar granskning och beslut
> Kontext: Lisa betalar API-kostnaderna ur egen ficka. Kostnadsoptimering är kritiskt.

---

## Sammanfattning

SystemMatch använder Anthropic Claude API för att matcha jobbsökande mot lediga
tjänster i Rusta och Matcha-programmet. Nuvarande arkitektur anropar Claude Sonnet
(den dyraste modellen) för varje kandidat-jobb-kombination och genererar motivering
+ vinkel oavsett om Lisa behöver den. Det mesta arbetet slösas på kandidater som
aldrig presenteras.

Denna analys föreslår tre alternativa arkitekturer med olika pris/kvalitets-avvägningar.

---

## 1. Nuvarande arkitektur

### Flöde

```
Lisa klickar "Matcha" på EN tjänst
  → Layer 1: Körkort-filter (lokal, gratis)
  → Layer 2: Nyckelords-scoring (lokal, gratis) — sorterar kandidater
  → Layer 3: Topp 15 skickas till Claude Sonnet, EN I TAGET
     → Varje anrop: system-prompt + jobb + kandidat + CV → score + motivering + vinkel
     → 15 separata API-anrop, batchar om 5 parallella
  → Alla 15 motiveringar genereras oavsett om Lisa läser dem
```

### Problem

1. **System-prompt + jobbeskrivning upprepas 15 gånger** per matchning (~480 tokens × 15).
2. **Claude ser bara EN kandidat** — kan inte jämföra eller rangordna relativt.
3. **Layer 2 (nyckelord) avgör vem som når Claude** — trots att avsikten var att
   låta AI göra bedömningen. Kandidater med "fel" nyckelord blockeras.
4. **Motiveringar genereras för alla 15** — men Lisa presenterar vanligtvis 3–5
   kandidater per tjänst. Resten är slösade API-anrop.

### Kostnadsberäkning

**Priser (Anthropic, uppskattade):**

| Modell | Input-tokens | Output-tokens |
|--------|-------------|--------------|
| Claude Sonnet 4.6 | ~$3 / miljon | ~$15 / miljon |
| Claude Haiku 4.5 | ~$0.80 / miljon | ~$4 / miljon |

**Per Sonnet-anrop:**

| Del | Tokens | Typ |
|-----|--------|-----|
| System-prompt | ~400 | input |
| Jobbeskrivning | ~80 | input |
| Kandidat + flaggor | ~60 | input |
| CV-text (trunkerad) | ~750 | input |
| Score + motivering + vinkel | ~150 | output |
| **Totalt** | **~1 290 in + 150 out** | |

Kostnad per anrop: 1 290 × $3/M + 150 × $15/M = **~$0.006**

**Per matchkörning (1 jobb, 15 anrop):**
15 × $0.006 = **~$0.09**

**Skalning:**

| Scenario | Kostnad |
|----------|---------|
| 1 jobb | $0.09 |
| 10 jobb per dag | $0.90 / dag |
| 300 jobb (alla rekryterare) | $27 |
| 300 jobb × 4 veckor | $108 / månad |

### Var slösas pengarna?

Av de 15 motiveringar som genereras per jobb läser Lisa kanske 5. De övriga 10
kostade ~$0.06 utan att skapa värde. Det är **67% slöseri**.

---

## 2. Föreslagna alternativ

### Alt A: Haiku-screening + motivering on-demand (rekommenderat)

```
Lisa klickar "Matcha"
  → Steg 0: Körkort-filter (gratis)
  → Steg 1: Haiku screenar ALLA ~40 kandidater i ETT anrop
     → Input: jobb + alla kandidater (namn + bransch + 200 tecken CV)
     → Output: score 0–100 per kandidat, INGEN motivering
     → 1 API-anrop
  → Lisa ser rankad lista med scores
  → Lisa klickar "Visa motivering" på de kandidater hon vill presentera
  → Steg 2: Sonnet genererar motivering + vinkel för JUST DEN kandidaten
     → 1 API-anrop per klick
```

**Haiku-screening (Steg 1):**

| Del | Tokens |
|-----|--------|
| Screening-prompt | ~200 in |
| Jobbeskrivning | ~80 in |
| 40 kandidater × ~85 tokens (namn + bransch + CV-snippet) | ~3 400 in |
| 40 scores i JSON-array | ~500 out |
| **Totalt** | **~3 680 in + 500 out** |

Kostnad: 3 680 × $0.80/M + 500 × $4/M = **~$0.005**

**Sonnet-motivering on-demand (Steg 2):**

Samma som nuvarande per-anrop: **~$0.006** per kandidat Lisa klickar på.

**Total kostnad per jobb (Lisa presenterar 3–5 kandidater):**

| Del | Kostnad |
|-----|---------|
| Haiku screening (alla 40) | $0.005 |
| 4 Sonnet-motiveringar (on-demand) | $0.024 |
| **Totalt** | **~$0.03** |

**Jämförelse:**

| | Nuvarande | Alt A |
|---|---|---|
| Per jobb | $0.09 | $0.03 |
| 300 jobb | $27 | $9 |
| Per månad (300 jobb/vecka) | $108 | $36 |
| Kandidater som screenas av AI | 15 av 40 | alla 40 |
| Slösade motiveringar | ~10 per jobb | 0 |

**Besparing: ~67%.** Och bättre kvalitet — alla kandidater screenas av AI istället
för nyckelordsmatchning.

**Risker:**
- Haiku kan missa bra kandidater i screeningen (mitigation: inkludera CV-snippet)
- Lisa behöver ett extra klick per motivering (UX-förändring)
- Om Haiku-anropet misslyckas fallerar hela matchningen (mitigation: retry-logik)

---

### Alt B: Haiku för allt (billigast möjligt)

```
Lisa klickar "Matcha"
  → Körkort-filter (gratis)
  → Haiku screenar alla kandidater (1 anrop, ~$0.005)
  → Haiku genererar motivering för topp 10 (10 anrop, ~$0.01)
  → Totalt: ~$0.015 per jobb
```

| | Nuvarande | Alt B |
|---|---|---|
| Per jobb | $0.09 | $0.015 |
| 300 jobb | $27 | $4.50 |
| Per månad | $108 | $18 |

**Besparing: 83%.** Men motiverings-kvaliteten sjunker. Haiku skriver kortare,
mindre nyanserade texter. Lisa använder motiveringar i kundmöten — kvaliteten
spelar roll.

---

### Alt C: Lokal scoring + AI-motivering on-demand (billigast)

```
Lisa klickar "Matcha"
  → Körkort-filter (gratis)
  → Layer 2 nyckelords-scoring (gratis) — visar rankad lista
  → Lisa klickar "Motivering" per kandidat hon vill presentera
  → Sonnet genererar motivering + vinkel (1 anrop, $0.006)
```

| | Nuvarande | Alt C |
|---|---|---|
| Per jobb | $0.09 | $0.018* |
| 300 jobb | $27 | $5.40* |
| Per månad | $108 | $22* |

*Förutsatt 3 motiveringar per jobb.

**Besparing: 80%.** Men rankingen baseras på nyckelord — tillbaka till problemet
att "budbilschaufför" och "chaufför" inte matchar. Ingen AI i screening-steget.

**Fördel:** Enklast att implementera (minst kodändring).

---

## 3. Övriga kostnader att ha koll på

| Funktion | Modell | När | Kostnad |
|----------|--------|-----|---------|
| CV-parsning (PDF) | Haiku | Vid uppladdning, EN gång per CV | ~$0.003 / CV |
| CV-parsning (DOCX) | Ingen (mammoth) | Vid uppladdning | Gratis |
| Promptförbättring | Sonnet | Var 5:e feedback (~1 gång/vecka) | ~$0.02 / körning |
| Prompt-historik | Ingen | Lokal DB | Gratis |

CV-parsning och promptförbättring är engångskostnader / sällsynta — försumbara.

---

## 4. Jämförelsetabell

| | Nuvarande | Alt A (rek.) | Alt B | Alt C |
|---|---|---|---|---|
| Kostnad 300 jobb | $27 | $9 | $4.50 | $5.40 |
| Screening | Nyckelord (15 av 40) | Haiku AI (alla 40) | Haiku AI (alla 40) | Nyckelord (alla) |
| Motivering | Auto (alla 15) | On-demand (3–5) | Auto (Haiku, 10) | On-demand (3–5) |
| Motiverings-kvalitet | Hög (Sonnet) | Hög (Sonnet) | Medel (Haiku) | Hög (Sonnet) |
| UX-förändring | Ingen | Extra klick | Ingen | Extra klick |
| Implementationsinsats | — | ~4h | ~4h | ~2h |
| Rättvisa (alla screenas) | Nej | Ja | Ja | Nej |

---

## 5. Rekommendation

**Alt A (Haiku-screening + Sonnet on-demand)** ger bäst balans:
- 67% billigare än nuvarande
- Bättre kvalitet (alla screenas av AI, inga nyckelords-missade kandidater)
- Motiveringar behåller Sonnet-kvalitet
- Lisa betalar bara för motiveringar hon faktiskt använder
- Enda nackdelen: ett extra klick per kandidat hon vill se motivering för

Om kostnad är viktigare än motiverings-kvalitet: **Alt B** (Haiku för allt, $4.50
per 300 jobb) är värt att testa.

---

## 6. Teknisk implementation (Alt A)

### Nya filer

**`lib/matching/screening.ts`** — Haiku batch-screening
```typescript
// Skickar alla kandidater + jobb till Haiku i ETT anrop
// Returnerar Map<kandidatId, score>
export async function screenCandidates(
  kandidater: Kandidat[],
  jobb: Jobb,
  cvSummaries: Map<string, string>, // 200 tecken per kandidat
  client: Anthropic
): Promise<Map<string, number>>
```

**`lib/constants/prompts.ts`** — Ny screening-prompt
```typescript
export const SCREENING_PROMPT = `Du screenar kandidater för en tjänst...
Svara med JSON: [{"id":"...","score":0-100}, ...]
Ingen motivering. Bara score.`
```

### Ändringar i befintliga filer

**`lib/matching/engine.ts`:**
```
Nuvarande: L1 → L2 → top 15 → Sonnet (15 anrop)
Nytt:      L1 → Haiku screening (1 anrop) → returnera rankad lista med scores
```

**`app/api/match/route.ts`:**
- Matchnings-API:t returnerar bara scores (ingen motivering)
- Ny endpoint: `POST /api/match/motivering` — genererar motivering för EN kandidat

**`app/rekryterare/[slug]/page.tsx`:**
- Visa rankad lista med scores
- "Visa motivering"-knapp per kandidat (anropar `/api/match/motivering`)
- Motivering laddas in asynkront, visas under kandidaten

### Uppskattad arbetsinsats
- screening.ts + prompt: 2h
- engine.ts omskrivning: 1h
- Ny motivering-endpoint: 30min
- UI-uppdatering: 1h
- Tester: 30min
- **Totalt: ~5h**

### Bakåtkompatibilitet
- MatchResult får nytt fält: `motiveringLoaded: boolean`
- matchningar-tabellen behöver kolumn `motivering_generated: boolean`
- Exportfunktionen behöver hantera kandidater utan motivering

---

## 7. Om projektet lämnas över

### Vad en ny utvecklare behöver veta

1. **Stack:** Next.js 16 + TypeScript + Supabase (EU Frankfurt) + Anthropic API
2. **Deploy:** Vercel, https://system-match.vercel.app
3. **Auth:** HMAC-SHA256 med httpOnly cookie, lösenord via env var
4. **Kostnadskänsligt:** Lisa betalar API-kostnader ur egen ficka. Varje Claude-anrop
   kostar pengar. Optimera för färre anrop, inte fler.

### Kritiska designbeslut

- **Aldrig anropa Claude för alla kandidater utan filtrering** — v1 kraschade av detta
- **CV-text cachas i DB vid upload** — readCV() ska bara köras en gång
- **Prompten lever i Supabase** — inte i filsystemet, inte i koden
- **Feedback-loopen** (feedback → förbättra prompt → bättre matchningar) är
  systemets kärna — bryt den inte

### Filer att börja med

| Fil | Beskrivning |
|-----|-------------|
| `.claude/CLAUDE.md` | Projektregler och arkitektur |
| `STATUS.md` | Var projektet är just nu |
| `.claude/tasks.md` | Uppgiftslista (alla 13 klara) |
| `docs/matching-architecture-review.md` | Detta dokument |
| `lib/matching/engine.ts` | Matchningsmotorn — startpunkt |
| `lib/constants/prompts.ts` | Alla AI-prompter |

### Env-variabler

```
ANTHROPIC_API_KEY     — Anthropic API-nyckel (kostar pengar!)
SUPABASE_URL          — Supabase projekt-URL
SUPABASE_ANON_KEY     — Supabase public key
SUPABASE_SERVICE_ROLE_KEY — Supabase admin key (bara server-side)
ADMIN_PASSWORD        — Inloggningslösenord
```

### Databas-schema (Supabase)

```
kandidater     — deltagare i ROM-programmet
cv             — CV-filer per kandidat (text cachat)
rekryterare    — rekryterare med slugs
jobb           — tjänster per rekryterare
matchningar    — matchresultat (score + motivering + vinkel)
feedback       — Lisas feedback per match
app_settings   — aktiv matchnings-prompt
app_settings_history — prompt-versioner
```
