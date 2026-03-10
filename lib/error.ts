const TECHNICAL = /Error:|TypeError:|PGRST|JWT|fetch|undefined|null\b|Cannot|Failed|ECONNREFUSED|HTTP \d{3}|syntax error|relation|column/i

/**
 * Strips technical suffixes from error messages so only user-friendly
 * Swedish context is shown. "Kunde inte hämta kandidater: pgrst_error"
 * becomes "Kunde inte hämta kandidater".
 */
export function friendlyError(raw: string): string {
  const parts = raw.split(': ')
  while (parts.length > 1 && TECHNICAL.test(parts[parts.length - 1])) {
    parts.pop()
  }
  return parts.join(': ') || 'Ett fel uppstod, försök igen.'
}
