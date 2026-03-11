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

  const kandidater: Kandidat[] = []
  const jobbNikola: Jobb[] = []

  // Row 0 = headers, data starts at row 1
  // Two separate passes: candidates and jobs can appear on independent rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    // Candidates: column A must have a name
    const namn = String(row[0] || '').trim()
    if (namn) {
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
        cv1: String(row[8] || '').trim(),
        cv2: String(row[9] || '').trim(),
        cv3: String(row[10] || '').trim(),
        stadsFlag,
        restaurangFlag,
        keywords,
        rad: i,
      })
    }

    // Jobs: column N (index 13) must have a title — independent of whether there's a candidate on this row
    const tjänst = String(row[13] || '').trim()
    if (tjänst) {
      jobbNikola.push({
        id: `jobb-nikola-${i}`,
        tjänst,
        arbetsgivare: String(row[14] || '').trim(),
        plats: String(row[15] || '').trim(),
        sysselsattningsgrad: String(row[16] || '').trim(),
        loneniva: String(row[17] || '').trim(),
        krav: String(row[18] || '').trim(),
        meriter: String(row[19] || '').trim(),
        presenterad: String(row[20] || '').trim(),
        rad: i,
      })
    }
  }

  const rekryterare: Rekryterare[] = [
    { namn: 'Nikola', jobb: jobbNikola },
    { namn: 'Rekryterare 2', jobb: [] },
    { namn: 'Rekryterare 3', jobb: [] },
    { namn: 'Rekryterare 4', jobb: [] },
  ]

  return { kandidater, rekryterare }
}
