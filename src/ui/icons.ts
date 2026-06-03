import { escapeAttr, escapeHtml } from '../utils/text'

type IconNode = [tag: string, attrs: Record<string, string | number | undefined>][]

export function buttonLabel(iconNode: IconNode, label: string) {
  return `${renderIcon(iconNode)}<span>${escapeHtml(label)}</span>`
}

export function renderIcon(iconNode: IconNode, className = 'icon') {
  const children = iconNode.map(([tag, attrs]) => {
    const attributes = Object.entries(attrs)
      .filter(([, valueToRender]) => valueToRender !== undefined)
      .map(([key, valueToRender]) => `${key}="${escapeAttr(String(valueToRender))}"`)
      .join(' ')
    return `<${tag} ${attributes}></${tag}>`
  })

  return `
    <svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${children.join('')}
    </svg>
  `
}

