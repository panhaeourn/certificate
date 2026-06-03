import { escapeAttr, escapeHtml } from '../utils/text'

type FontFile = {
  family: string
  fileName: string
  format: string
  url: string
}

const fontFiles = import.meta.glob('./*.{ttf,otf,woff,woff2}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export const customFonts: FontFile[] = Object.entries(fontFiles)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path
    const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
    return {
      family: fontFamilyFromFileName(fileName),
      fileName,
      format: fontFormat(extension),
      url,
    }
  })
  .sort((a, b) => a.family.localeCompare(b.family))

export function installCustomFonts() {
  if (customFonts.length === 0 || document.querySelector('[data-custom-certificate-fonts]')) return

  const style = document.createElement('style')
  style.dataset.customCertificateFonts = 'true'
  style.textContent = customFonts
    .map((font) => `
      @font-face {
        font-family: "${font.family}";
        src: url("${font.url}") format("${font.format}");
        font-display: swap;
      }
    `)
    .join('\n')
  document.head.append(style)
}

export function fontOptionsHtml(selectedFont: string) {
  return [
    '<option value="">Template default</option>',
    ...customFonts.map((font) => {
      const selected = font.family === selectedFont ? ' selected' : ''
      return `<option value="${escapeAttr(font.family)}"${selected}>${escapeHtml(font.family)}</option>`
    }),
  ].join('')
}

function fontFamilyFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fontFormat(extension: string) {
  if (extension === 'ttf') return 'truetype'
  if (extension === 'otf') return 'opentype'
  if (extension === 'woff2') return 'woff2'
  return 'woff'
}
