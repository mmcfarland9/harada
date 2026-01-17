import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState, advanceClockByDays, getDebugDate, nodeState, saveState, getSoilAvailable, getSoilCapacity, getWaterAvailable, getWaterCapacity, resetResources } from './state'
import { updateFocus, setFocusedNode } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { buildTwigView } from './ui/twig-view'
import { buildLeafView } from './ui/leaf-view'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch, previewBranchFromSidebar, clearSidebarPreview } from './features/hover-branch'
import { handleExport, handleImport, checkExportReminder } from './features/import-export'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
  returnToBranchView,
} from './features/navigation'
import { updateStats, initSidebarSprouts } from './features/progress'
import { setStatus, updateStatusMeta } from './features/status'
import { initWaterDialog } from './features/water-dialog'
import { initShineDialog } from './features/shine-dialog'
import { initSproutsDialog } from './features/sprouts-dialog'
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
    updateStatusMeta(ctx.elements, true)
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

// Initialize context first (partial, will be completed after dialog init)
const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  editor,
  twigView: undefined,
  leafView: undefined,
}

// Initialize dialogs
const waterDialogApi = initWaterDialog(ctx, {
  onWaterMeterChange: updateWaterMeter,
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
})

const shineDialogApi = initShineDialog(ctx, {
  onSunMeterChange: () => shineDialogApi.updateSunMeter(),
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
})

initSproutsDialog(ctx, {
  onUpdateStats: navCallbacks.onUpdateStats,
})

const mapPanel = domResult.elements.canvas.parentElement as HTMLElement
const twigView = buildTwigView(mapPanel, {
  onClose: () => returnToBranchView(ctx, navCallbacks),
  onSave: navCallbacks.onUpdateStats,
  onSoilChange: updateSoilMeter,
  onOpenLeaf: (leafId, twigId, branchIndex) => {
    setViewModeState('leaf', branchIndex, twigId)
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
  onWaterClick: (sprout) => waterDialogApi.openWaterDialog(sprout),
  onShineClick: (sprout) => shineDialogApi.openShineDialog(sprout),
  onGraftClick: (leafId, twigId, branchIndex) => {
    setViewModeState('leaf', branchIndex, twigId)
    ctx.leafView?.open(leafId, twigId, branchIndex, true)
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

// Complete the context with twig and leaf views
ctx.twigView = twigView
ctx.leafView = leafView

const { exportButton } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

// Encyclopedia dialog
const guideTabs = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLButtonElement>('.guide-tab')
const guidePanels = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLDivElement>('.guide-panel')
const { encyclopediaButtons } = getActionButtons(domResult.elements.shell)

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

// Close garden guide on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !domResult.elements.gardenGuideDialog.classList.contains('hidden')) {
    e.preventDefault()
    e.stopImmediatePropagation()
    domResult.elements.gardenGuideDialog.classList.add('hidden')
  }
}, true)

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
  shineDialogApi.updateSunMeter() // Sun resets daily
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
  resetResources()
  updateSoilMeter()
  updateWaterMeter()
  shineDialogApi.updateSunMeter()
  setStatus(ctx.elements, 'Resources reset to default', 'info')
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

// Initialize sidebar sprout sections with branch hover/click callbacks
initSidebarSprouts(
  ctx,
  (sprout) => waterDialogApi.openWaterDialog(sprout),
  (sprout) => shineDialogApi.openShineDialog(sprout),
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
      setViewModeState('leaf', branchIndex, twigId)
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
shineDialogApi.updateSunMeter()

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

// Check for export reminder after a short delay (don't compete with initial status)
setTimeout(() => checkExportReminder(ctx), 2000)

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
