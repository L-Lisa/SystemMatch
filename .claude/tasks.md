# TASKS.md — SystemMatch

> Tasks are worked in order. Do not skip.
> Every task has acceptance criteria — you are not done until all criteria pass.
> When a task is complete: mark it ✅, update STATUS.md, then pick the next task.

---

## PHASE 1 — Fix the feedback loop (do these first, in order)

These bugs make the self-improving system unreliable. Nothing else matters until they are fixed.

---

### TASK-01 — Move threshold counter from localStorage to Supabase
**Status:** ✅ Done — 2026-03-28
**Bug:** B1  
**Why it matters:** If Lisa uses a different device or clears her browser, the counter resets and she loses track of how many feedbacks she's given since the last improvement. The loop breaks.

**What to build:**
- Add `feedback_count_since_last_improvement integer default 0` to `app_settings`
- On every successful POST /api/feedback: increment this counter in `app_settings`
- The "Förbättra prompt" button reads this value from Supabase, not localStorage
- Remove all `sm_last_improved_at` and related localStorage reads/writes

**Acceptance criteria:**
- [ ] Counter persists across browser sessions and devices
- [ ] Counter increments correctly after each feedback submission
- [ ] Button activates at exactly 5 — not 4, not 6
- [ ] localStorage is no longer used for this purpose anywhere in the codebase
- [ ] `npm run build` passes

---

### TASK-02 — Make "Tillämpa förbättring" save atomically to Supabase
**Status:** ✅ Done — 2026-03-28
**Bug:** B2  
**Why it matters:** The improved prompt is currently lost on page refresh. Lisa could apply an improvement, close the tab, and the match quality silently reverts. This is a data loss bug.

**What to build:**
- `applyImprovedPrompt()` must write to Supabase `app_settings` in the same operation as setting React state
- Remove the separate manual "Spara inställningar" step — it should be one click
- Add a loading state during save + success/error feedback to Lisa

**Acceptance criteria:**
- [ ] Clicking "Tillämpa förbättring" saves to Supabase in one action
- [ ] Page refresh after applying shows the new prompt is still active
- [ ] Error is shown if the save fails — the prompt is not applied if DB write fails
- [ ] `npm run build` passes

---

### TASK-03 — Add server-side feedback count check to /api/improve-prompt
**Status:** ✅ Done — 2026-03-28
**Bug:** B3  
**Why it matters:** The threshold is currently enforced only in the client. Any direct POST to the endpoint bypasses it. The server must be the authority.

**What to build:**
- In `/api/improve-prompt/route.ts`: before calling Claude, read `feedback_count_since_last_improvement` from `app_settings`
- If count < 5: return `{ error: "Not enough feedback yet" }` with HTTP 400
- Do not proceed to Claude if the threshold is not met

**Acceptance criteria:**
- [ ] Direct POST to /api/improve-prompt with fewer than 5 feedbacks returns 400
- [ ] The route still works correctly when threshold is met
- [ ] `npm run build` passes

---

### TASK-04 — Mark feedbacks as processed after improvement run
**Status:** ✅ Done — 2026-03-28
**Bug:** B4  
**Why it matters:** Every improve-prompt run re-reads all 30 feedbacks, including ones already acted on. Over time, old resolved issues keep influencing new improvements, diluting the signal.

**What to build:**
- Add `used_in_improvement boolean default false` column to `feedback` table (migration)
- In `/api/improve-prompt`: only fetch rows where `used_in_improvement = false`
- After a successful improvement: update all used feedback rows to `used_in_improvement = true`
- Also reset `feedback_count_since_last_improvement` to 0 in `app_settings`
- These two writes must be atomic (do both or neither — use a transaction or check both succeed)

**Acceptance criteria:**
- [ ] Only unprocessed feedbacks are sent to Claude
- [ ] After improvement: all used feedbacks have `used_in_improvement = true`
- [ ] Counter resets to 0 after successful improvement
- [ ] If the Claude call fails, feedback rows are NOT marked as processed
- [ ] `npm run build` passes

---

### TASK-05 — Add prompt version history and rollback
**Status:** ✅ Done — 2026-03-28
**Bug:** B5  
**Why it matters:** If an "improved" prompt makes matches worse, Lisa currently has no way to go back. One bad improvement run could silently degrade match quality with no recovery path.

**What to build:**
- Create `app_settings_history` table in Supabase:
  ```sql
  app_settings_history (
    id uuid primary key default gen_random_uuid(),
    prompt text not null,
    changes_summary text,
    created_at timestamptz default now()
  )
  ```
- Every time a prompt is saved to `app_settings`, also insert the previous prompt into `app_settings_history`
- Add a simple "Versionshistorik" UI — a list of previous prompts with timestamps and change summaries
- Add a "Återställ" (restore) button per version that makes that version the active prompt

**Acceptance criteria:**
- [ ] Every prompt change creates a history row with the old prompt and a summary
- [ ] Lisa can see a list of at least the last 10 versions
- [ ] Restoring a previous version updates `app_settings` and creates a new history entry
- [ ] `npm run build` passes

---

### TASK-06 — Remove filesystem prompt fallback, consolidate to Supabase
**Status:** ✅ Done — 2026-03-28
**Bug:** B6  
**Why it matters:** Vercel's `/tmp` filesystem is ephemeral — it is wiped between deploys. Any prompt saved there is silently lost. The app currently has two conflicting sources of truth.

**What to build:**
- Audit all imports of `lib/settings.ts` — replace every usage with `getDbPrompt()` from `lib/db/settings.ts`
- Delete or deprecate `lib/settings.ts` (or make it a thin wrapper that calls the DB)
- Ensure `getDbPrompt()` has a hardcoded fallback prompt only if `app_settings` has no row yet — not as a silent default that diverges from the DB

**Acceptance criteria:**
- [ ] No production code reads from `/tmp/settings.json`
- [ ] All prompt reads go through `getDbPrompt()`
- [ ] If `app_settings` is empty, a sensible default prompt is inserted into the DB on first run — not returned from the filesystem
- [ ] `npm run build` passes

---

### TASK-07 — Move meta-prompt to constants file
**Status:** 🔲 Not started  
**Bug:** B7  
**Why it matters:** When the meta-prompt needs tuning (it will), we should not have to touch route logic. Separation of concerns.

**What to build:**
- Create `lib/constants/prompts.ts`
- Move the improve-prompt meta-prompt from `app/api/improve-prompt/route.ts` into this file as a named export: `IMPROVE_PROMPT_META`
- Import it back into the route
- Also move the matching system prompt default here as `MATCH_SYSTEM_PROMPT_DEFAULT`

**Acceptance criteria:**
- [ ] `app/api/improve-prompt/route.ts` contains no hardcoded prompt strings
- [ ] `lib/constants/prompts.ts` exists and exports named constants
- [ ] `npm run build` passes

---

## PHASE 2 — Fix the data model

---

### TASK-08 — Migrate CV schema: separate cv table + add PDF support
**Status:** 🔲 Not started  
**Why it matters:** The current `cv1/cv2/cv3` columns on `kandidater` cannot scale, are hard to query, and limit CVs to 3. The v1 app had a proper separate table.

**Before starting this task:** Ask Lisa what CV formats her participants use (DOCX, PDF, or both?).

**What to build:**
- Migration: create `cv` table:
  ```sql
  cv (
    id uuid primary key default gen_random_uuid(),
    kandidat_id uuid not null references kandidater(id) on delete cascade,
    rubrik text not null,
    cv_text text not null default '',
    skapad timestamptz not null default now()
  )
  ```
- Migrate existing `cv1/cv2/cv3` data into the new table
- Remove `cv1/cv2/cv3` columns from `kandidater`
- Install `pdfjs-dist` for PDF parsing (mammoth handles DOCX, already installed)
- CV upload: parse on upload, strip boilerplate, store `cv_text` — never re-parse on match run

**Acceptance criteria:**
- [ ] `cv` table exists with correct schema
- [ ] Existing CV data is migrated — no data loss
- [ ] DOCX upload works via mammoth
- [ ] PDF upload works via pdfjs-dist
- [ ] cv1/cv2/cv3 columns no longer exist on kandidater
- [ ] `npm run build` passes

---

### TASK-09 — Add matchningar table
**Status:** 🔲 Not started  
**Why it matters:** Without this table, match results are not persisted. Every match run is stateless — Lisa cannot see history or compare runs.

**What to build:**
- Migration:
  ```sql
  matchningar (
    id uuid primary key default gen_random_uuid(),
    kandidat_id uuid not null references kandidater(id) on delete cascade,
    jobb_id uuid not null references jobb(id) on delete cascade,
    rekryterare_id uuid not null references rekryterare(id),
    score integer not null,
    ai_motivering text not null default '',
    ai_motivering_redigerad boolean not null default false,
    korning_datum timestamptz not null default now()
  )
  ```
- On new match run for a recruiter: delete existing matchningar for that rekryterare_id, insert new ones

**Acceptance criteria:**
- [ ] Table exists with correct schema
- [ ] Old matchningar are replaced on new run (not accumulated)
- [ ] `npm run build` passes

---

## PHASE 3 — Build the matching engine

### TASK-10 — 3-layer matching engine
**Status:** 🔲 Not started  
**Dependency:** TASK-08 and TASK-09 must be complete first.

**Before starting:** Ask Lisa for 2–3 examples of good matches and 2–3 examples of bad matches.
Do not write a single line of matching logic without these examples.

**What to build:**
Three independent functions in `lib/matching/`:
```typescript
// Layer 1 — keyword pre-filter, no API call
passesKeywordFilter(kandidat: Kandidat, jobb: Jobb): boolean

// Layer 2 — deterministic scoring, no API call  
scoreKandidat(kandidat: Kandidat, jobb: Jobb): MatchScore

// Layer 3 — Claude semantic match, only runs if L1=true AND L2≥threshold
semanticMatch(kandidat: Kandidat, jobb: Jobb): Promise<MatchResult>
```

**Acceptance criteria:**
- [ ] Layer 3 is never called if Layer 1 returns false
- [ ] Layer 3 is never called if Layer 2 score is below threshold
- [ ] A test suite in `__tests__/matching/` validates Layer 1 and Layer 2 with Lisa's real examples
- [ ] Rate limit errors (429) are retried with backoff before failing
- [ ] Results are saved to `matchningar` table
- [ ] `npm run build` passes

---

## PHASE 4 — Views

### TASK-11 — Dashboard view
**Status:** 🔲 Not started  
**Dependency:** TASK-09 and TASK-10 must be complete first.

Ask Lisa: what does she need to see on the dashboard? What decisions does it help her make?

---

### TASK-12 — Export view per recruiter
**Status:** 🔲 Not started  
**Dependency:** TASK-10 must be complete first.

Ask Lisa: what format does she need? Plain text to copy? Or something else?

---

### TASK-13 — Editable AI motivations
**Status:** 🔲 Not started  
**Dependency:** TASK-09 must be complete first.

Lisa should be able to edit `ai_motivering` per match. Edits set `ai_motivering_redigerad = true`.

---

## Completed tasks

None yet.