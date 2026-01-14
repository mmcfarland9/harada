import './styles/index.css'
import type { AppContext } from './types'
import wateringPromptsRaw from './assets/watering-prompts.txt?raw'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState, advanceClockByDays, getDebugDate, nodeState, getActiveSprouts, getHistorySprouts, saveState, getSoilAvailable, getSoilCapacity, getWaterAvailable, getWaterCapacity, spendWater, canAffordWater, recoverSoil, resetSoil, addWaterEntry } from './state'
import type { Sprout } from './types'
import { updateFocus, setFocusedNode } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { buildTwigView } from './ui/twig-view'
import { buildLeafView } from './ui/leaf-view'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch, previewBranchFromSidebar, clearSidebarPreview } from './features/hover-branch'
import { handleExport, handleImport } from './features/import-export'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
  returnToBranchView,
} from './features/navigation'
import { updateStats, initSidebarSprouts } from './features/progress'
import { setStatus, updateStatusMeta } from './features/status'
import { STATUS_DEFAULT_MESSAGE } from './constants'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Root container "#app" not found.')
}

const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => {
    updateStats(ctx)
    positionNodes(ctx)
  },
}

const importExportCallbacks = {
  onUpdateStats: navCallbacks.onUpdateStats,
  onSetViewMode: (mode: 'overview') => setViewMode(mode, ctx, navCallbacks),
}

function handleNodeClick(
  element: HTMLButtonElement,
  nodeId: string,
  _placeholder: string
): void {
  if (nodeId === 'trunk' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  // Trunk click from twig view goes back to overview
  if (nodeId === 'trunk' && getViewMode() === 'twig') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  const branchIndex = element.dataset.branchIndex
  if (branchIndex !== undefined && getViewMode() === 'overview') {
    enterBranchView(Number(branchIndex), ctx, navCallbacks)
    return
  }

  // Twig click enters twig view
  const isTwig = element.classList.contains('twig')
  if (isTwig && getViewMode() === 'branch') {
    const twigBranchIndex = element.dataset.branchIndex
    if (twigBranchIndex !== undefined) {
      enterTwigView(element, Number(twigBranchIndex), ctx, navCallbacks)
    }
    return
  }

  // All nodes (trunk/branches/twigs) are edited via JSON only
}

const domResult = buildApp(app, handleNodeClick)

const editor = buildEditor(domResult.elements.canvas, {
  onSave: navCallbacks.onUpdateStats,
  onUpdateFocus: (target) => updateFocus(target, ctx),
})
domResult.elements.shell.append(editor.container)

// Soil meter update function
function updateSoilMeter(): void {
  const available = getSoilAvailable()
  const capacity = getSoilCapacity()
  domResult.elements.soilMeterFill.style.width = `${(available / capacity) * 100}%`
  // Show 1 decimal place if fractional, otherwise whole number
  const availStr = available % 1 === 0 ? String(available) : available.toFixed(1)
  domResult.elements.soilMeterValue.textContent = `${availStr}/${capacity}`
}

// Water meter update function
function updateWaterMeter(): void {
  const available = getWaterAvailable()
  const capacity = getWaterCapacity()
  domResult.elements.waterMeterFill.style.width = `${(available / capacity) * 100}%`
  domResult.elements.waterMeterValue.textContent = `${available}/${capacity}`
}

const mapPanel = domResult.elements.canvas.parentElement as HTMLElement
const twigView = buildTwigView(mapPanel, {
  onClose: () => returnToBranchView(ctx, navCallbacks),
  onSave: navCallbacks.onUpdateStats,
  onSoilChange: updateSoilMeter,
  onOpenLeaf: (leafId, twigId, branchIndex) => {
    setViewModeState('leaf', branchIndex, twigId, leafId)
    ctx.leafView?.open(leafId, twigId, branchIndex)
  },
  onNavigate: (direction) => {
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex === null || !activeTwigId) return null

    const branchGroup = ctx.branchGroups[activeBranchIndex]
    if (!branchGroup) return null

    const currentIndex = branchGroup.twigs.findIndex(t => t.dataset.nodeId === activeTwigId)
    if (currentIndex === -1) return null

    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + branchGroup.twigs.length) % branchGroup.twigs.length
      : (currentIndex + 1) % branchGroup.twigs.length

    const newTwig = branchGroup.twigs[newIndex]
    if (newTwig) {
      const newTwigId = newTwig.dataset.nodeId
      if (newTwigId) {
        setViewModeState('twig', activeBranchIndex, newTwigId)
        setFocusedNode(newTwig, ctx, (target) => updateFocus(target, ctx))
      }
    }
    return newTwig ?? null
  },
})

const leafView = buildLeafView(mapPanel, {
  onClose: () => {
    leafView.close()
    // Return to twig view
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex !== null && activeTwigId) {
      const twig = ctx.nodeLookup.get(activeTwigId)
      if (twig) {
        setViewModeState('twig', activeBranchIndex, activeTwigId)
        ctx.twigView?.open(twig)
      }
    }
    navCallbacks.onUpdateStats()
  },
  onSave: navCallbacks.onUpdateStats,
  onSoilChange: updateSoilMeter,
})

const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  editor,
  twigView,
  leafView,
}

const { exportButton, showSproutsButton, encyclopediaButtons } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

// Sprouts dialog
function getAllSprouts(): { active: Array<Sprout & { twigId: string }>, history: Array<Sprout & { twigId: string }> } {
  const active: Array<Sprout & { twigId: string }> = []
  const history: Array<Sprout & { twigId: string }> = []

  Object.entries(nodeState).forEach(([nodeId, data]) => {
    if (!data.sprouts) return
    const activeSprouts = getActiveSprouts(data.sprouts)
    const historySprouts = getHistorySprouts(data.sprouts)
    activeSprouts.forEach(s => active.push({ ...s, twigId: nodeId }))
    historySprouts.forEach(s => history.push({ ...s, twigId: nodeId }))
  })

  // Sort by date
  active.sort((a, b) => new Date(b.activatedAt || b.createdAt).getTime() - new Date(a.activatedAt || a.createdAt).getTime())
  history.sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())

  return { active, history }
}

function getTwigPath(twigId: string): string {
  // Parse twig ID like "branch-0-twig-3"
  const match = twigId.match(/branch-(\d+)-twig-(\d+)/)
  if (!match) return twigId

  const branchIdx = Number(match[1])
  const twigIdx = Number(match[2])

  // Get branch label
  const branchId = `branch-${branchIdx}`
  const branchData = nodeState[branchId]
  const branchLabel = branchData?.label?.trim() || `Branch${branchIdx + 1}`

  // Get twig label
  const twigData = nodeState[twigId]
  const twigLabel = twigData?.label?.trim() || `Twig${twigIdx + 1}`

  return `${branchLabel} > ${twigLabel}`
}

// Result emoji scale for sprouts dialog
function getResultEmoji(result: number): string {
  const emojis: Record<number, string> = {
    1: '🥀', // withered
    2: '🌱', // sprout
    3: '🌿', // sapling
    4: '🌳', // tree
    5: '🌲', // strong oak/evergreen
  }
  return emojis[result] || '🌱'
}

function renderSproutsDialog(): void {
  const { active, history } = getAllSprouts()
  const content = domResult.elements.sproutsDialogContent

  const renderItem = (s: Sprout & { twigId: string }, showResult = false) => `
    <div class="sprouts-dialog-item" data-sprout-id="${s.id}" data-twig-id="${s.twigId}">
      <span class="sprouts-dialog-item-icon">${showResult ? getResultEmoji(s.result || 1) : '🌱'}</span>
      <div class="sprouts-dialog-item-info">
        <span class="sprouts-dialog-item-path">${getTwigPath(s.twigId)}</span>
        <span class="sprouts-dialog-item-title">${s.title}</span>
        <span class="sprouts-dialog-item-meta">
          ${s.season}${showResult ? ` · ${s.result || 1}/5` : ''}
        </span>
      </div>
      <button type="button" class="sprouts-dialog-uproot" title="Uproot">×</button>
    </div>
  `

  content.innerHTML = `
    <div class="sprouts-dialog-section">
      <h3 class="sprouts-dialog-section-title">Growing (${active.length})</h3>
      <div class="sprouts-dialog-list">
        ${active.length ? active.map(s => renderItem(s)).join('') : '<p class="sprouts-dialog-empty">No growing sprouts</p>'}
      </div>
    </div>
    <div class="sprouts-dialog-section">
      <h3 class="sprouts-dialog-section-title">Cultivated (${history.length})</h3>
      <div class="sprouts-dialog-list">
        ${history.length ? history.map(s => renderItem(s, true)).join('') : '<p class="sprouts-dialog-empty">No cultivated sprouts</p>'}
      </div>
    </div>
  `

  // Wire up uproot buttons
  content.querySelectorAll<HTMLButtonElement>('.sprouts-dialog-uproot').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.sprouts-dialog-item') as HTMLElement
      const sproutId = item?.dataset.sproutId
      const twigId = item?.dataset.twigId
      if (!sproutId || !twigId) return

      const data = nodeState[twigId]
      if (!data?.sprouts) return

      data.sprouts = data.sprouts.filter(s => s.id !== sproutId)
      if (data.sprouts.length === 0) data.sprouts = undefined
      saveState()
      renderSproutsDialog()
      navCallbacks.onUpdateStats()
    })
  })
}

showSproutsButton.addEventListener('click', () => {
  renderSproutsDialog()
  domResult.elements.sproutsDialog.classList.remove('hidden')
})

domResult.elements.sproutsDialogClose.addEventListener('click', () => {
  domResult.elements.sproutsDialog.classList.add('hidden')
})

// Close on backdrop click
domResult.elements.sproutsDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.sproutsDialog) {
    domResult.elements.sproutsDialog.classList.add('hidden')
  }
})

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !domResult.elements.sproutsDialog.classList.contains('hidden')) {
    e.preventDefault()
    e.stopImmediatePropagation()
    domResult.elements.sproutsDialog.classList.add('hidden')
  }
  if (e.key === 'Escape' && !domResult.elements.gardenGuideDialog.classList.contains('hidden')) {
    e.preventDefault()
    e.stopImmediatePropagation()
    domResult.elements.gardenGuideDialog.classList.add('hidden')
  }
}, true)

// Encyclopedia buttons - each opens dialog to specific tab
const guideTabs = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLButtonElement>('.guide-tab')
const guidePanels = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLDivElement>('.guide-panel')

function openEncyclopediaTab(tabName: string): void {
  // Update tabs
  guideTabs.forEach(t => {
    if (t.dataset.tab === tabName) {
      t.classList.add('is-active')
    } else {
      t.classList.remove('is-active')
    }
  })

  // Update panels
  guidePanels.forEach(panel => {
    if (panel.dataset.panel === tabName) {
      panel.classList.add('is-active')
    } else {
      panel.classList.remove('is-active')
    }
  })

  // Show dialog
  domResult.elements.gardenGuideDialog.classList.remove('hidden')
}

encyclopediaButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.encyclopediaTab
    if (tab) openEncyclopediaTab(tab)
  })
})

domResult.elements.gardenGuideClose.addEventListener('click', () => {
  domResult.elements.gardenGuideDialog.classList.add('hidden')
})

domResult.elements.gardenGuideDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.gardenGuideDialog) {
    domResult.elements.gardenGuideDialog.classList.add('hidden')
  }
})

// Tab switching within the encyclopedia dialog
guideTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetPanel = tab.dataset.tab
    if (targetPanel) openEncyclopediaTab(targetPanel)
  })
})

domResult.elements.debugCheckbox.addEventListener('change', (e) => {
  setDebugHoverZone((e.target as HTMLInputElement).checked)
})

// Debug clock - trunk-wide time manipulation
function updateDebugClockDisplay(): void {
  const date = getDebugDate()
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  domResult.elements.debugClockOffset.textContent = formatted
}
updateDebugClockDisplay() // Show initial date

domResult.elements.debugClockBtn.addEventListener('click', () => {
  advanceClockByDays(1)
  updateDebugClockDisplay()
  updateWaterMeter() // Water resets daily
  // Re-render any open twig view to update sprout states
  if (ctx.twigView?.isOpen()) {
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex !== null && activeTwigId) {
      const branchGroup = ctx.branchGroups[activeBranchIndex]
      const twig = branchGroup?.twigs.find(t => t.dataset.nodeId === activeTwigId)
      if (twig) {
        ctx.twigView?.close()
        ctx.twigView?.open(twig)
      }
    }
  }
})

domResult.elements.debugSoilResetBtn.addEventListener('click', () => {
  resetSoil()
  updateSoilMeter()
  setStatus(ctx.elements, 'Soil reset to default capacity', 'info')
})

domResult.elements.debugClearSproutsBtn.addEventListener('click', () => {
  // Clear all sprouts and leaves from all twigs
  Object.keys(nodeState).forEach(nodeId => {
    if (nodeState[nodeId]) {
      nodeState[nodeId].sprouts = undefined
      nodeState[nodeId].leaves = undefined
    }
  })
  saveState()
  updateStats(ctx)
  setStatus(ctx.elements, 'Cleared all sprouts and leaves', 'info')
})

domResult.elements.backToTrunkButton.addEventListener('click', () => {
  returnToOverview(ctx, navCallbacks)
})

// Water dialog state
let currentWateringSprout: { id: string, twigId: string } | null = null

// Parse watering prompts (skip comments and empty lines)
const wateringPrompts = wateringPromptsRaw
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))

// Track recently shown prompts to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = Math.min(10, Math.floor(wateringPrompts.length / 3))

function getRandomPrompt(): string {
  // Filter out recently shown prompts
  const available = wateringPrompts.filter(p => !recentPrompts.includes(p))
  const pool = available.length > 0 ? available : wateringPrompts

  // Pick random prompt
  const prompt = pool[Math.floor(Math.random() * pool.length)]

  // Track it as recent
  recentPrompts.push(prompt)
  if (recentPrompts.length > RECENT_PROMPT_LIMIT) {
    recentPrompts.shift()
  }

  return prompt
}

function updatePourButtonState() {
  const { waterDialogJournal, waterDialogSave } = ctx.elements
  const hasContent = waterDialogJournal.value.trim().length > 0
  waterDialogSave.disabled = !hasContent
}

function openWaterDialog(sprout: { id: string, title: string, twigId: string, twigLabel: string, season: string }) {
  const { waterDialog, waterDialogTitle, waterDialogMeta, waterDialogJournal } = ctx.elements
  currentWateringSprout = { id: sprout.id, twigId: sprout.twigId }
  waterDialogTitle.textContent = sprout.title || 'Untitled Sprout'
  waterDialogMeta.textContent = `${sprout.twigLabel} · ${sprout.season}`
  waterDialogJournal.value = ''
  waterDialogJournal.placeholder = getRandomPrompt()
  updatePourButtonState()
  waterDialog.classList.remove('hidden')
  waterDialogJournal.focus()
}

function closeWaterDialog() {
  const { waterDialog, waterDialogJournal } = ctx.elements
  waterDialog.classList.add('hidden')
  waterDialogJournal.value = ''
  currentWateringSprout = null
}

function saveWaterEntry() {
  const { waterDialogJournal } = ctx.elements
  const entry = waterDialogJournal.value.trim()

  if (!entry) {
    // Must write something to water
    return
  }

  if (!canAffordWater()) {
    setStatus(ctx.elements, 'No water left today!', 'warning')
    closeWaterDialog()
    return
  }

  if (currentWateringSprout) {
    // Spend water, gain soil
    spendWater()
    recoverSoil(0.1)
    updateWaterMeter()
    updateSoilMeter()

    // Save water entry to sprout data
    const prompt = waterDialogJournal.placeholder
    addWaterEntry(currentWateringSprout.twigId, currentWateringSprout.id, entry, prompt)
    setStatus(ctx.elements, 'Sprout watered! (+0.1 soil)', 'info')
  }

  closeWaterDialog()
}

// Wire up water dialog handlers
ctx.elements.waterDialogClose.addEventListener('click', closeWaterDialog)
ctx.elements.waterDialogCancel.addEventListener('click', closeWaterDialog)
ctx.elements.waterDialogSave.addEventListener('click', saveWaterEntry)
ctx.elements.waterDialogJournal.addEventListener('input', updatePourButtonState)
ctx.elements.waterDialog.addEventListener('click', (e) => {
  if (e.target === ctx.elements.waterDialog) closeWaterDialog()
})

// Initialize sidebar sprout sections with branch hover/click callbacks
initSidebarSprouts(
  ctx,
  (sprout) => openWaterDialog(sprout),
  {
    onHoverStart: (index) => previewBranchFromSidebar(ctx, index),
    onHoverEnd: () => clearSidebarPreview(ctx),
    onClick: (index) => {
      clearSidebarPreview(ctx)
      enterBranchView(index, ctx, navCallbacks)
    }
  },
  (twigId, branchIndex) => {
    // Navigate to twig view
    const twig = ctx.nodeLookup.get(twigId)
    if (twig) {
      clearSidebarPreview(ctx)
      enterTwigView(twig, branchIndex, ctx, navCallbacks)
    }
  },
  (leafId, twigId, branchIndex) => {
    // Navigate to leaf view
    const twig = ctx.nodeLookup.get(twigId)
    if (twig) {
      clearSidebarPreview(ctx)
      // Enter twig view first, then open leaf view
      enterTwigView(twig, branchIndex, ctx, navCallbacks)
      setViewModeState('leaf', branchIndex, twigId, leafId)
      ctx.leafView?.open(leafId, twigId, branchIndex)
    }
  }
)

setViewMode('overview', ctx, navCallbacks)
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx)
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)
updateSoilMeter()
updateWaterMeter()

let resizeId = 0
const resizeObserver = new ResizeObserver(() => {
  if (resizeId) {
    window.cancelAnimationFrame(resizeId)
  }
  resizeId = window.requestAnimationFrame(() => positionNodes(ctx))
})
resizeObserver.observe(domResult.elements.canvas)
window.addEventListener('resize', () => positionNodes(ctx))

startWind(ctx)
setupHoverBranch(ctx, navCallbacks)

// Global keyboard navigation
document.addEventListener('keydown', (e) => {
  // Don't handle if twig view is open (it has its own handler)
  if (ctx.twigView?.isOpen()) return

  if (e.key === 'Escape' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  const num = parseInt(e.key, 10)
  if (num < 1 || num > 8) return

  if (getViewMode() === 'overview') {
    // Check if hovering a branch - if so, go to twig in that branch
    const hoveredGroup = ctx.elements.canvas.querySelector('.branch-group:hover')
    if (hoveredGroup) {
      const branchIndex = ctx.branchGroups.findIndex(g => g.group === hoveredGroup)
      if (branchIndex !== -1) {
        const twig = ctx.branchGroups[branchIndex]?.twigs[num - 1]
        if (twig) {
          enterTwigView(twig, branchIndex, ctx, navCallbacks)
        }
      }
    } else {
      // Not hovering - go to branch
      const branchIndex = num - 1
      const branchGroup = ctx.branchGroups[branchIndex]
      if (branchGroup) {
        enterBranchView(branchIndex, ctx, navCallbacks)
        branchGroup.branch.focus({ preventScroll: true })
      }
    }
    return
  }

  // In branch view: go to twig
  if (getViewMode() === 'branch') {
    const activeBranchIndex = getActiveBranchIndex()
    if (activeBranchIndex === null) return
    const branchGroup = ctx.branchGroups[activeBranchIndex]
    const twig = branchGroup?.twigs[num - 1]
    if (twig) {
      enterTwigView(twig, activeBranchIndex, ctx, navCallbacks)
    }
  }
})
