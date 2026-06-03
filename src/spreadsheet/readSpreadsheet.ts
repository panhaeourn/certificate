import type JSZip from 'jszip'
import * as XLSX from 'xlsx'
import type { CertificateRow } from '../types'
import { normalize } from '../utils/text'

type EmbeddedImages = {
  byRow: Map<number, string>
  ordered: string[]
}

type ReadSpreadsheetOptions = {
  embeddedImageColumn: string
}

export async function readSpreadsheet(file: File, options: ReadSpreadsheetOptions) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const embeddedImages = await extractEmbeddedImages(buffer)

  const rows = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
    .map((row, index) => {
      const normalized = normalizeRow(row)
      const embeddedImage = embeddedImages.byRow.get(index) ?? embeddedImages.ordered[index]
      if (embeddedImage) normalized[options.embeddedImageColumn] = embeddedImage
      return normalized
    })
    .filter((row) => Object.values(row).some((value) => value.trim() !== ''))

  return {
    rows,
    embeddedObjectUrls: embeddedImages.ordered,
  }
}

function normalizeRow(row: Record<string, unknown>): CertificateRow {
  const result: CertificateRow = {}
  for (const [key, value] of Object.entries(row)) {
    result[normalize(key)] = String(value ?? '').trim()
  }
  return result
}

async function extractEmbeddedImages(buffer: ArrayBuffer) {
  const embeddedImages: EmbeddedImages = { byRow: new Map(), ordered: [] }

  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(buffer)
    await extractWpsCellImages(zip, embeddedImages)
    await extractDrawingImages(zip, embeddedImages)
  } catch {
    return embeddedImages
  }

  return embeddedImages
}

async function extractWpsCellImages(zip: JSZip, embeddedImages: EmbeddedImages) {
  const cellImagesXml = await zip.file('xl/cellimages.xml')?.async('text')
  const cellImagesRelsXml = await zip.file('xl/_rels/cellimages.xml.rels')?.async('text')
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('text')
  if (!cellImagesXml || !cellImagesRelsXml || !sheetXml) return

  const imageIdToRelId = new Map<string, string>()
  const cellImagesDoc = parseXml(cellImagesXml)
  for (const cellImage of elements(cellImagesDoc, 'cellImage')) {
    const imageId = attr(elements(cellImage, 'cNvPr')[0], 'name')
    const relId = attr(elements(cellImage, 'blip')[0], 'embed')
    if (imageId && relId) imageIdToRelId.set(imageId, relId)
  }

  const rels = relMap(cellImagesRelsXml)
  const imageIdToUrl = new Map<string, string>()
  for (const [imageId, relId] of imageIdToRelId.entries()) {
    const imageUrl = await imageUrlFromZipPath(zip, 'xl/cellimages.xml', rels.get(relId))
    if (!imageUrl) continue
    imageIdToUrl.set(imageId, imageUrl)
    embeddedImages.ordered.push(imageUrl)
  }

  const sheetDoc = parseXml(sheetXml)
  for (const cell of elements(sheetDoc, 'c')) {
    const imageId = childText(cell, 'f').match(/DISPIMG\("([^"]+)"/i)?.[1]
    const rowNumber = Number(attr(cell, 'r').match(/\d+/)?.[0])
    const imageUrl = imageId ? imageIdToUrl.get(imageId) : ''
    if (!imageUrl || !Number.isFinite(rowNumber) || rowNumber < 2) continue
    embeddedImages.byRow.set(rowNumber - 2, imageUrl)
  }
}

async function extractDrawingImages(zip: JSZip, embeddedImages: EmbeddedImages) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text')
  const workbookRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text')
  if (!workbookXml || !workbookRelsXml) return

  const firstSheet = elements(parseXml(workbookXml), 'sheet')[0]
  const sheetPath = resolveZipPath('xl/workbook.xml', relMap(workbookRelsXml).get(attr(firstSheet, 'id')))
  if (!sheetPath) return

  const sheetXml = await zip.file(sheetPath)?.async('text')
  if (!sheetXml) return

  const drawingRelId = attr(elements(parseXml(sheetXml), 'drawing')[0], 'id')
  const sheetRelsXml = await zip.file(relsPath(sheetPath))?.async('text')
  if (!drawingRelId || !sheetRelsXml) return

  const drawingPath = resolveZipPath(sheetPath, relMap(sheetRelsXml).get(drawingRelId))
  const drawingXml = drawingPath ? await zip.file(drawingPath)?.async('text') : ''
  const drawingRelsXml = drawingPath ? await zip.file(relsPath(drawingPath))?.async('text') : ''
  if (!drawingPath || !drawingXml || !drawingRelsXml) return

  const drawingRels = relMap(drawingRelsXml)
  const drawingDoc = parseXml(drawingXml)
  const anchors = [...elements(drawingDoc, 'twoCellAnchor'), ...elements(drawingDoc, 'oneCellAnchor')]

  for (const anchor of anchors) {
    const row = Number(childText(child(anchor, 'from'), 'row'))
    const relId = attr(elements(anchor, 'blip')[0], 'embed')
    const imageUrl = await imageUrlFromZipPath(zip, drawingPath, drawingRels.get(relId))
    if (!Number.isFinite(row) || !imageUrl) continue

    embeddedImages.ordered.push(imageUrl)
    if (row >= 1 && !embeddedImages.byRow.has(row - 1)) {
      embeddedImages.byRow.set(row - 1, imageUrl)
    }
  }
}

async function imageUrlFromZipPath(zip: JSZip, basePath: string, target: string | undefined) {
  const imagePath = resolveZipPath(basePath, target)
  const imageFile = imagePath ? zip.file(imagePath) : null
  if (!imagePath || !imageFile) return ''

  const bytes = await imageFile.async('uint8array')
  const imageBuffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(imageBuffer).set(bytes)
  return URL.createObjectURL(new Blob([imageBuffer], { type: mimeType(imagePath) }))
}

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

function elements(root: ParentNode, localName: string) {
  return Array.from(root.querySelectorAll('*')).filter((node) => node.localName === localName)
}

function child(root: Element | undefined, localName: string) {
  return root ? Array.from(root.children).find((node) => node.localName === localName) : undefined
}

function childText(root: Element | undefined, localName: string) {
  return child(root, localName)?.textContent ?? ''
}

function attr(element: Element | undefined, localName: string) {
  if (!element) return ''
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName || attribute.name === localName) return attribute.value
  }
  return ''
}

function relMap(xml: string) {
  const map = new Map<string, string>()
  for (const relationship of elements(parseXml(xml), 'Relationship')) {
    const id = attr(relationship, 'Id')
    const target = attr(relationship, 'Target')
    if (id && target) map.set(id, target)
  }
  return map
}

function relsPath(zipPath: string) {
  const slash = zipPath.lastIndexOf('/')
  const dir = slash >= 0 ? zipPath.slice(0, slash) : ''
  const file = slash >= 0 ? zipPath.slice(slash + 1) : zipPath
  return `${dir}/_rels/${file}.rels`
}

function resolveZipPath(basePath: string, target: string | undefined) {
  if (!target) return ''
  if (target.startsWith('/')) return target.replace(/^\/+/, '')

  const parts = basePath.split('/')
  parts.pop()
  for (const part of target.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function mimeType(zipPath: string) {
  const extension = zipPath.split('.').pop()?.toLowerCase()
  if (extension === 'png') return 'image/png'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'webp') return 'image/webp'
  return 'image/jpeg'
}

