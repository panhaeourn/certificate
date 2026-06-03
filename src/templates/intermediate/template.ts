import type { CertificateRow } from '../../types'
import { escapeHtml, normalize } from '../../utils/text'

const fieldAliases = {
  recipientName: ['english', 'name', 'recipient_name', 'recipient name', 'student name', 'full name'],
  khmerText: ['khmer', 'khmer_text', 'khmer text'],
  englishText: ['english', 'english_text', 'english text'],
  recipientPhoto: ['picture', 'recipient_photo', 'recipient photo', 'photo', 'image'],
} as const

type FieldKey = keyof typeof fieldAliases

export const intermediateTemplate = {
  name: 'Intermediate certificate',
  description: 'Khmer and English certificate layout.',
  embeddedImageColumn: 'picture',
  columns: [
    'khmer',
    'english',
  ],
  columnHelp: [
    'khmer',
    'english',
  ],
  value,
  renderCertificate,
}

function value(row: CertificateRow, key: FieldKey) {
  for (const alias of fieldAliases[key]) {
    const found = row[normalize(alias)]
    if (found) return found
  }
  return ''
}

function renderCertificate(row: CertificateRow, index: number) {
  return `
    <article class="certificate certificate--intermediate" aria-label="Intermediate certificate ${index + 1}">
      <div class="fill fill-intermediate-khmer" data-font-field="khmer">${escapeHtml(value(row, 'khmerText'))}</div>
      <div class="fill fill-intermediate-english" data-font-field="english">${escapeHtml(value(row, 'englishText'))}</div>
    </article>
  `
}
