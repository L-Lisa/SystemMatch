// CV fetching and parsing - supports PDF and DOCX from URLs (Google Drive etc)

export interface CVReadResult {
  success: boolean
  text?: string
  error?: string
  url: string
}

function transformDriveUrl(url: string): string {
  // Convert Google Drive share links to direct download links
  // https://drive.google.com/file/d/FILE_ID/view -> https://drive.google.com/uc?export=download&id=FILE_ID
  const viewMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (viewMatch) {
    return `https://drive.google.com/uc?export=download&id=${viewMatch[1]}`
  }
  // Already a direct link or other format
  return url
}

async function fetchFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const downloadUrl = transformDriveUrl(url)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SystemMatch/1.0)',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Kunde inte hämta filen från ${url}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Timeout: filen tog för lång tid att hämta (${url})`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = (await import('pdf-parse')) as any
  const pdfParse = pdfParseModule.default ?? pdfParseModule
  const result = await pdfParse(buffer)
  if (!result.text || result.text.trim().length < 50) {
    throw new Error('PDF verkar vara tomt eller oläsbart (kanske skannat bildformat)')
  }
  return result.text
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  if (!result.value || result.value.trim().length < 50) {
    throw new Error('Word-dokumentet verkar vara tomt eller oläsbart')
  }
  return result.value
}

export async function readCV(url: string): Promise<CVReadResult> {
  if (!url || !url.trim()) {
    return { success: false, error: 'Ingen URL angiven', url }
  }

  try {
    const { buffer, contentType } = await fetchFile(url)

    const urlLower = url.toLowerCase()
    const isPDF = contentType.includes('pdf') || urlLower.includes('.pdf')
    const isDOCX =
      contentType.includes('wordprocessingml') ||
      contentType.includes('msword') ||
      urlLower.includes('.docx') ||
      urlLower.includes('.doc')

    let text: string

    if (isPDF) {
      text = await parsePDF(buffer)
    } else if (isDOCX) {
      text = await parseDOCX(buffer)
    } else {
      // Try PDF first, then DOCX
      try {
        text = await parsePDF(buffer)
      } catch {
        try {
          text = await parseDOCX(buffer)
        } catch {
          throw new Error(
            `Okänt filformat (Content-Type: ${contentType}). Stöder PDF och Word (.docx)`
          )
        }
      }
    }

    return { success: true, text: text.trim(), url }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return { success: false, error: message, url }
  }
}

export async function readAllCVs(
  urls: string[]
): Promise<CVReadResult[]> {
  const validUrls = urls.filter((u) => u && u.trim())
  if (validUrls.length === 0) return []
  return Promise.all(validUrls.map(readCV))
}
