import type { AppContext } from '../types'
import { GUIDE_ANIMATION_DURATION } from '../constants'
import {
  getViewMode,
  getActiveBranchIndex,
  getHoveredBranchIndex,
  getActiveCircle,
} from '../state'
import { getLeafCollisionDiameter, LEAF_BASE_SIZE, LEAF_PREVIEW_SIZE } from './leaf-sizing'

const GUIDE_GAP = 8
const LEAF_GAP = 4
const LEAF_COLLISION_PAD = 12
const BLOOM_MIN_RATIO = 0.12
const BLOOM_MAX_RATIO = 0.34
const BLOOM_OVERVIEW_MIN_RATIO = 0.06
const BLOOM_OVERVIEW_MAX_RATIO = 0.18
const LEAF_RING_RATIO = 0.55
const WIND_BRANCH_AMPLITUDE = 6
const WIND_LEAF_AMPLITUDE = 10
const WIND_BLOOM_PULSE = 0.04
const WIND_SPEED_MIN = 0.35
const WIND_SPEED_MAX = 0.7
const PREVIEW_FADE_DURATION = 500
let guideAnimationId = 0
let windAnimationId = 0
let windStartTime = 0
let previewStartTime = 0
let lastHoveredBranch: number | null = null

export function positionNodes(ctx: AppContext): void {
  const { canvas } = ctx.elements
  const { branches, editor } = ctx

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) {
    return
  }

  const base = Math.min(width, height)
  const centerX = width / 2
  const centerY = height / 2
  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()
  const isBranchView = viewMode === 'branch' && activeBranchIndex !== null
  const radiusX = Math.max(base * 0.42, width * 0.34)
  const radiusY = height * 0.34
  let activeBranchX = centerX
  let activeBranchY = centerY

  branches.forEach((node, index) => {
    const angle = (Math.PI / 4) * index - Math.PI / 2
    const branchX = centerX + Math.cos(angle) * radiusX
    const branchY = centerY + Math.sin(angle) * radiusY

    setBasePosition(node.wrapper, branchX, branchY)

    if (index === activeBranchIndex) {
      activeBranchX = branchX
      activeBranchY = branchY
    }

    const mainRadius = node.main.offsetWidth / 2
    const isActive = isBranchView && index === activeBranchIndex
    const leafSizes = node.subs.map((sub) =>
      isActive ? getLeafCollisionDiameter(sub) + LEAF_COLLISION_PAD * 2 : LEAF_PREVIEW_SIZE
    )
    const maxLeafRadius = leafSizes.length
      ? Math.max(...leafSizes) / 2
      : LEAF_BASE_SIZE / 2
    const minRatio = isActive ? BLOOM_MIN_RATIO : BLOOM_OVERVIEW_MIN_RATIO
    const maxRatio = isActive ? BLOOM_MAX_RATIO : BLOOM_OVERVIEW_MAX_RATIO
    const minRadius = Math.max(mainRadius + maxLeafRadius + GUIDE_GAP, base * minRatio)
    const maxRadius = Math.max(
      minRadius + maxLeafRadius * (isActive ? 2.4 : 1.6),
      base * maxRatio + maxLeafRadius * (isActive ? 0.6 : 0.2)
    )

    const offsets = buildRadialOffsets(node.subs.length, minRadius, maxRadius, leafSizes, angle)

    node.subs.forEach((sub, subIndex) => {
      const offset = offsets[subIndex]
      const offsetX = offset?.x ?? 0
      const offsetY = offset?.y ?? 0

      setBasePosition(sub, offsetX, offsetY)
      if (isActive) {
        sub.dataset.leafRadius = `${leafSizes[subIndex] / 2}`
      } else {
        delete sub.dataset.leafRadius
      }
    })
  })

  if (isBranchView) {
    setCameraTransform(ctx, centerX - activeBranchX, centerY - activeBranchY)
  } else {
    setCameraTransform(ctx, 0, 0)
  }

  drawGuideLines(ctx)

  const activeCircle = getActiveCircle()
  if (activeCircle) {
    editor.reposition(activeCircle)
  }
}

export function animateGuideLines(ctx: AppContext, duration = GUIDE_ANIMATION_DURATION): void {
  if (windAnimationId) {
    drawGuideLines(ctx)
    return
  }
  if (guideAnimationId) {
    window.cancelAnimationFrame(guideAnimationId)
  }

  const start = performance.now()
  const tick = () => {
    drawGuideLines(ctx)
    if (performance.now() - start < duration) {
      guideAnimationId = window.requestAnimationFrame(tick)
    } else {
      guideAnimationId = 0
      drawGuideLines(ctx)
    }
  }

  guideAnimationId = window.requestAnimationFrame(tick)
}

export function startWind(ctx: AppContext): void {
  if (windAnimationId) return
  windStartTime = performance.now()

  const tick = (time: number) => {
    applyWind(ctx, time)
    drawGuideLines(ctx)
    windAnimationId = window.requestAnimationFrame(tick)
  }

  windAnimationId = window.requestAnimationFrame(tick)
}

let debugHoverZone = false
const HOVER_MIN_RADIUS_RATIO = 0.55
const HOVER_MAX_RADIUS_RATIO = 1.35

export function setDebugHoverZone(enabled: boolean): void {
  debugHoverZone = enabled
}

function drawGuideLines(ctx: AppContext): void {
  const { canvas, center, guideLayer } = ctx.elements
  const { branches } = ctx

  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return
  }

  // Position guide layer to overlay the canvas
  // Guide layer is sibling of canvas in map-panel, so position relative to parent
  const parent = guideLayer.parentElement
  const parentRect = parent?.getBoundingClientRect()
  const offsetLeft = parentRect ? rect.left - parentRect.left : rect.left
  const offsetTop = parentRect ? rect.top - parentRect.top : rect.top

  guideLayer.style.left = `${offsetLeft}px`
  guideLayer.style.top = `${offsetTop}px`
  guideLayer.style.width = `${rect.width}px`
  guideLayer.style.height = `${rect.height}px`

  guideLayer.replaceChildren()

  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const lineFragment = document.createDocumentFragment()

  // Debug: draw hover trigger zone (uses SVG overlay)
  if (debugHoverZone && viewMode === 'overview') {
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Get ellipse radii from branches at cardinal positions
    const branchTop = branches[0]
    const branchRight = branches[2]
    if (branchTop && branchRight) {
      const topRect = branchTop.main.getBoundingClientRect()
      const rightRect = branchRight.main.getBoundingClientRect()
      const topY = topRect.top - rect.top + topRect.height / 2
      const rightX = rightRect.left - rect.left + rightRect.width / 2

      const ringRadiusY = Math.abs(centerY - topY)
      const ringRadiusX = Math.abs(rightX - centerX)

      const minRadiusX = ringRadiusX * HOVER_MIN_RADIUS_RATIO
      const minRadiusY = ringRadiusY * HOVER_MIN_RADIUS_RATIO
      const maxRadiusX = ringRadiusX * HOVER_MAX_RADIUS_RATIO
      const maxRadiusY = ringRadiusY * HOVER_MAX_RADIUS_RATIO

      // Create debug SVG overlay
      const debugSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      debugSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)
      debugSvg.setAttribute('width', `${rect.width}`)
      debugSvg.setAttribute('height', `${rect.height}`)
      debugSvg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100'

      // Draw min radius ellipse
      const ellipseMin = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
      ellipseMin.setAttribute('cx', `${centerX}`)
      ellipseMin.setAttribute('cy', `${centerY}`)
      ellipseMin.setAttribute('rx', `${minRadiusX}`)
      ellipseMin.setAttribute('ry', `${minRadiusY}`)
      ellipseMin.setAttribute('fill', 'none')
      ellipseMin.setAttribute('stroke', 'red')
      ellipseMin.setAttribute('stroke-width', '2')
      ellipseMin.setAttribute('stroke-dasharray', '8 4')
      ellipseMin.setAttribute('opacity', '0.7')
      debugSvg.append(ellipseMin)

      // Draw max radius ellipse
      const ellipseMax = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
      ellipseMax.setAttribute('cx', `${centerX}`)
      ellipseMax.setAttribute('cy', `${centerY}`)
      ellipseMax.setAttribute('rx', `${maxRadiusX}`)
      ellipseMax.setAttribute('ry', `${maxRadiusY}`)
      ellipseMax.setAttribute('fill', 'none')
      ellipseMax.setAttribute('stroke', 'red')
      ellipseMax.setAttribute('stroke-width', '2')
      ellipseMax.setAttribute('stroke-dasharray', '8 4')
      ellipseMax.setAttribute('opacity', '0.7')
      debugSvg.append(ellipseMax)

      // Get actual branch angles
      const branchAngles = branches.map((b) => {
        const bRect = b.main.getBoundingClientRect()
        const bx = bRect.left - rect.left + bRect.width / 2
        const by = bRect.top - rect.top + bRect.height / 2
        return Math.atan2(by - centerY, bx - centerX)
      })

      // Draw sector boundaries
      for (let i = 0; i < branches.length; i++) {
        const nextIndex = (i + 1) % branches.length
        const angle1 = branchAngles[i]
        const angle2 = branchAngles[nextIndex]

        let diff = angle2 - angle1
        if (diff > Math.PI) diff -= Math.PI * 2
        if (diff < -Math.PI) diff += Math.PI * 2
        const midAngle = angle1 + diff / 2

        const startX = centerX + Math.cos(midAngle) * minRadiusX
        const startY = centerY + Math.sin(midAngle) * minRadiusY
        const endX = centerX + Math.cos(midAngle) * maxRadiusX
        const endY = centerY + Math.sin(midAngle) * maxRadiusY

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', `${startX}`)
        line.setAttribute('y1', `${startY}`)
        line.setAttribute('x2', `${endX}`)
        line.setAttribute('y2', `${endY}`)
        line.setAttribute('stroke', 'red')
        line.setAttribute('stroke-width', '1.5')
        line.setAttribute('opacity', '0.6')
        debugSvg.append(line)
      }

      lineFragment.append(debugSvg)
    }
  }

  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const branch = branches[activeBranchIndex]
    if (branch) {
      const centerRect = center.getBoundingClientRect()
      const mainRect = branch.main.getBoundingClientRect()
      const centerPoint = getCenterPoint(centerRect, rect)
      const mainCenter = getCenterPoint(mainRect, rect)
      const centerRadius = centerRect.width / 2
      const mainRadius = mainRect.width / 2
      const trunkVectorX = mainCenter.x - centerPoint.x
      const trunkVectorY = mainCenter.y - centerPoint.y
      const trunkDistance = Math.hypot(trunkVectorX, trunkVectorY)

      if (trunkDistance) {
        const trunkUnitX = trunkVectorX / trunkDistance
        const trunkUnitY = trunkVectorY / trunkDistance
        const trunkStartX = centerPoint.x + trunkUnitX * (centerRadius + GUIDE_GAP)
        const trunkStartY = centerPoint.y + trunkUnitY * (centerRadius + GUIDE_GAP)
        const trunkEndX = mainCenter.x - trunkUnitX * (mainRadius + GUIDE_GAP)
        const trunkEndY = mainCenter.y - trunkUnitY * (mainRadius + GUIDE_GAP)

        appendLine(lineFragment, trunkStartX, trunkStartY, trunkEndX, trunkEndY, 'trunk')
      }

      branch.subs.forEach((sub) => {
        const subRect = sub.getBoundingClientRect()
        const subCenter = getCenterPoint(subRect, rect)
        const subRadius = Math.max(subRect.width, subRect.height) / 2
        const vectorX = subCenter.x - mainCenter.x
        const vectorY = subCenter.y - mainCenter.y
        const distance = Math.hypot(vectorX, vectorY)
        if (!distance) return

        const unitX = vectorX / distance
        const unitY = vectorY / distance
        const startX = mainCenter.x + unitX * (mainRadius + GUIDE_GAP)
        const startY = mainCenter.y + unitY * (mainRadius + GUIDE_GAP)
        const endX = subCenter.x - unitX * (subRadius + LEAF_GAP)
        const endY = subCenter.y - unitY * (subRadius + LEAF_GAP)

        appendLine(lineFragment, startX, startY, endX, endY, 'leaf')
      })
    }
  } else {
    const centerRect = center.getBoundingClientRect()
    const centerPoint = getCenterPoint(centerRect, rect)
    const centerRadius = centerRect.width / 2

    branches.forEach((branch) => {
      const mainRect = branch.main.getBoundingClientRect()
      const mainCenter = getCenterPoint(mainRect, rect)
      const mainRadius = mainRect.width / 2
      const vectorX = mainCenter.x - centerPoint.x
      const vectorY = mainCenter.y - centerPoint.y
      const distance = Math.hypot(vectorX, vectorY)
      if (!distance) return

      const unitX = vectorX / distance
      const unitY = vectorY / distance
      const startX = centerPoint.x + unitX * (centerRadius + GUIDE_GAP)
      const startY = centerPoint.y + unitY * (centerRadius + GUIDE_GAP)
      const endX = mainCenter.x - unitX * (mainRadius + GUIDE_GAP)
      const endY = mainCenter.y - unitY * (mainRadius + GUIDE_GAP)

      appendLine(lineFragment, startX, startY, endX, endY, 'branch')
    })

    if (hoveredBranchIndex !== null) {
      // Track when preview started for fade-in
      if (lastHoveredBranch !== hoveredBranchIndex) {
        previewStartTime = performance.now()
        lastHoveredBranch = hoveredBranchIndex
      }

      const elapsed = performance.now() - previewStartTime
      const fadeProgress = Math.min(elapsed / PREVIEW_FADE_DURATION, 1)
      const lineOpacity = 0.4 * fadeProgress

      const branch = branches[hoveredBranchIndex]
      if (branch) {
        const mainRect = branch.main.getBoundingClientRect()
        const mainCenter = getCenterPoint(mainRect, rect)
        const mainRadius = mainRect.width / 2

        branch.subs.forEach((sub) => {
          const subRect = sub.getBoundingClientRect()
          const subCenter = getCenterPoint(subRect, rect)
          const subRadius = Math.max(subRect.width, subRect.height) / 2
          const vectorX = subCenter.x - mainCenter.x
          const vectorY = subCenter.y - mainCenter.y
          const distance = Math.hypot(vectorX, vectorY)
          if (!distance) return

          const unitX = vectorX / distance
          const unitY = vectorY / distance
          const startX = mainCenter.x + unitX * (mainRadius + GUIDE_GAP)
          const startY = mainCenter.y + unitY * (mainRadius + GUIDE_GAP)
          const endX = subCenter.x - unitX * (subRadius + LEAF_GAP)
          const endY = subCenter.y - unitY * (subRadius + LEAF_GAP)

          appendLine(lineFragment, startX, startY, endX, endY, 'leaf', lineOpacity)
        })
      }
    } else {
      lastHoveredBranch = null
    }
  }

  guideLayer.append(lineFragment)
}

function applyWind(ctx: AppContext, timestamp: number): void {
  const { branches, editor } = ctx
  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()
  const isBranchView = viewMode === 'branch' && activeBranchIndex !== null
  const time = (timestamp - windStartTime) / 1000

  const branchAmplitude = WIND_BRANCH_AMPLITUDE * (isBranchView ? 0.7 : 1)
  const leafAmplitude = WIND_LEAF_AMPLITUDE * (isBranchView ? 0.85 : 1)
  const pulseAmount = WIND_BLOOM_PULSE * (isBranchView ? 0.85 : 1)

  branches.forEach((branch, index) => {
    if (isBranchView && index !== activeBranchIndex) {
      return
    }

    const branchSeed = 97 + index * 41
    const branchSpeed = lerp(WIND_SPEED_MIN, WIND_SPEED_MAX, seededValue(branchSeed, 13.7))
    const branchPhase = seededValue(branchSeed, 23.1) * Math.PI * 2
    const branchBaseX = getBaseValue(branch.wrapper, 'x')
    const branchBaseY = getBaseValue(branch.wrapper, 'y')
    const branchOffsetX = Math.sin(time * branchSpeed + branchPhase) * branchAmplitude
    const branchOffsetY = Math.cos(time * (branchSpeed * 0.8) + branchPhase) * branchAmplitude * 0.6

    if (branchBaseX !== null && branchBaseY !== null) {
      branch.wrapper.style.left = `${branchBaseX + branchOffsetX}px`
      branch.wrapper.style.top = `${branchBaseY + branchOffsetY}px`
    }

    branch.subs.forEach((sub) => {
      const baseX = getBaseValue(sub, 'x')
      const baseY = getBaseValue(sub, 'y')
      if (baseX === null || baseY === null) return

      const leafIndex = Number(sub.dataset.leafIndex || '0')
      const leafRadius = getLeafRadius(sub)
      const leafScale = clamp(1 - (leafRadius - LEAF_BASE_SIZE / 2) / (LEAF_BASE_SIZE * 1.6), 0.5, 1)
      const seed = 131 + index * 71 + leafIndex * 17
      const speed = lerp(WIND_SPEED_MIN, WIND_SPEED_MAX, seededValue(seed, 17.9))
      const phase = seededValue(seed, 29.3) * Math.PI * 2
      const amplitude = leafAmplitude * leafScale * (0.7 + seededValue(seed, 41.7) * 0.6)
      const pulse = 1 + Math.sin(time * (speed * 0.5) + phase) * pulseAmount * leafScale
      const flutter = Math.sin(time * (speed * 2.2) + phase) * amplitude * 0.18

      const offsetX = baseX * pulse + Math.sin(time * speed + phase) * amplitude + flutter
      const offsetY = baseY * pulse + Math.cos(time * (speed * 0.9) + phase) * amplitude * 0.6 - flutter

      sub.style.left = `${offsetX}px`
      sub.style.top = `${offsetY}px`
    })
  })

  const activeCircle = getActiveCircle()
  if (activeCircle && !editor.container.classList.contains('hidden')) {
    editor.reposition(activeCircle)
  }
}

function getLeafRadius(element: HTMLElement): number {
  const raw = element.dataset.leafRadius
  if (raw) {
    const parsed = Number.parseFloat(raw)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  const width = element.offsetWidth || LEAF_BASE_SIZE
  const height = element.offsetHeight || LEAF_BASE_SIZE
  return Math.hypot(width, height) / 2
}

function getCenterPoint(rect: DOMRect, canvasRect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left - canvasRect.left + rect.width / 2,
    y: rect.top - canvasRect.top + rect.height / 2,
  }
}

function appendLine(
  fragment: DocumentFragment,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  variant: 'branch' | 'leaf' | 'trunk',
  opacity?: number
): void {
  // Guide layer is now outside canvas, positioned to overlay it
  // Coordinates are viewport-relative to canvas, which matches guide layer
  const dx = endX - startX
  const dy = endY - startY
  const distance = Math.hypot(dx, dy)
  const charSpacing = variant === 'leaf' ? 8 : 12
  const numChars = Math.max(1, Math.floor(distance / charSpacing))
  const char = '.'

  for (let i = 0; i < numChars; i++) {
    const t = numChars > 1 ? i / (numChars - 1) : 0.5
    const x = startX + dx * t
    const y = startY + dy * t

    const span = document.createElement('span')
    span.className = `ascii-line ${variant}`
    span.textContent = char
    span.style.left = `${x}px`
    span.style.top = `${y}px`
    if (opacity !== undefined) {
      span.style.opacity = `${opacity}`
    }
    fragment.append(span)
  }
}

function setBasePosition(element: HTMLElement, x: number, y: number): void {
  element.style.left = `${x}px`
  element.style.top = `${y}px`
  element.dataset.baseX = `${x}`
  element.dataset.baseY = `${y}`
}

function setCameraTransform(ctx: AppContext, offsetX: number, offsetY: number): void {
  ctx.elements.canvas.style.setProperty('--camera-x', `${offsetX}px`)
  ctx.elements.canvas.style.setProperty('--camera-y', `${offsetY}px`)
}

function getBaseValue(element: HTMLElement, axis: 'x' | 'y'): number | null {
  const key = axis === 'x' ? 'baseX' : 'baseY'
  const value = element.dataset[key]
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function seededValue(seed: number, salt: number): number {
  const value = Math.sin(seed * salt) * 43758.5453
  return value - Math.floor(value)
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

function buildRadialOffsets(
  count: number,
  minRadius: number,
  maxRadius: number,
  leafSizes: number[],
  branchAngle: number
): Array<{ x: number; y: number }> {
  if (!count) return []

  const points: Array<{ x: number; y: number }> = []
  const radii = leafSizes.map((size) => size / 2)
  const angleStep = (Math.PI * 2) / count
  const safeRadius = getSafeRadius(radii, angleStep)
  const targetRadius = minRadius + (maxRadius - minRadius) * LEAF_RING_RATIO
  const ringRadius = Math.max(targetRadius, safeRadius, minRadius)

  for (let i = 0; i < count; i += 1) {
    const angle = angleStep * i + branchAngle
    const x = Math.cos(angle) * ringRadius
    const y = Math.sin(angle) * ringRadius
    points.push({ x, y })
  }

  return points
}

function getSafeRadius(radii: number[], angleStep: number): number {
  if (radii.length < 2) return 0
  const denominator = 2 * Math.sin(angleStep / 2)
  if (!denominator) return 0

  let required = 0
  for (let i = 0; i < radii.length; i += 1) {
    const current = radii[i]
    const next = radii[(i + 1) % radii.length]
    const needed = (current + next + LEAF_GAP) / denominator
    if (needed > required) {
      required = needed
    }
  }

  return required
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
