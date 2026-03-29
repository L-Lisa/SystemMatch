import * as XLSX from 'xlsx'
import * as fs from 'fs'
import path from 'path'
import { Kandidat, Jobb, Rekryterare, ExcelData } from './types'

function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://')
}

async function downloadToTmp(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Kunde inte hämta Excel-filen: HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const tmpPath = path.join('/tmp', 'excel.xlsx')
  fs.writeFileSync(tmpPath, buffer)
  return tmpPath
}

function parseBoolean(val: unknown): boolean {
  if (!val) return false
  const s = String(val).toLowerCase().trim()
  return s === 'ja' || s === 'yes' || s === 'true' || s === '1'
}

function parseDate(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    return val.toLocaleDateString('sv-SE')
  }
  return String(val)
}

// --- Recruiter section detection ---

/** Known candidate column headers (A–H). */
const CANDIDATE_HEADERS = new Set([
  'namn', 'bransch', 'kommentar', 'nystartsjobb',
  'löneanspråk', 'körkort', 'introduktionsjobb', 'slutdatum',
])

/** Patterns that identify a cell as a job field header (not a recruiter name). */
const JOB_FIELD_MAP: [RegExp, keyof Omit<Jobb, 'id' | 'rad'>][] = [
  [/tjänst/i, 'tjänst'],
  [/företag|arbetsgivare/i, 'arbetsgivare'],
  [/^plats$/i, 'plats'],
  [/arbetstid|sysselsättningsgrad/i, 'sysselsattningsgrad'],
  [/omfattning/i, 'sysselsattningsgrad'],
  [/lön/i, 'loneniva'],
  [/^krav$/i, 'krav'],
  [/merit/i, 'meriter'],
  [/presenterad/i, 'presenterad'],
]

/** Extra known field names that are job-related but don't map to Jobb fields. */
const EXTRA_JOB_HEADERS = /uppdatering|förmåner|rekrytering/i

function mapHeaderToField(header: string): keyof Omit<Jobb, 'id' | 'rad'> | null {
  const h = header.trim()
  for (const [pattern, field] of JOB_FIELD_MAP) {
    if (pattern.test(h)) return field
  }
  return null
}

function isKnownFieldHeader(header: string): boolean {
  const h = header.toLowerCase().trim()
  if (CANDIDATE_HEADERS.has(h)) return true
  if (JOB_FIELD_MAP.some(([pat]) => pat.test(header.trim()))) return true
  if (EXTRA_JOB_HEADERS.test(h)) return true
  return false
}

interface RekryterareSection {
  name: string
  /** Map of Jobb field name → column index in the Excel row. */
  fieldMap: Map<keyof Omit<Jobb, 'id' | 'rad'>, number>
}

/**
 * Scan the header row to find recruiter sections.
 *
 * Each recruiter appears as a standalone cell (not matching any known field name),
 * followed by their job field columns. A new recruiter starts when we hit another
 * non-field cell.
 */
function detectRekryterareSections(headerRow: unknown[]): RekryterareSection[] {
  const sections: RekryterareSection[] = []
  let current: RekryterareSection | null = null

  // Start scanning after candidate columns (index 8+)
  for (let col = 8; col < headerRow.length; col++) {
    const raw = String(headerRow[col] || '').replace(/\n/g, ' ').trim()
    if (!raw) continue

    if (!isKnownFieldHeader(raw)) {
      // This is a recruiter name — start new section
      current = { name: raw, fieldMap: new Map() }
      sections.push(current)
    } else if (current) {
      // Map this header to a Jobb field
      const field = mapHeaderToField(raw)
      if (field && !current.fieldMap.has(field)) {
        current.fieldMap.set(field, col)
      }
    }
  }

  return sections
}

/**
 * Parse a single job from a data row using a recruiter's field map.
 * Returns null if no meaningful data is found.
 */
function parseJobFromRow(
  row: unknown[],
  section: RekryterareSection,
  rowIndex: number
): Omit<Jobb, 'id'> | null {
  const get = (field: keyof Omit<Jobb, 'id' | 'rad'>): string => {
    const col = section.fieldMap.get(field)
    if (col === undefined) return ''
    return String(row[col] || '').replace(/\n/g, ' ').trim()
  }

  let tjänst = get('tjänst')
  let arbetsgivare = get('arbetsgivare')

  // If tjänst is empty but arbetsgivare has a value, use it as title
  // (handles cases where the Excel layout puts job titles in the "Företag" column)
  if (!tjänst && arbetsgivare) {
    tjänst = arbetsgivare
    arbetsgivare = ''
  }

  // Need at least a job title to create a record
  if (!tjänst) return null

  return {
    tjänst,
    arbetsgivare,
    plats: get('plats'),
    sysselsattningsgrad: get('sysselsattningsgrad'),
    loneniva: get('loneniva'),
    krav: get('krav'),
    meriter: get('meriter'),
    presenterad: get('presenterad'),
    rad: rowIndex,
  }
}

// --- Main parser ---

export async function readExcel(filePathOrUrl: string): Promise<ExcelData> {
  const filePath = isUrl(filePathOrUrl)
    ? await downloadToTmp(filePathOrUrl)
    : filePathOrUrl

  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel-filen hittades inte: ${filePath}`)
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheet = workbook.Sheets['Blad1']
  if (!sheet) {
    throw new Error('Kunde inte hitta bladet "Blad1" i Excel-filen')
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][]

  // --- Parse candidates (columns A–H, always the same) ---
  const kandidater: Kandidat[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const namn = String(row[0] || '').trim()
    if (!namn) continue

    const branschRaw = String(row[1] || '').trim()
    const merBranschRaw = String(row[2] || '').trim()

    const branschLower = (branschRaw + ' ' + merBranschRaw).toLowerCase()
    const stadsFlag = branschLower.includes('städ')
    const restaurangFlag = branschLower.includes('restaurang')

    const keywordSource = [branschRaw, merBranschRaw].filter(Boolean).join(', ')
    const keywords = keywordSource
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 1 && k.length < 50)

    kandidater.push({
      id: `kandidat-${i}`,
      namn,
      bransch: branschRaw,
      merBransch: merBranschRaw,
      nystartsjobb: parseBoolean(row[3]),
      loneansprak: String(row[4] || '').trim(),
      korkort: parseBoolean(row[5]),
      introduktionsjobb: parseBoolean(row[6]),
      slutdatum: parseDate(row[7]),
      cvs: [],
      stadsFlag,
      restaurangFlag,
      keywords,
      rad: i,
    })
  }

  // --- Detect recruiter sections from header row ---
  const headerRow = rows[0] || []
  const sections = detectRekryterareSections(headerRow)

  // --- Parse jobs for each recruiter ---
  const rekryterare: Rekryterare[] = []

  for (const section of sections) {
    const jobb: Jobb[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue

      const parsed = parseJobFromRow(row, section, i)
      if (parsed) {
        jobb.push({
          id: `jobb-${section.name.toLowerCase()}-${i}`,
          ...parsed,
        })
      }
    }

    if (jobb.length > 0) {
      rekryterare.push({ id: '', namn: section.name, jobb })
    }
  }

  return { kandidater, rekryterare }
}
