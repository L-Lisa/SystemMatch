import { z } from 'zod/v4'

// --- Jobb Focus ---

export const jobbFocusPostSchema = z.object({
  prompt: z
    .string()
    .min(5, 'Skriv en fråga med minst 5 tecken.')
    .max(2000, 'Frågan får vara max 2000 tecken.'),
})

export const jobbFocusResultItemSchema = z.object({
  kandidatId: z.string(),
  namn: z.string(),
  titel: z.string(),
  flaggor: z.array(z.string()),
  motivering: z.string(),
  detaljer: z.string(),
})

export const jobbFocusPatchSchema = z.object({
  id: z.uuid('Ogiltigt id-format.'),
  results: z.array(jobbFocusResultItemSchema),
})

export const jobbFocusDeleteSchema = z.object({
  id: z.uuid('Ogiltigt id-format.'),
})
