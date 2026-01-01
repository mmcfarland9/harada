import type { AppElements, BranchNode } from '../types'
import { BRANCH_COUNT, SUB_CIRCLE_COUNT } from '../constants'
import { syncCircle } from './circle-ui'
import ampersandImage from '../../assets/ampersand_alpha.png'

export type DomBuilderResult = {
  elements: AppElements
  branches: BranchNode[]
  allCircles: HTMLButtonElement[]
  circleLookup: Map<string, HTMLButtonElement>
}

export type CircleClickHandler = (
  element: HTMLButtonElement,
  circleId: string,
  placeholder: string
) => void

export function buildApp(
  appRoot: HTMLDivElement,
  onCircleClick: CircleClickHandler
): DomBuilderResult {
  const allCircles: HTMLButtonElement[] = []
  const branches: BranchNode[] = []
  const circleLookup = new Map<string, HTMLButtonElement>()

  // Shell
  const shell = document.createElement('div')
  shell.className = 'app-shell'

  // Header
  const header = document.createElement('header')
  header.className = 'app-header'

  const actions = document.createElement('div')
  actions.className = 'app-actions'

  const logo = document.createElement('img')
  logo.className = 'header-logo'
  logo.src = ampersandImage
  logo.alt = 'Harada mark'

  const importButton = document.createElement('button')
  importButton.type = 'button'
  importButton.className = 'action-button'
  importButton.textContent = 'Import'

  const exportButton = document.createElement('button')
  exportButton.type = 'button'
  exportButton.className = 'action-button'
  exportButton.textContent = 'Export'

  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.className = 'action-button secondary'
  resetButton.textContent = 'Reset map'

  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json'
  importInput.className = 'visually-hidden'

  importButton.addEventListener('click', () => importInput.click())

  actions.append(importButton, exportButton, resetButton)
  header.append(actions, logo, importInput)

  // Body
  const body = document.createElement('div')
  body.className = 'app-body'

  // Map Panel
  const mapPanel = document.createElement('section')
  mapPanel.className = 'map-panel'

  const canvas = document.createElement('div')
  canvas.className = 'canvas'

  // Guide layer is OUTSIDE canvas to avoid transform issues
  const guideLayer = document.createElement('div')
  guideLayer.className = 'guide-layer'

  // Trunk
  const center = document.createElement('button')
  center.type = 'button'
  center.className = 'circle center-circle'
  center.dataset.circleId = 'center'
  center.dataset.defaultLabel = 'Purpose'
  center.dataset.placeholder = 'Purpose'
  center.setAttribute('aria-label', 'Trunk - your core purpose')
  center.style.setProperty('--ampersand', `url(${ampersandImage})`)

  const centerLabel = document.createElement('span')
  centerLabel.className = 'center-title circle-label'
  centerLabel.textContent = 'Purpose'
  center.append(centerLabel)

  canvas.append(center)

  // Initialize trunk
  initializeCircle(center, 'Purpose', circleLookup, onCircleClick)
  allCircles.push(center)

  // Create branches
  for (let i = 0; i < BRANCH_COUNT; i += 1) {
    const wrapper = document.createElement('div')
    wrapper.className = 'branch'

    const mainId = `branch-${i}`
    const main = document.createElement('button')
    main.type = 'button'
    main.className = 'circle main-circle'
    main.dataset.circleId = mainId
    main.dataset.defaultLabel = String(i + 1)
    main.dataset.placeholder = `Branch ${i + 1}`
    main.dataset.branchIndex = String(i)
    main.dataset.branchStyle = '1'
    main.setAttribute('aria-label', `Branch ${i + 1}`)

    const mainLabel = document.createElement('span')
    mainLabel.className = 'circle-label'
    main.append(mainLabel)

    initializeCircle(main, `Branch ${i + 1}`, circleLookup, onCircleClick)
    allCircles.push(main)

    const subs: HTMLButtonElement[] = []
    for (let j = 0; j < SUB_CIRCLE_COUNT; j += 1) {
      const subId = `branch-${i}-sub-${j}`
      const sub = document.createElement('button')
      sub.type = 'button'
      sub.className = 'circle sub-circle'
      sub.dataset.circleId = subId
      sub.dataset.defaultLabel = ''
      sub.dataset.placeholder = `Leaf ${j + 1} for branch ${i + 1}`
      sub.dataset.branchIndex = String(i)
      sub.dataset.leafIndex = String(j)
      sub.style.setProperty('--leaf-delay', `${getBloomDelay(j)}ms`)
      sub.setAttribute('aria-label', `Leaf ${j + 1} for branch ${i + 1}`)

      initializeCircle(sub, `Leaf ${j + 1} for branch ${i + 1}`, circleLookup, onCircleClick)
      subs.push(sub)
      allCircles.push(sub)
      wrapper.append(sub)
    }

    wrapper.append(main)
    branches.push({ wrapper, main, subs })
    canvas.append(wrapper)
  }

  // Debug checkbox
  const debugLabel = document.createElement('label')
  debugLabel.className = 'debug-toggle'
  const debugCheckbox = document.createElement('input')
  debugCheckbox.type = 'checkbox'
  debugCheckbox.checked = false
  const debugText = document.createTextNode(' Show debug guide lines')
  debugLabel.append(debugCheckbox, debugText)

  mapPanel.append(canvas, guideLayer, debugLabel)

  // Side Panel
  const sidePanel = document.createElement('aside')
  sidePanel.className = 'side-panel'
  sidePanel.innerHTML = `
    <section class="panel-section focus-section">
      <p class="focus-meta"></p>
      <p class="focus-title"></p>
      <p class="focus-note"></p>
    </section>
    <section class="panel-section">
      <p class="progress-count"></p>
      <div class="progress-track">
        <span class="progress-fill" style="width: 0%"></span>
      </div>
      <div class="progress-actions">
        <button type="button" class="panel-button next-open">Next open</button>
      </div>
      <div class="branch-progress"></div>
    </section>
    <section class="panel-section">
      <p class="status-message"></p>
      <p class="status-meta"></p>
    </section>
  `

  body.append(mapPanel, sidePanel)
  shell.append(header, body)
  appRoot.append(shell)

  const elements: AppElements = {
    shell,
    header,
    canvas,
    center,
    guideLayer,
    sidePanel,
    focusMeta: sidePanel.querySelector<HTMLParagraphElement>('.focus-meta')!,
    focusTitle: sidePanel.querySelector<HTMLParagraphElement>('.focus-title')!,
    focusNote: sidePanel.querySelector<HTMLParagraphElement>('.focus-note')!,
    progressCount: sidePanel.querySelector<HTMLParagraphElement>('.progress-count')!,
    progressFill: sidePanel.querySelector<HTMLSpanElement>('.progress-fill')!,
    nextButton: sidePanel.querySelector<HTMLButtonElement>('.next-open')!,
    branchProgress: sidePanel.querySelector<HTMLDivElement>('.branch-progress')!,
    statusMessage: sidePanel.querySelector<HTMLParagraphElement>('.status-message')!,
    statusMeta: sidePanel.querySelector<HTMLParagraphElement>('.status-meta')!,
    importInput,
    debugCheckbox,
  }

  // Wire up button handlers (will be connected to features in main.ts)
  exportButton.dataset.action = 'export'
  resetButton.dataset.action = 'reset'

  return {
    elements,
    branches,
    allCircles,
    circleLookup,
  }
}

function initializeCircle(
  element: HTMLButtonElement,
  placeholder: string,
  circleLookup: Map<string, HTMLButtonElement>,
  onCircleClick: CircleClickHandler
): void {
  const circleId = element.dataset.circleId
  if (circleId) {
    circleLookup.set(circleId, element)
  }
  element.dataset.placeholder = placeholder
  syncCircle(element)

  element.addEventListener('click', (event) => {
    event.stopPropagation()
    if (circleId) {
      onCircleClick(element, circleId, placeholder)
    }
  })
}

function getBloomDelay(leafIndex: number): number {
  const baseDelay = 60
  const delayStep = 40
  const distanceFromFront = Math.min(leafIndex, SUB_CIRCLE_COUNT - leafIndex)
  return baseDelay + distanceFromFront * delayStep
}

export function getActionButtons(shell: HTMLDivElement): {
  exportButton: HTMLButtonElement
  resetButton: HTMLButtonElement
} {
  return {
    exportButton: shell.querySelector<HTMLButtonElement>('[data-action="export"]')!,
    resetButton: shell.querySelector<HTMLButtonElement>('[data-action="reset"]')!,
  }
}
