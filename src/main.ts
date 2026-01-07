import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState } from './state'
import { updateFocus, setFocusedNode } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { buildTwigView } from './ui/twig-view'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch, previewBranchFromSidebar, clearSidebarPreview } from './features/hover-branch'
import { handleExport, handleReset, handleImport } from './features/import-export'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
  returnToBranchView,
} from './features/navigation'
import { updateStats, buildBranchProgress, updateBranchProgress, updateSproutProgress } from './features/progress'
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

const mapPanel = domResult.elements.canvas.parentElement as HTMLElement
const twigView = buildTwigView(mapPanel, {
  onClose: () => returnToBranchView(ctx, navCallbacks),
  onSave: navCallbacks.onUpdateStats,
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
        updateSproutProgress(ctx, newTwig)
      }
    }
    return newTwig ?? null
  },
})

const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  branchProgressItems: [],
  editor,
  twigView,
}

const { exportButton, resetButton } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))
resetButton.addEventListener('click', () => handleReset(ctx, importExportCallbacks))

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

domResult.elements.debugCheckbox.addEventListener('change', (e) => {
  setDebugHoverZone((e.target as HTMLInputElement).checked)
})

domResult.elements.backToTrunkButton.addEventListener('click', () => {
  returnToOverview(ctx, navCallbacks)
})

buildBranchProgress(ctx, (index) => {
  if (getViewMode() !== 'branch') {
    // Overview mode: navigate to branch
    const branchGroup = ctx.branchGroups[index]
    if (!branchGroup) return
    enterBranchView(index, ctx, navCallbacks)
    branchGroup.branch.focus({ preventScroll: true })
  } else {
    // Branch view: click on twig opens twig view
    const activeBranchIndex = getActiveBranchIndex()
    if (activeBranchIndex === null) return
    const branchGroup = ctx.branchGroups[activeBranchIndex]
    const twig = branchGroup?.twigs[index]
    if (twig) {
      enterTwigView(twig, activeBranchIndex, ctx, navCallbacks)
    }
  }
}, {
  onHoverStart: (index) => previewBranchFromSidebar(ctx, index),
  onHoverEnd: () => clearSidebarPreview(ctx),
})

// Setup twig hover handlers for sprout preview in sidebar
function setupTwigHover(): void {
  ctx.branchGroups.forEach((group) => {
    group.twigs.forEach((twig) => {
      twig.addEventListener('mouseenter', () => {
        if (getViewMode() !== 'branch') return
        updateFocus(twig, ctx)
        updateSproutProgress(ctx, twig)
      })
      twig.addEventListener('mouseleave', () => {
        if (getViewMode() !== 'branch') return
        // Reset to branch focus and twig list when leaving twig
        const activeBranchIndex = getActiveBranchIndex()
        if (activeBranchIndex !== null) {
          const branchGroup = ctx.branchGroups[activeBranchIndex]
          updateFocus(branchGroup?.branch ?? null, ctx)
          updateBranchProgress(ctx)
        }
      })
    })
  })
}

setupTwigHover()
setViewMode('overview', ctx, navCallbacks)
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx)
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)

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
  if (ctx.twigView.isOpen()) return

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
