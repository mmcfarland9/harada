import type { AppContext, ViewMode } from '../types'
import { ZOOM_TRANSITION_DURATION, EDITOR_OPEN_DELAY } from '../constants'
import { getViewMode, setViewModeState, getActiveBranchIndex, getHoveredBranchIndex, isBranchView, isTwigView } from '../state'
import {
  setNodeVisibility,
  setFocusedNode,
  updateFocus,
  getNodePlaceholder,
} from '../ui/node-ui'
import { animateGuideLines } from '../ui/layout'

let zoomTimeoutId = 0
let zoomOriginTimeoutId = 0
const fadeTimeouts = new Map<number, number>() // branchIndex -> timeoutId

export type NavigationCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

function setTwigZoomOrigin(ctx: AppContext, twigNode: HTMLElement): void {
  if (zoomOriginTimeoutId) {
    window.clearTimeout(zoomOriginTimeoutId)
    zoomOriginTimeoutId = 0
  }

  const canvas = ctx.elements.canvas
  const canvasRect = canvas.getBoundingClientRect()
  const twigRect = twigNode.getBoundingClientRect()
  if (!canvasRect.width || !canvasRect.height) return

  const centerX = twigRect.left + twigRect.width / 2
  const centerY = twigRect.top + twigRect.height / 2
  const originX = ((centerX - canvasRect.left) / canvasRect.width) * 100
  const originY = ((centerY - canvasRect.top) / canvasRect.height) * 100
  const clampedX = Math.min(100, Math.max(0, originX))
  const clampedY = Math.min(100, Math.max(0, originY))

  canvas.style.setProperty('--zoom-origin-x', `${clampedX}%`)
  canvas.style.setProperty('--zoom-origin-y', `${clampedY}%`)
}

function resetTwigZoomOrigin(ctx: AppContext): void {
  if (zoomOriginTimeoutId) {
    window.clearTimeout(zoomOriginTimeoutId)
    zoomOriginTimeoutId = 0
  }

  ctx.elements.canvas.style.removeProperty('--zoom-origin-x')
  ctx.elements.canvas.style.removeProperty('--zoom-origin-y')
}

export function updateVisibility(ctx: AppContext): void {
  const { canvas, trunk } = ctx.elements
  const { branchGroups } = ctx
  const activeBranchIndex = getActiveBranchIndex()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const isBranch = isBranchView()
  const isTwig = isTwigView()
  const isPreview = !isBranch && !isTwig && hoveredBranchIndex !== null

  canvas.classList.toggle('is-zoomed', isBranch)
  canvas.classList.toggle('is-twig-zoomed', isTwig)
  canvas.classList.toggle('is-previewing', isPreview)
  trunk.classList.toggle('is-minimized', isBranch || isTwig)

  if (isBranch && activeBranchIndex !== null) {
    // Position trunk asterisk farther away from the active branch
    const angle = (Math.PI / 4) * activeBranchIndex - Math.PI / 2
    const offset = 18 // percentage offset from center
    const offsetX = 50 - Math.cos(angle) * offset
    const offsetY = 50 - Math.sin(angle) * offset
    trunk.style.setProperty('--minimized-x', `${offsetX}%`)
    trunk.style.setProperty('--minimized-y', `${offsetY}%`)
  } else {
    trunk.style.removeProperty('--minimized-x')
    trunk.style.removeProperty('--minimized-y')
  }

  branchGroups.forEach((branchGroup, index) => {
    const isActive = isBranch && index === activeBranchIndex
    const isPreviewed = !isBranch && hoveredBranchIndex === index
    const wasPreview = branchGroup.group.classList.contains('is-preview')

    branchGroup.group.classList.toggle('is-hidden', isBranch && !isActive)
    branchGroup.group.classList.toggle('is-active', isActive)
    branchGroup.group.classList.toggle('is-preview', isPreviewed)

    setNodeVisibility(branchGroup.branch, !isBranch || isActive)

    // Delay hiding leaves when exiting preview for smooth fade-out (only in overview mode)
    const shouldShow = isBranch ? isActive : isPreviewed

    // Cancel any pending fade-out timeout for this branch
    const existingTimeout = fadeTimeouts.get(index)
    if (existingTimeout) {
      window.clearTimeout(existingTimeout)
      fadeTimeouts.delete(index)
    }

    if (!isBranch && wasPreview && !isPreviewed && !shouldShow) {
      // Let the fade-out transition play before hiding with randomized timing
      const maxDelay = 400
      const baseDuration = 800
      const durationVariance = 600
      let maxTotalTime = 0

      branchGroup.twigs.forEach((twig) => {
        const delay = Math.random() * maxDelay
        const duration = baseDuration + Math.random() * durationVariance
        twig.style.setProperty('--fade-delay', `${delay}ms`)
        twig.style.setProperty('--fade-duration', `${duration}ms`)
        twig.classList.add('is-fading')
        maxTotalTime = Math.max(maxTotalTime, delay + duration)
      })

      const timeoutId = window.setTimeout(() => {
        fadeTimeouts.delete(index)
        branchGroup.twigs.forEach((twig) => {
          twig.classList.remove('is-fading')
          twig.style.removeProperty('--fade-delay')
          twig.style.removeProperty('--fade-duration')
          setNodeVisibility(twig, false)
        })
      }, maxTotalTime + 50)
      fadeTimeouts.set(index, timeoutId)
    } else {
      branchGroup.twigs.forEach((twig) => {
        twig.classList.remove('is-fading')
        twig.style.removeProperty('--fade-delay')
        twig.style.removeProperty('--fade-duration')
        setNodeVisibility(twig, shouldShow)
      })
    }
  })

}

export function setViewMode(
  mode: ViewMode,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  branchIndex?: number
): void {
  const previousMode = getViewMode()
  const previousBranch = getActiveBranchIndex()

  if (previousMode === 'twig') {
    resetTwigZoomOrigin(ctx)
  }
  setViewModeState(mode, branchIndex)

  const shouldAnimate = previousMode !== mode || previousBranch !== getActiveBranchIndex()

  if (shouldAnimate) {
    ctx.elements.canvas.classList.add('is-zooming')
    if (zoomTimeoutId) {
      window.clearTimeout(zoomTimeoutId)
    }
    zoomTimeoutId = window.setTimeout(() => {
      ctx.elements.canvas.classList.remove('is-zooming')
    }, ZOOM_TRANSITION_DURATION)
  }

  ctx.editor.close()
  updateVisibility(ctx)
  callbacks.onPositionNodes()
  if (shouldAnimate) {
    animateGuideLines(ctx)
  }
}

export function returnToOverview(
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  setViewMode('overview', ctx, callbacks)
  callbacks.onUpdateStats() // Update sidebar to show branches

  // Clear focus so trunk info shows in sidebar
  setFocusedNode(null, ctx, (target) => updateFocus(target, ctx))
}

export function enterBranchView(
  index: number,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  focusNode?: HTMLButtonElement | null,
  openEditor = false
): void {
  setViewMode('branch', ctx, callbacks, index)
  callbacks.onUpdateStats() // Update sidebar to show twigs

  const target = focusNode ?? ctx.branchGroups[index]?.branch ?? null
  if (!target) return

  setFocusedNode(target, ctx, (t) => updateFocus(t, ctx))

  if (openEditor) {
    window.setTimeout(() => {
      ctx.editor.open(target, getNodePlaceholder(target))
    }, EDITOR_OPEN_DELAY)
  }
}

export function enterTwigView(
  twigNode: HTMLButtonElement,
  branchIndex: number,
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  const twigId = twigNode.dataset.nodeId
  if (!twigId) return

  setTwigZoomOrigin(ctx, twigNode)
  const previousMode = getViewMode()
  setViewModeState('twig', branchIndex, twigId)

  const shouldAnimate = previousMode !== 'twig'
  if (shouldAnimate) {
    ctx.elements.canvas.classList.add('is-zooming')
    if (zoomTimeoutId) {
      window.clearTimeout(zoomTimeoutId)
    }
    zoomTimeoutId = window.setTimeout(() => {
      ctx.elements.canvas.classList.remove('is-zooming')
    }, ZOOM_TRANSITION_DURATION)
  }

  ctx.editor.close()
  updateVisibility(ctx)
  callbacks.onPositionNodes()
  callbacks.onUpdateStats()

  // Open the twig view
  ctx.twigView?.open(twigNode)

  setFocusedNode(twigNode, ctx, (t) => updateFocus(t, ctx))
}

export function returnToBranchView(
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  const branchIndex = getActiveBranchIndex()
  if (branchIndex === null) {
    returnToOverview(ctx, callbacks)
    return
  }

  ctx.twigView?.close()
  setViewMode('branch', ctx, callbacks, branchIndex)
  callbacks.onUpdateStats()

  // Focus on the branch
  const branch = ctx.branchGroups[branchIndex]?.branch
  if (branch) {
    setFocusedNode(branch, ctx, (t) => updateFocus(t, ctx))
  }
}
