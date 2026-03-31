/** Truncate text at a paragraph boundary, with a visible marker. */
export function truncateCV(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const cut = text.lastIndexOf('\n', maxLen)
  return (cut > maxLen * 0.5 ? text.slice(0, cut) : text.slice(0, maxLen)) +
    '\n[...CV avkortat...]'
}
