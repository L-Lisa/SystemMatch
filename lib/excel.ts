import * as XLSX from 'xlsx'
import * as fs from 'fs'
import path from 'path'
import { Kandidat, Jobb, Rekryterare, ExcelData } from './types'

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

export function readExcel(filePath: string): ExcelData {
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
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue // skip empty kandidat rows

    const namn = String(row[0] || '').trim()
    if (!namn) continue

    const branschRaw = String(row[1] || '').trim()
    const merBranschRaw = String(row[2] || '').trim()

    // Detect städ/restaurang flags from bransch text
    const branschLower = (branschRaw + ' ' + merBranschRaw).toLowerCase()
    const stadsFlag = branschLower.includes('städ')
    const restaurangFlag = branschLower.includes('restaurang')

    // Extract keywords from bransch fields
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

    // Jobb on right side (col 13=N tjänst, 14=O arbetsgivare, 15=P plats, 16=Q syss, 17=R lön, 18=S krav, 19=T meriter, 20=U presenterad)
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

export function writeKandidatFlags(
  filePath: string,
  rad: number,
  updates: {
    nystartsjobb?: boolean
    korkort?: boolean
    introduktionsjobb?: boolean
    stadsFlag?: boolean
    restaurangFlag?: boolean
    bransch?: string
  }
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel-filen hittades inte: ${filePath}`)
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheet = workbook.Sheets['Blad1']

  // Columns: D=3=nystartsjobb, F=5=körkort, G=6=introduktionsjobb, B=1=bransch
  const excelRow = rad + 1 // XLSX is 1-indexed

  if (updates.nystartsjobb !== undefined) {
    const cell = XLSX.utils.encode_cell({ r: rad, c: 3 })
    sheet[cell] = { t: 's', v: updates.nystartsjobb ? 'ja' : 'nej' }
  }
  if (updates.korkort !== undefined) {
    const cell = XLSX.utils.encode_cell({ r: rad, c: 5 })
    sheet[cell] = { t: 's', v: updates.korkort ? 'ja' : 'nej' }
  }
  if (updates.introduktionsjobb !== undefined) {
    const cell = XLSX.utils.encode_cell({ r: rad, c: 6 })
    sheet[cell] = { t: 's', v: updates.introduktionsjobb ? 'ja' : 'nej' }
  }
  if (updates.bransch !== undefined) {
    const cell = XLSX.utils.encode_cell({ r: rad, c: 1 })
    sheet[cell] = { t: 's', v: updates.bransch }
  }

  XLSX.writeFile(workbook, filePath)
}

export function writeKandidatCV(
  filePath: string,
  rad: number,
  cvIndex: 1 | 2 | 3,
  url: string
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel-filen hittades inte: ${filePath}`)
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheet = workbook.Sheets['Blad1']

  // CV1=col 8(I), CV2=col 9(J), CV3=col 10(K)
  const col = 7 + cvIndex
  const cell = XLSX.utils.encode_cell({ r: rad, c: col })
  sheet[cell] = { t: 's', v: url }

  XLSX.writeFile(workbook, filePath)
}
