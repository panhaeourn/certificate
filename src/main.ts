import './style.css'
import {
  Award,
  Download,
  FileDown,
  FileSpreadsheet,
  GraduationCap,
  Images,
  LayoutTemplate,
  LoaderCircle,
  Printer,
  Type,
} from 'lucide'
import * as XLSX from 'xlsx'
import { customFonts, fontOptionsHtml, installCustomFonts } from './fonts/fontRegistry'
import { readSpreadsheet } from './spreadsheet/readSpreadsheet'
import { intermediateTemplate } from './templates/intermediate/template'
import { jianhuaTemplate as certificateTemplate } from './templates/jianhua/template'
import type { CertificateRow } from './types'
import { buttonLabel, renderIcon } from './ui/icons'
import { escapeHtml, normalize } from './utils/text'

let rows: CertificateRow[] = []
let externalImageUrls = new Map<string, string>()
let externalImageFileCount = 0
let embeddedObjectUrls: string[] = []
let selectedSheetName = 'No spreadsheet selected'
let selectedImageSummary = 'No images selected'
let selectedCertificateLevel = 'Intermediate'
let errorMessage = ''
let selectedFontField = ''

const selectedFieldFonts = {
  name: '',
  gender: '',
  birthDate: '',
  studyDate: '',
  issueDate: '',
  labels: '',
  khmer: '',
  english: '',
}

const fontFieldLabels: Record<keyof typeof selectedFieldFonts, string> = {
  name: 'Student name',
  gender: 'Gender',
  birthDate: 'Birth date',
  studyDate: 'Study date',
  issueDate: 'Issue date',
  labels: 'Fixed labels',
  khmer: 'Khmer text',
  english: 'English text',
}

const certificateTemplates = {
  Beginner: certificateTemplate,
  Intermediate: intermediateTemplate,
  Advanced: certificateTemplate,
}

installCustomFonts()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">${renderIcon(Award, 'brand-icon')}</div>
        <div>
          <p class="eyebrow">Certificate Studio</p>
          <h1>Batch certificate printer</h1>
          <p class="subtitle">Excel data and student photos.</p>
        </div>
      </div>
      <div class="actions">
        <button id="download-template" class="button secondary" type="button">${buttonLabel(Download, 'Template')}</button>
        <button id="save-pdf" class="button primary" type="button" disabled>${buttonLabel(FileDown, 'Save PDF')}</button>
        <button id="print-all" class="button primary" type="button" disabled>${buttonLabel(Printer, 'Print all')}</button>
      </div>
    </header>

    <section class="workspace">
      <aside class="panel">
        <section class="panel-section">
          <div class="section-heading">
            <p class="eyebrow">Import</p>
            <h2>Source files</h2>
          </div>

          <label id="sheet-card" class="upload-card">
            <span class="upload-icon">${renderIcon(FileSpreadsheet)}</span>
            <span class="upload-copy">
              <strong>Spreadsheet</strong>
              <span id="sheet-file" class="file-status">No spreadsheet selected</span>
            </span>
            <span class="upload-action">Browse</span>
            <input id="sheet-input" class="file-input" type="file" accept=".xlsx,.xls,.csv" />
          </label>

          <label id="image-card" class="upload-card">
            <span class="upload-icon">${renderIcon(Images)}</span>
            <span class="upload-copy">
              <strong>Student photos</strong>
              <span id="image-file" class="file-status">No images selected</span>
            </span>
            <span class="upload-action">Browse</span>
            <input id="image-input" class="file-input" type="file" accept="image/*" multiple />
          </label>
        </section>

        <section class="level-card">
          <span class="level-icon">${renderIcon(GraduationCap)}</span>
          <label>
            <span>Certificate level</span>
            <select id="level-select">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate" selected>Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
        </section>

        <section class="font-card">
          <span class="font-icon">${renderIcon(Type)}</span>
          <div class="font-panel">
            <div>
              <p class="eyebrow">Fonts</p>
              <h2>Selected text</h2>
            </div>
            <div class="selected-text-box">
              <span id="selected-font-field-label">Click text on certificate</span>
              <p>Choose a text field in the preview, then apply a font.</p>
            </div>
            <label>
              <span>Font</span>
              <select id="selected-font-select" disabled>${fontOptionsHtml('')}</select>
            </label>
            <p id="font-status" class="font-status"></p>
          </div>
        </section>

        <div class="stats">
          <div>
            <span id="row-count">0</span>
            <p>certificates</p>
          </div>
          <div>
            <span id="image-count">0</span>
            <p>images loaded</p>
          </div>
        </div>

        <div class="template-card">
          <span class="template-icon">${renderIcon(LayoutTemplate)}</span>
          <div>
            <p class="eyebrow">Active template</p>
            <h2 id="active-template-name">${escapeHtml(activeTemplate().name)}</h2>
            <p id="active-template-description">${escapeHtml(activeTemplate().description)}</p>
          </div>
        </div>

      </aside>

      <section class="preview-area">
        <div id="error-message" class="error-message" hidden></div>
        <div id="certificate-list" class="certificate-list"></div>
      </section>
    </section>
  </main>
`

const sheetInput = document.querySelector<HTMLInputElement>('#sheet-input')!
const imageInput = document.querySelector<HTMLInputElement>('#image-input')!
const printButton = document.querySelector<HTMLButtonElement>('#print-all')!
const savePdfButton = document.querySelector<HTMLButtonElement>('#save-pdf')!
const templateButton = document.querySelector<HTMLButtonElement>('#download-template')!
const levelSelect = document.querySelector<HTMLSelectElement>('#level-select')!
const activeTemplateName = document.querySelector<HTMLHeadingElement>('#active-template-name')!
const activeTemplateDescription = document.querySelector<HTMLParagraphElement>('#active-template-description')!
const selectedFontFieldLabel = document.querySelector<HTMLSpanElement>('#selected-font-field-label')!
const selectedFontSelect = document.querySelector<HTMLSelectElement>('#selected-font-select')!
const fontStatus = document.querySelector<HTMLParagraphElement>('#font-status')!
const sheetCard = document.querySelector<HTMLLabelElement>('#sheet-card')!
const imageCard = document.querySelector<HTMLLabelElement>('#image-card')!
const list = document.querySelector<HTMLDivElement>('#certificate-list')!
const errorBox = document.querySelector<HTMLDivElement>('#error-message')!
const sheetFile = document.querySelector<HTMLSpanElement>('#sheet-file')!
const imageFile = document.querySelector<HTMLSpanElement>('#image-file')!
const rowCount = document.querySelector<HTMLSpanElement>('#row-count')!
const imageCount = document.querySelector<HTMLSpanElement>('#image-count')!

sheetInput.addEventListener('change', async () => {
  const file = sheetInput.files?.[0]
  if (!file) return

  selectedSheetName = `Reading ${file.name}...`
  errorMessage = ''
  render()

  embeddedObjectUrls.forEach((url) => URL.revokeObjectURL(url))
  embeddedObjectUrls = []
  rows = []

  try {
    const result = await readSpreadsheet(file, {
      embeddedImageColumn: activeTemplate().embeddedImageColumn,
    })
    rows = result.rows
    embeddedObjectUrls = result.embeddedObjectUrls
    selectedSheetName = file.name
  } catch {
    selectedSheetName = 'Spreadsheet could not be read'
    errorMessage = 'Could not read this spreadsheet. Check that the first sheet contains the certificate columns.'
  }

  render()
})

imageInput.addEventListener('change', () => {
  externalImageUrls.forEach((url) => URL.revokeObjectURL(url))
  externalImageUrls = new Map()
  externalImageFileCount = imageInput.files?.length ?? 0
  selectedImageSummary = externalImageFileCount === 0
    ? 'No images selected'
    : `${externalImageFileCount} image${externalImageFileCount === 1 ? '' : 's'} selected`

  for (const file of Array.from(imageInput.files ?? [])) {
    const url = URL.createObjectURL(file)
    externalImageUrls.set(normalize(file.name), url)
    externalImageUrls.set(normalize(file.name.replace(/\.[^.]+$/, '')), url)
  }

  render()
})

printButton.addEventListener('click', () => window.print())
savePdfButton.addEventListener('click', savePdf)
templateButton.addEventListener('click', downloadTemplate)
levelSelect.addEventListener('change', () => {
  selectedCertificateLevel = levelSelect.value
  selectedFontField = ''
  render()
})
selectedFontSelect.addEventListener('change', () => {
  if (!selectedFontField) return
  const key = selectedFontField as keyof typeof selectedFieldFonts
  selectedFieldFonts[key] = selectedFontSelect.value
  render()
})
list.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-font-field]')
  if (!target) return
  selectedFontField = target.dataset.fontField ?? ''
  renderSelectedFontFieldState()
})
render()

function imageSource(row: CertificateRow) {
  const raw = activeTemplate().value(row, 'recipientPhoto')
  const name = activeTemplate().value(row, 'recipientName')
  if (!raw && name) return externalImageUrls.get(normalize(name)) ?? ''
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  return externalImageUrls.get(normalize(raw)) ?? ''
}

function render() {
  rowCount.textContent = String(rows.length)
  imageCount.textContent = String(externalImageFileCount + embeddedObjectUrls.length)
  sheetFile.textContent = selectedSheetName
  imageFile.textContent = selectedImageSummary
  levelSelect.value = selectedCertificateLevel
  activeTemplateName.textContent = activeTemplate().name
  activeTemplateDescription.textContent = activeTemplate().description
  renderSelectedFontFieldState()
  fontStatus.textContent = customFonts.length === 0
    ? 'Paste font files into src/fonts, then refresh.'
    : `${customFonts.length} custom font${customFonts.length === 1 ? '' : 's'} loaded.`
  list.style.setProperty('--certificate-font-name', certificateFontStack(selectedFieldFonts.name))
  list.style.setProperty('--certificate-font-gender', certificateFontStack(selectedFieldFonts.gender))
  list.style.setProperty('--certificate-font-birth-date', certificateFontStack(selectedFieldFonts.birthDate))
  list.style.setProperty('--certificate-font-study-date', certificateFontStack(selectedFieldFonts.studyDate))
  list.style.setProperty('--certificate-font-issue-date', certificateFontStack(selectedFieldFonts.issueDate))
  list.style.setProperty('--certificate-font-labels', certificateFontStack(selectedFieldFonts.labels))
  list.style.setProperty('--certificate-font-khmer', certificateFontStack(selectedFieldFonts.khmer))
  list.style.setProperty('--certificate-font-english', certificateFontStack(selectedFieldFonts.english))
  errorBox.textContent = errorMessage
  errorBox.hidden = errorMessage === ''
  sheetCard.classList.toggle('is-complete', rows.length > 0)
  imageCard.classList.toggle('is-complete', externalImageFileCount + embeddedObjectUrls.length > 0)
  printButton.disabled = rows.length === 0
  savePdfButton.disabled = rows.length === 0

  const visibleRows = rows.length > 0 ? rows : [{}]
  list.innerHTML = visibleRows
    .map((row, index) => activeTemplate().renderCertificate(row, index, imageSource(row)))
    .join('')
  renderSelectedFontFieldState()
}

async function savePdf() {
  const certificates = Array.from(document.querySelectorAll<HTMLElement>('.certificate'))
  if (certificates.length === 0 || rows.length === 0) return

  savePdfButton.disabled = true
  savePdfButton.innerHTML = buttonLabel(LoaderCircle, 'Saving')
  savePdfButton.classList.add('is-loading')
  document.body.classList.add('exporting')

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    for (const [index, certificate] of certificates.entries()) {
      const canvas = await html2canvas(certificate, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      if (index > 0) pdf.addPage('a4', 'landscape')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, pageWidth, pageHeight)
    }

    pdf.save('certificates.pdf')
  } finally {
    document.body.classList.remove('exporting')
    savePdfButton.innerHTML = buttonLabel(FileDown, 'Save PDF')
    savePdfButton.classList.remove('is-loading')
    savePdfButton.disabled = rows.length === 0
  }
}

function downloadTemplate() {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([activeTemplate().columns])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Upload_Data')
  XLSX.writeFile(workbook, 'certificate_upload_template.xlsx')
}

function activeTemplate() {
  return certificateTemplates[selectedCertificateLevel as keyof typeof certificateTemplates]
}

function certificateFontStack(fontFamily: string) {
  const fallback = '"Times New Roman", "Noto Serif Khmer", "Khmer OS Battambang", SimSun, serif'
  const safeFontFamily = fontFamily.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return safeFontFamily ? `"${safeFontFamily}", ${fallback}` : fallback
}

function renderSelectedFontFieldState() {
  const key = selectedFontField as keyof typeof selectedFieldFonts
  const hasSelectedField = selectedFontField !== '' && key in selectedFieldFonts

  selectedFontFieldLabel.textContent = hasSelectedField
    ? fontFieldLabels[key]
    : 'Click text on certificate'
  selectedFontSelect.disabled = !hasSelectedField
  selectedFontSelect.value = hasSelectedField ? selectedFieldFonts[key] : ''

  document.querySelectorAll('[data-font-field]').forEach((element) => {
    element.classList.toggle(
      'is-selected-font-field',
      hasSelectedField && (element as HTMLElement).dataset.fontField === selectedFontField,
    )
  })
}
