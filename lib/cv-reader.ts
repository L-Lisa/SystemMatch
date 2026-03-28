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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY saknas – kan inte läsa PDF')

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Extrahera all text från detta CV. Svara endast med texten, utan kommentarer eller förklaringar.',
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  if (!text || text.trim().length < 20) {
    throw new Error('Kunde inte läsa PDF-innehållet')
  }
  return text
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

