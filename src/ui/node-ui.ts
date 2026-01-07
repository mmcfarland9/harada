import type { AppContext } from '../types'
import { nodeState, getFocusedNode, setFocusedNodeState, getViewMode, getActiveSprouts } from '../state'

export function setNodeLabel(element: HTMLButtonElement, label: string): void {
  const labelNode = element.querySelector<HTMLElement>('.node-label')

  if (element.classList.contains('twig')) {
    const formatted = formatTwigBoxLabel(label, element)
    if (labelNode) {
      labelNode.textContent = formatted.middleRows
    } else {
      element.textContent = formatted.middleRows
    }
    element.dataset.topBorder = formatted.topBorder
    element.dataset.bottomBorder = formatted.bottomBorder
    element.dataset.labelLines = String(formatted.lineCount)
    return
  }

  if (element.classList.contains('branch')) {
    const formatted = formatBoxLabel(label)
    if (labelNode) {
      labelNode.textContent = formatted.middleRows
    } else {
      element.textContent = formatted.middleRows
    }
    element.dataset.topBorder = formatted.topBorder
    element.dataset.bottomBorder = formatted.bottomBorder
    element.dataset.labelLines = String(formatted.lineCount)
    return
  }

  if (labelNode) {
    labelNode.textContent = label
    return
  }

  element.textContent = label
}

type BoxFormat = {
  topBorder: string
  middleRows: string
  bottomBorder: string
  lineCount: number
}

type BorderStyle = {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  horizontal: string
  vertical: string
}

const TWIG_BORDER_STYLES: Record<string, BorderStyle> = {
  '0': {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '',
  },
}

function formatBoxLabel(label: string): BoxFormat {
  const trimmed = label.trim()
  const words = trimmed.split(/\s+/)

  // Target wider 16:9-ish boxes - allow 2 lines max for most text
  const totalChars = words.reduce((sum, w) => sum + w.length, 0) + words.length - 1
  const targetWidth = Math.max(Math.max(...words.map(w => w.length), 1), Math.ceil(totalChars / 2))

  // Wrap text to target width
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    if (!currentLine) {
      currentLine = word
    } else if (currentLine.length + 1 + word.length <= targetWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  const maxLineLength = Math.max(...lines.map(l => l.length), 1)
  const paddedLines = lines.map(line => {
    const padding = maxLineLength - line.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return `${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)}`
  })

  const dashCount = Math.max(maxLineLength, 1)
  const dashes = '━'.repeat(dashCount)

  return {
    topBorder: `╭${dashes}╮`,
    middleRows: paddedLines.join('\n'),
    bottomBorder: `╰${dashes}╯`,
    lineCount: lines.length,
  }
}

function formatTwigBoxLabel(label: string, element: HTMLButtonElement): BoxFormat {
  const styleKey = element.dataset.twigStyle ?? '0'
  const style = TWIG_BORDER_STYLES[styleKey] ?? TWIG_BORDER_STYLES['0']
  const formatted = formatTwigLabel(label, element)
  const lines = formatted ? formatted.split('\n') : ['']
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1)
  const paddedLines = lines.map((line) => {
    const padding = maxLineLength - line.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return `${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)}`
  })
  const dashCount = Math.max(maxLineLength, 1)
  const dashes = style.horizontal.repeat(dashCount)

  return {
    topBorder: `${style.topLeft}${dashes}${style.topRight}`,
    middleRows: paddedLines.join('\n'),
    bottomBorder: `${style.bottomLeft}${dashes}${style.bottomRight}`,
    lineCount: lines.length,
  }
}


export function getNodePlaceholder(element: HTMLButtonElement): string {
  return element.dataset.placeholder || element.dataset.defaultLabel || 'Node'
}

export function setNodeVisibility(element: HTMLButtonElement, isVisible: boolean): void {
  element.classList.toggle('is-hidden', !isVisible)
  element.setAttribute('aria-hidden', isVisible ? 'false' : 'true')
  element.tabIndex = isVisible ? 0 : -1
}

export function syncNode(element: HTMLButtonElement): void {
  const nodeId = element.dataset.nodeId
  if (!nodeId) return

  const stored = nodeState[nodeId]
  const defaultLabel = element.dataset.defaultLabel || ''
  const storedLabel = stored?.label?.trim() || ''
  const label = storedLabel || defaultLabel

  setNodeLabel(element, label)

  const hasContent = Boolean(stored && (stored.note?.trim() || (storedLabel && storedLabel !== defaultLabel)))
  element.dataset.filled = hasContent ? 'true' : 'false'
}

export function setFocusedNode(
  target: HTMLButtonElement | null,
  ctx: AppContext,
  updateFocusCallback: (target: HTMLButtonElement | null) => void
): void {
  const currentFocused = getFocusedNode()
  if (currentFocused && currentFocused !== target) {
    currentFocused.classList.remove('is-focused')
  }

  setFocusedNodeState(target)

  if (target) {
    target.classList.add('is-focused')
  }

  const focusedBranch = target?.dataset.branchIndex
  ctx.branchProgressItems.forEach((item) => {
    item.button.classList.toggle('is-current', focusedBranch === String(item.index))
  })

  updateFocusCallback(target)
}

export function updateFocus(target: HTMLButtonElement | null, ctx: AppContext): void {
  const { focusMeta, focusTitle, focusNote, focusGoal, trunk } = ctx.elements
  const focusSection = ctx.elements.sidePanel.querySelector('.focus-section')

  // In overview mode with no target, show trunk info
  if (!target && getViewMode() === 'overview') {
    target = trunk
  }

  if (!target) {
    focusSection?.classList.add('is-empty')
    focusMeta.textContent = ''
    focusTitle.textContent = ''
    focusNote.textContent = ''
    focusGoal.textContent = ''
    focusGoal.style.display = 'none'
    return
  }

  focusSection?.classList.remove('is-empty')

  const nodeId = target.dataset.nodeId
  const defaultLabel = target.dataset.defaultLabel || ''
  const stored = nodeId ? nodeState[nodeId] : undefined
  const label = stored?.label?.trim() || ''
  const note = stored?.note?.trim() || ''
  const hasCustomLabel = Boolean(label && label !== defaultLabel)
  const isTwig = target.classList.contains('twig')
  const isTrunk = target.classList.contains('trunk')
  const placeholder = getNodePlaceholder(target)
  const displayLabel = hasCustomLabel ? label : isTwig ? 'Add title...' : placeholder

  // Show hierarchy type label in meta
  if (isTrunk) {
    focusMeta.textContent = 'TRUNK'
  } else if (isTwig) {
    focusMeta.textContent = 'TWIG'
  } else {
    focusMeta.textContent = 'BRANCH'
  }
  focusTitle.textContent = displayLabel
  focusTitle.classList.toggle('is-muted', !hasCustomLabel)

  focusNote.style.display = ''
  if (note) {
    // Convert line breaks to <br> for display (escape HTML first)
    const escaped = note.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    focusNote.innerHTML = escaped.replace(/\n/g, '<br>')
  } else {
    focusNote.textContent = 'Add details...'
  }
  focusNote.classList.toggle('is-muted', !note)

  // Sprout display only for twigs
  if (isTwig) {
    focusGoal.style.display = ''
    const sprouts = stored?.sprouts || []
    const activeSprouts = getActiveSprouts(sprouts)

    if (activeSprouts.length > 0) {
      const sproutList = activeSprouts.map(s => {
        const name = s.title || 'Untitled'
        return `${name} (${s.type})`
      }).join('<br>')
      focusGoal.innerHTML = `Active (${activeSprouts.length}):<br>${sproutList}`
      focusGoal.classList.remove('is-muted')
    } else {
      focusGoal.textContent = 'No active sprouts'
      focusGoal.classList.add('is-muted')
    }
  } else {
    focusGoal.style.display = 'none'
    focusGoal.textContent = ''
  }
}

const TWIG_TARGET_RATIO = 16 / 9
const TWIG_LINE_PENALTY = 0.06
const DEFAULT_TWIG_METRICS = {
  fontSize: 9.6,
  lineHeight: 8.16,
  paddingX: 44,
  paddingY: 32,
  font: '500 9.6px sans-serif',
}
const twigMeasureContext = document.createElement('canvas').getContext('2d')

function generateTwigLineCandidates(words: string[]): string[][] {
  const joined = words.join(' ')
  const candidates: string[][] = [[joined]]
  if (words.length < 2) return candidates
  for (let i = 1; i < words.length; i++) {
    candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')])
  }
  if (words.length < 3) return candidates
  for (let i = 1; i < words.length - 1; i++) {
    for (let j = i + 1; j < words.length; j++) {
      candidates.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')])
    }
  }
  return candidates
}

function formatTwigLabel(label: string, element: HTMLButtonElement): string {
  const trimmed = label.trim()
  if (!trimmed) return ''

  const words = trimmed.split(/\s+/)
  if (words.length === 1) return trimmed

  const candidates = generateTwigLineCandidates(words)
  let best = candidates[0]
  let bestScore = Number.POSITIVE_INFINITY

  const metrics = getTwigMetrics(element)
  candidates.forEach((lines: string[]) => {
    const score = scoreTwigLines(lines, metrics)
    if (score < bestScore) {
      bestScore = score
      best = lines
    }
  })

  return best.join('\n')
}


function scoreTwigLines(lines: string[], metrics: TwigMetrics): number {
  const lineWidths = lines.map((line) => measureLineWidth(line, metrics))
  const maxWidth = Math.max(...lineWidths)
  const minWidth = Math.min(...lineWidths)
  const totalWidth = maxWidth + metrics.paddingX
  const totalHeight = lines.length * metrics.lineHeight + metrics.paddingY
  const ratio = totalWidth / Math.max(totalHeight, 1)
  const balance = (maxWidth - minWidth) / Math.max(maxWidth, 1)
  const linePenalty = (lines.length - 1) * TWIG_LINE_PENALTY

  return Math.abs(ratio - TWIG_TARGET_RATIO) + balance * 0.12 + linePenalty
}

type TwigMetrics = {
  fontSize: number
  lineHeight: number
  paddingX: number
  paddingY: number
  font: string
}

function getTwigMetrics(element: HTMLButtonElement): TwigMetrics {
  if (!element.isConnected) {
    return DEFAULT_TWIG_METRICS
  }

  const style = window.getComputedStyle(element)
  const fontSize = Number.parseFloat(style.fontSize) || DEFAULT_TWIG_METRICS.fontSize
  const lineHeightRaw = style.lineHeight || ''
  const lineHeightValue = Number.parseFloat(lineHeightRaw)
  let lineHeight = fontSize * 1.2
  if (!Number.isNaN(lineHeightValue)) {
    lineHeight = lineHeightRaw.endsWith('px') ? lineHeightValue : lineHeightValue * fontSize
  }
  const paddingX =
    (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const paddingY =
    (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
  const fontStyle = style.fontStyle || 'normal'
  const fontWeight = style.fontWeight || '400'
  const fontFamily = style.fontFamily || 'sans-serif'
  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

  return {
    fontSize,
    lineHeight,
    paddingX,
    paddingY,
    font,
  }
}

function measureLineWidth(line: string, metrics: TwigMetrics): number {
  if (!twigMeasureContext) {
    return line.length * metrics.fontSize * 0.55
  }

  if (twigMeasureContext.font !== metrics.font) {
    twigMeasureContext.font = metrics.font
  }

  return twigMeasureContext.measureText(line).width
}
