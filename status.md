# STATUS.md — SystemMatch

> This file is updated after every Cursor session.
> It is the single source of truth for where the project is right now.
> Before starting work: read this. After finishing work: update this.

---

## Last updated
2026-03-28 — Initial baseline from code analysis

---

## Current state: FEEDBACK LOOP BUILT, BUGS NEED FIXING

The self-improving prompt loop is architecturally in place.
Core bugs (B1–B3, B6) are breaking its reliability.
No new features should be built until B1, B2, B3, and B6 are resolved.

---

## What is working

| Feature | Status | Notes |
|---|---|---|
| Auth (JWT middleware) | ✅ Working | middleware.ts + lib/auth.ts |
| Supabase schema | ✅ Working | kandidater, rekryterare, jobb, feedback, app_settings |
| Feedback modal | ✅ Working | POST /api/feedback, saves to Supabase |
| Improve-prompt endpoint | ✅ Working | POST /api/improve-prompt, Claude reads feedbacks |
| Prompt diff + apply UI | ✅ Working | But apply only sets React state — not saved to DB (Bug B2) |
| Badge threshold UX | ✅ Working | But counter lives in localStorage (Bug B1) |

---

## What is broken (must fix before new features)

| Bug | Description | Task |
|---|---|---|
| ~~B1~~ | ~~Threshold counter in localStorage~~ | ✅ TASK-01 done 2026-03-28 |
| ~~B2~~ | ~~"Tillämpa" only sets state — prompt lost on refresh~~ | ✅ TASK-02 done 2026-03-28 |
| ~~B3~~ | ~~No server-side feedback count check on /api/improve-prompt~~ | ✅ TASK-03 done 2026-03-28 |
| ~~B4~~ | ~~Feedback never marked processed~~ | ✅ TASK-04 done 2026-03-28 |
| ~~B5~~ | ~~No prompt version history~~ | ✅ TASK-05 done 2026-03-28 |
| ~~B6~~ | ~~lib/settings.ts reads /tmp/settings.json~~ | ✅ TASK-06 done 2026-03-28 |
| B7 | Meta-prompt hardcoded in route.ts | TASK-07 |

---

## What is not yet built

| Feature | Task |
|---|---|
| CV schema migration (separate cv table + PDF support) | TASK-08 |
| matchningar table | TASK-09 |
| 3-layer matching engine | TASK-10 |
| Dashboard view | TASK-11 |
| Export view per recruiter | TASK-12 |
| Editable AI motivations | TASK-13 |

---

## Additional findings from code review (2026-03-28)

Not yet in TASKS.md — flagged for Lisa to prioritise:

| # | Finding | File | Severity |
|---|---|---|---|
| X1 | RECRUITER_MAP hardcoded in rekryterare page (violates CLAUDE.md NEVER rule) | app/rekryterare/[slug]/page.tsx:10 | Medium |
| X2 | /api/match sends ALL 60 candidates to Claude with zero pre-filtering — same pattern that crashed v1 | app/api/match/route.ts | High |
| X3 | Prompt concatenated into user message instead of using Anthropic `system` parameter | app/api/match/route.ts:90 | Low |
| X4 | upsertKandidater runs N+1 queries (one SELECT per candidate, then UPDATE/INSERT) | lib/db/kandidater.ts:48 | Low |

---

## Known issues in package.json (fix before next deploy)

- `"anthropic": "^0.0.0"` is a duplicate of `@anthropic-ai/sdk` — remove it
- `"next": "16.1.6"` — no stable Next.js 16 exists, verify this should be 15.x

---

## Current blockers

None — ready to start TASK-01.

---

## In progress

Nothing currently in progress.

---

## Session log

| Date | What was done | Who |
|---|---|---|
| 2026-03-28 | Baseline STATUS created from code analysis | Claude (planning) |
| 2026-03-28 | Full code review — confirmed B1–B7, found X1–X4 | Claude |
| 2026-03-28 | TASK-01 complete — counter moved to Supabase, localStorage removed | Claude |
| 2026-03-28 | TASK-02 complete — "Tillämpa" now saves atomically to Supabase | Claude |
| 2026-03-28 | TASK-03 complete — server-side threshold check added to improve-prompt | Claude |
| 2026-03-28 | TASK-04 complete — used_in_improvement column + atomic stored procedure | Claude |
| 2026-03-28 | Code review fixes — atomic increment, feedbackCount UI reset, handleSave cleanup | Claude |
| 2026-03-28 | TASK-05 complete — prompt version history + rollback UI | Claude |

---

> When you start a session: read this file, pick the next open task from TASKS.md.
> When you finish a session: update "In progress", "Session log", and "Current blockers".