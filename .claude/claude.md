# CLAUDE.md — SystemMatch

> Read this file fully before touching any code.
> After every session: update STATUS.md. This is not optional.
> Three files run this project: CLAUDE.md (rules) · STATUS.md (current state) · TASKS.md (what to build)

---

## WHO YOU ARE BUILDING FOR

Lisa is a Swedish job coach in the ROM program (Rusta och Matcha / Arbetsförmedlingen).
She matches 50–60 job seekers (deltagare) to open roles that recruiters post each week.
She uses this app during live client meetings — speed, clarity, and trust are non-negotiable.

Lisa is the product owner. When you are uncertain, ask her. She knows the domain better than you do.

---

## THE CORE SYSTEM — Understand this before touching anything

SystemMatch has a self-improving AI loop at its heart. Everything else is secondary to keeping this loop healthy.

```
Lisa uses app
  → Runs a match (Claude scores deltagare for a job)
  → Sees results she agrees or disagrees with
  → Clicks Feedback on a job card → picks type + writes comment
  → POST /api/feedback → saved to Supabase feedback table

When ≥5 new feedbacks have accumulated:
  → "Förbättra prompt" button activates
  → Lisa clicks → POST /api/improve-prompt
  → Claude reads: current system prompt + up to 30 recent feedbacks
  → Returns revised prompt + list of what changed
  → Lisa reviews diff → clicks "Tillämpa förbättring"
  → Improved prompt saved to Supabase app_settings
  → Next match run uses the new, better prompt
```

This loop is how the app gets better over time without code changes.
A broken loop = the app stops learning. Fix loop bugs before building new features.

### The three feedback types
| Type | Swedish | Purpose |
|---|---|---|
| vinkel | Presentation/angle | How should this candidate be framed to the employer? |
| prioritet | Prioritization | Was this candidate ranked too high or too low? |
| resultat | Outcome | Did this match lead to a hire, rejection, or is it ongoing? |

### Source of truth for the matching prompt
The active matching prompt lives in **Supabase `app_settings` table**.
`lib/settings.ts` (filesystem / /tmp/settings.json) is legacy and must not be used.
`lib/db/settings.ts` with `getDbPrompt()` is the correct path. Always use this.

---

## THE SESSION LOOP — Follow this every time

```
1. READ     → Read STATUS.md. Understand where we are.
2. READ     → Read TASKS.md. Find the next task.
3. CLARIFY  → If anything is unclear, ask Lisa before writing code.
4. BUILD    → Implement the task.
5. TEST     → Run: npm run lint && npm run build
              Fix all errors before moving on. No exceptions.
6. UPDATE   → Update STATUS.md: what changed, what is next, any blockers.
7. REPORT   → Tell Lisa: what was done, what was tested, what comes next.
```

Never silently skip a failing build or lint error.
Never make a product decision without asking Lisa.
Never move to the next task while the current one has unresolved issues.

---

## CLARIFICATION PROTOCOL

Ask Lisa before proceeding if ANY of the following is true:

- You are about to change the database schema
- You are building or modifying matching, scoring, or filtering logic
- You are modifying anything in the feedback → prompt improvement loop
- Requirements can be interpreted in more than one way
- You are about to add a new dependency
- Something in the existing code contradicts these instructions

**How to ask:** Be specific. Not "what do you want?" but:
> "I see two ways to implement X. Option A does [this]. Option B does [that]. Which fits how you work?"

### Mandatory before any matching logic

Before building or modifying matching, scoring, or filtering — stop and ask:

> "Before I build this, can you give me 2–3 examples of a GOOD match and 2–3 examples of a BAD match?
> I need to understand what correct looks like before I write the logic."

Do not guess. Do not assume. Ask.

---

## WHAT IS BUILT

**Stack:** Next.js 15 + TypeScript + Supabase + Anthropic API (claude-sonnet-4-6)  
**Deploy:** Vercel — https://system-match.vercel.app  
**Repo:** https://github.com/L-Lisa/SystemMatch

### Database schema
```
kandidater     → job seekers. cv1/cv2/cv3 text columns = known issue, needs migration
rekryterare    → recruiters. seeded with placeholder names
jobb           → open positions posted by recruiters
feedback       → coaching feedback per match (vinkel / prioritet / resultat)
app_settings   → stores the active matching prompt. Source of truth.
```

### What is built and working
- JWT auth middleware
- Supabase schema + app_settings
- Feedback modal + POST /api/feedback
- POST /api/improve-prompt (Claude reads feedbacks → returns revised prompt)
- "Tillämpa förbättring" → saves to app_settings
- Badge count + threshold UX (≥5 feedbacks activates the button)

### What is NOT yet built
- Matching engine (3-layer architecture — see HOW section)
- Dashboard view
- Export view per recruiter
- matchningar table

---

## KNOWN BUGS — Fix before building new features

These are numbered and tracked in TASKS.md. Do not add new features while these are open.

| # | Bug | Severity |
|---|---|---|
| B1 | Feedback threshold counter lives in localStorage — resets if Lisa clears storage or switches device | High |
| B2 | "Tillämpa förbättring" only sets React state, does not save to Supabase — prompt is lost on refresh | High |
| B3 | /api/improve-prompt has no server-side feedback count check — threshold bypassed by direct POST | Medium |
| B4 | Feedback is never marked as processed — old feedback re-influences every improvement run | Medium |
| B5 | No prompt version history — if an improved prompt makes matches worse, no way to revert | Medium |
| B6 | lib/settings.ts reads from /tmp/settings.json (ephemeral on Vercel) — silently diverges from DB | High |
| B7 | Meta-prompt for improve-prompt is hardcoded in route.ts — cannot be tuned without touching route logic | Low |

---

## HOW — Architecture rules

### Prompt management
- Always use `getDbPrompt()` from `lib/db/settings.ts` to read the active prompt
- Never read from the filesystem (`/tmp/settings.json`) in production code
- When saving a prompt, write to `app_settings` AND create a row in `app_settings_history`

### Feedback loop
- Feedback threshold counter lives in Supabase `app_settings`, not localStorage
- "Processed" feedback has `used_in_improvement = true` — only unprocessed rows are sent to Claude
- After a successful improve-prompt run, mark all used feedback rows as processed
- The improve-prompt meta-prompt lives in `lib/constants/prompts.ts`, not in the route

### Matching engine (when built)
Three independent layers — do not collapse them:
```typescript
passesKeywordFilter(kandidat, jobb): boolean          // Layer 1 — no API call
scoreKandidat(kandidat, jobb): MatchScore              // Layer 2 — no API call
semanticMatch(kandidat, jobb): Promise<MatchResult>   // Layer 3 — Claude API only
```
Claude runs only if Layer 1 = true AND Layer 2 ≥ threshold.
This prevents the rate limit crashes that killed the previous version.

### API routes
- All Anthropic calls go through `app/api/` — never from client components
- Validate all input with Zod before processing
- Handle 429 with exponential backoff: 3 retries at 1s, 2s, 4s
- `max_tokens: 1000` for match responses. Never below 500.

### Database
- Server client (service role) for writes in API routes
- Browser client for reads in client components
- Never expose service role key to the client

### TypeScript
- No `any`. Create an interface if the type is unknown.
- Shared types → `lib/types.ts`
- Zod schemas → `lib/schemas.ts`
- Prompt constants → `lib/constants/prompts.ts`

### After every session
```bash
npm run lint    # zero errors before committing
npm run build   # must succeed
```

---

## NEVER

- Call Claude for every candidate without pre-filtering. This rate-limits and crashes the app.
- Add cvN columns to kandidater. Use a separate cv table.
- Read the matching prompt from the filesystem in production.
- Put ANTHROPIC_API_KEY in client-side code.
- Skip Zod validation on API inputs.
- Build matching logic without first asking Lisa for real examples.
- Leave a failing build and move to the next task.
- Use `"anthropic": "^0.0.0"` — it is a duplicate. Only `@anthropic-ai/sdk` should exist.

---

## DOMAIN GLOSSARY

| Term | Meaning |
|---|---|
| Deltagare / Kandidat | Job seeker in Lisa's coaching program |
| Rekryterare | Recruiter on Lisa's team with open positions |
| Tjänst / Jobb | An open position |
| Matchning | Suggesting a kandidat for a specific jobb |
| Motivering | Claude's written reason why a match makes sense |
| Vinkel | How to frame/present a candidate to an employer |
| ROM / Rusta och Matcha | The Arbetsförmedlingen program Lisa works within |
| Slutdatum | End date of a participant's program period |
| Nystartsjobb | Subsidized employment — affects which jobs a participant can apply for |
| Körkort | Driver's license — common filter requirement |
| app_settings | Supabase table storing the active Claude matching prompt |