export function normalize(valueToNormalize: string) {
  return valueToNormalize.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function escapeHtml(valueToEscape: string) {
  return valueToEscape
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function escapeAttr(valueToEscape: string) {
  return escapeHtml(valueToEscape)
}

