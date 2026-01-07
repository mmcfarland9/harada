import type { AppContext } from '../types'
import { GUIDE_ANIMATION_DURATION } from '../constants'
import { getViewMode, getActiveBranchIndex, getHoveredBranchIndex, getActiveNode } from '../state'

// Constants
const GUIDE_GAP = 8, TWIG_GAP = 4, TWIG_COLLISION_PAD = 8, TWIG_BASE_SIZE = 36, TWIG_PREVIEW_SIZE = 14, TWIG_MAX_SIZE = 80
const BLOOM_MIN = 0.12, BLOOM_MAX = 0.34, BLOOM_OV_MIN = 0.06, BLOOM_OV_MAX = 0.18, TWIG_RING_RATIO = 0.55
const WIND_BRANCH_AMP = 6, WIND_TWIG_AMP = 10, WIND_PULSE = 0.04, WIND_MIN = 0.35, WIND_MAX = 0.7
const PREVIEW_FADE = 500, HOVER_MIN_RATIO = 0.55, HOVER_MAX_RATIO = 1.35

let guideAnimationId = 0, windAnimationId = 0, windStartTime = 0, previewStartTime = 0
let lastHoveredBranch: number | null = null, debugHoverZone = false

export function positionNodes(ctx: AppContext): void {
  const { canvas } = ctx.elements
  const { branchGroups, editor } = ctx
  const width = canvas.clientWidth, height = canvas.clientHeight
  if (!width || !height) return

  const base = Math.min(width, height)
  const centerX = width / 2, centerY = height / 2
  const viewMode = getViewMode(), activeBranchIndex = getActiveBranchIndex()
  const isBranchView = viewMode === 'branch' && activeBranchIndex !== null
  const isTwigView = viewMode === 'twig' && activeBranchIndex !== null
  const isFocusedBranch = isBranchView || isTwigView
  const radiusX = Math.max(base * 0.42, width * 0.34), radiusY = height * 0.34
  let activeBranchX = centerX, activeBranchY = centerY

  branchGroups.forEach((group, index) => {
    const angle = (Math.PI / 4) * index - Math.PI / 2
    const branchX = centerX + Math.cos(angle) * radiusX
    const branchY = centerY + Math.sin(angle) * radiusY
    setBasePosition(group.group, branchX, branchY)
    if (index === activeBranchIndex) { activeBranchX = branchX; activeBranchY = branchY }

    const mainRadius = Math.max(group.branch.offsetWidth, group.branch.offsetHeight) / 2
    const isActive = isFocusedBranch && index === activeBranchIndex
    const twigSizes = group.twigs.map(twig => isActive ? getTwigCollisionDiameter(twig) + TWIG_COLLISION_PAD * 2 : TWIG_PREVIEW_SIZE)
    const maxTwigRadius = twigSizes.length ? Math.max(...twigSizes) / 2 : TWIG_BASE_SIZE / 2
    const [minRatio, maxRatio] = isActive ? [BLOOM_MIN, BLOOM_MAX] : [BLOOM_OV_MIN, BLOOM_OV_MAX]
    const minRadius = Math.max(mainRadius + maxTwigRadius + GUIDE_GAP, base * minRatio)
    const maxRadius = Math.min(
      Math.max(minRadius + maxTwigRadius * (isActive ? 1.8 : 1.4), base * maxRatio),
      base * (isActive ? 0.42 : 0.22) // Hard cap to keep twigs in bounds
    )
    const offsets = buildRadialOffsets(group.twigs.length, minRadius, maxRadius, twigSizes, angle)

    group.twigs.forEach((twig, i) => {
      setBasePosition(twig, offsets[i]?.x ?? 0, offsets[i]?.y ?? 0)
      if (isActive) twig.dataset.twigRadius = `${twigSizes[i] / 2}`
      else delete twig.dataset.twigRadius
    })
  })

  setCameraTransform(ctx, isFocusedBranch ? centerX - activeBranchX : 0, isFocusedBranch ? centerY - activeBranchY : 0)
  drawGuideLines(ctx)
  const activeNode = getActiveNode()
  if (activeNode) editor.reposition(activeNode)
}

export function animateGuideLines(ctx: AppContext, duration = GUIDE_ANIMATION_DURATION): void {
  if (windAnimationId) { drawGuideLines(ctx); return }
  if (guideAnimationId) cancelAnimationFrame(guideAnimationId)
  const start = performance.now()
  const tick = () => {
    drawGuideLines(ctx)
    guideAnimationId = performance.now() - start < duration ? requestAnimationFrame(tick) : 0
  }
  guideAnimationId = requestAnimationFrame(tick)
}

export function startWind(ctx: AppContext): void {
  if (windAnimationId) return
  windStartTime = performance.now()
  const tick = (time: number) => { applyWind(ctx, time); drawGuideLines(ctx); windAnimationId = requestAnimationFrame(tick) }
  windAnimationId = requestAnimationFrame(tick)
}

export function setDebugHoverZone(enabled: boolean): void { debugHoverZone = enabled }

function drawGuideLines(ctx: AppContext): void {
  const { canvas, trunk, guideLayer } = ctx.elements
  const { branchGroups } = ctx
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const parent = guideLayer.parentElement
  const parentRect = parent?.getBoundingClientRect()
  guideLayer.style.left = `${parentRect ? rect.left - parentRect.left : rect.left}px`
  guideLayer.style.top = `${parentRect ? rect.top - parentRect.top : rect.top}px`
  guideLayer.style.width = `${rect.width}px`
  guideLayer.style.height = `${rect.height}px`
  guideLayer.replaceChildren()

  const viewMode = getViewMode(), activeBranchIndex = getActiveBranchIndex(), hoveredBranchIndex = getHoveredBranchIndex()
  const frag = document.createDocumentFragment()

  // Debug hover zone visualization
  if (debugHoverZone && viewMode === 'overview') {
    const cx = rect.width / 2, cy = rect.height / 2
    const [b0, b2] = [branchGroups[0], branchGroups[2]]
    if (b0 && b2) {
      const r0 = b0.branch.getBoundingClientRect(), r2 = b2.branch.getBoundingClientRect()
      const ringRY = Math.abs(cy - (r0.top - rect.top + r0.height / 2))
      const ringRX = Math.abs((r2.left - rect.left + r2.width / 2) - cx)
      const svg = createSvg(rect.width, rect.height)
      svg.append(createEllipse(cx, cy, ringRX * HOVER_MIN_RATIO, ringRY * HOVER_MIN_RATIO))
      svg.append(createEllipse(cx, cy, ringRX * HOVER_MAX_RATIO, ringRY * HOVER_MAX_RATIO))
      const angles = branchGroups.map(g => { const r = g.branch.getBoundingClientRect(); return Math.atan2(r.top - rect.top + r.height/2 - cy, r.left - rect.left + r.width/2 - cx) })
      for (let i = 0; i < branchGroups.length; i++) {
        const a1 = angles[i], a2 = angles[(i+1) % branchGroups.length]
        let diff = a2 - a1; if (diff > Math.PI) diff -= Math.PI*2; if (diff < -Math.PI) diff += Math.PI*2
        const mid = a1 + diff/2
        svg.append(createSvgLine(cx + Math.cos(mid)*ringRX*HOVER_MIN_RATIO, cy + Math.sin(mid)*ringRY*HOVER_MIN_RATIO, cx + Math.cos(mid)*ringRX*HOVER_MAX_RATIO, cy + Math.sin(mid)*ringRY*HOVER_MAX_RATIO))
      }
      frag.append(svg)
    }
  }

  const trunkRect = trunk.getBoundingClientRect()
  const trunkCenter = getCenterPoint(trunkRect, rect), trunkRadius = trunkRect.width / 2

  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const bg = branchGroups[activeBranchIndex]
    if (bg) {
      const mainRect = bg.branch.getBoundingClientRect()
      const mainCenter = getCenterPoint(mainRect, rect), mainRadius = Math.max(mainRect.width, mainRect.height) / 2
      drawLineBetween(frag, trunkCenter, trunkRadius, mainCenter, mainRadius, 'trunk')
      bg.twigs.forEach(twig => {
        const tr = twig.getBoundingClientRect()
        drawLineBetween(frag, mainCenter, mainRadius, getCenterPoint(tr, rect), Math.max(tr.width, tr.height)/2, 'twig', TWIG_GAP)
      })
    }
  } else {
    branchGroups.forEach(bg => {
      const mr = bg.branch.getBoundingClientRect()
      drawLineBetween(
        frag,
        trunkCenter,
        trunkRadius,
        getCenterPoint(mr, rect),
        Math.max(mr.width, mr.height) / 2,
        'branch'
      )
    })
    if (hoveredBranchIndex !== null) {
      if (lastHoveredBranch !== hoveredBranchIndex) { previewStartTime = performance.now(); lastHoveredBranch = hoveredBranchIndex }
      const opacity = 0.4 * Math.min((performance.now() - previewStartTime) / PREVIEW_FADE, 1)
      const bg = branchGroups[hoveredBranchIndex]
      if (bg) {
        const mr = bg.branch.getBoundingClientRect()
        const mc = getCenterPoint(mr, rect), mrad = Math.max(mr.width, mr.height) / 2
        bg.twigs.forEach(twig => {
          const tr = twig.getBoundingClientRect()
          drawLineBetween(frag, mc, mrad, getCenterPoint(tr, rect), Math.max(tr.width, tr.height)/2, 'twig', TWIG_GAP, opacity)
        })
      }
    } else { lastHoveredBranch = null }
  }
  guideLayer.append(frag)
}

function applyWind(ctx: AppContext, timestamp: number): void {
  const { branchGroups, editor } = ctx
  const viewMode = getViewMode(), activeBranchIndex = getActiveBranchIndex()
  const isFocusedBranch = (viewMode === 'branch' || viewMode === 'twig') && activeBranchIndex !== null
  const time = (timestamp - windStartTime) / 1000
  const bAmp = WIND_BRANCH_AMP * (isFocusedBranch ? 0.7 : 1)
  const tAmp = WIND_TWIG_AMP * (isFocusedBranch ? 0.85 : 1)
  const pulse = WIND_PULSE * (isFocusedBranch ? 0.85 : 1)

  branchGroups.forEach((bg, idx) => {
    if (isFocusedBranch && idx !== activeBranchIndex) return
    const seed = 97 + idx * 41
    const speed = lerp(WIND_MIN, WIND_MAX, seeded(seed, 13.7))
    const phase = seeded(seed, 23.1) * Math.PI * 2
    const bx = getBase(bg.group, 'x'), by = getBase(bg.group, 'y')
    if (bx !== null && by !== null) {
      bg.group.style.left = `${bx + Math.sin(time * speed + phase) * bAmp}px`
      bg.group.style.top = `${by + Math.cos(time * speed * 0.8 + phase) * bAmp * 0.6}px`
    }
    bg.twigs.forEach(twig => {
      const x = getBase(twig, 'x'), y = getBase(twig, 'y')
      if (x === null || y === null) return
      const ti = Number(twig.dataset.twigIndex || '0')
      const tr = getTwigRadius(twig)
      const scale = clamp(1 - (tr - TWIG_BASE_SIZE/2) / (TWIG_BASE_SIZE * 1.6), 0.5, 1)
      const s = 131 + idx * 71 + ti * 17
      const sp = lerp(WIND_MIN, WIND_MAX, seeded(s, 17.9))
      const ph = seeded(s, 29.3) * Math.PI * 2
      const amp = tAmp * scale * (0.7 + seeded(s, 41.7) * 0.6)
      const p = 1 + Math.sin(time * sp * 0.5 + ph) * pulse * scale
      const fl = Math.sin(time * sp * 2.2 + ph) * amp * 0.18
      twig.style.left = `${x * p + Math.sin(time * sp + ph) * amp + fl}px`
      twig.style.top = `${y * p + Math.cos(time * sp * 0.9 + ph) * amp * 0.6 - fl}px`
    })
  })
  const activeNode = getActiveNode()
  if (activeNode && !editor.container.classList.contains('hidden')) editor.reposition(activeNode)
}

// Helpers
function drawLineBetween(frag: DocumentFragment, p1: {x:number,y:number}, r1: number, p2: {x:number,y:number}, r2: number, variant: 'branch'|'twig'|'trunk', gap2 = GUIDE_GAP, opacity?: number): void {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.hypot(dx, dy)
  if (!dist) return
  const ux = dx/dist, uy = dy/dist
  appendLine(frag, p1.x + ux*(r1+GUIDE_GAP), p1.y + uy*(r1+GUIDE_GAP), p2.x - ux*(r2+gap2), p2.y - uy*(r2+gap2), variant, opacity)
}

function appendLine(frag: DocumentFragment, x1: number, y1: number, x2: number, y2: number, variant: 'branch'|'twig'|'trunk', opacity?: number): void {
  const dx = x2-x1, dy = y2-y1, dist = Math.hypot(dx, dy)
  const spacing = variant === 'twig' ? 8 : 12, n = Math.max(1, Math.floor(dist / spacing))
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i/(n-1) : 0.5
    const span = document.createElement('span')
    span.className = `ascii-line ${variant}`
    span.textContent = '.'
    span.style.left = `${x1 + dx*t}px`
    span.style.top = `${y1 + dy*t}px`
    if (opacity !== undefined) span.style.opacity = `${opacity}`
    frag.append(span)
  }
}

function getCenterPoint(r: DOMRect, canvas: DOMRect): {x: number, y: number} {
  return { x: r.left - canvas.left + r.width/2, y: r.top - canvas.top + r.height/2 }
}

function setBasePosition(el: HTMLElement, x: number, y: number): void {
  el.style.left = `${x}px`; el.style.top = `${y}px`
  el.dataset.baseX = `${x}`; el.dataset.baseY = `${y}`
}

function setCameraTransform(ctx: AppContext, x: number, y: number): void {
  ctx.elements.canvas.style.setProperty('--camera-x', `${x}px`)
  ctx.elements.canvas.style.setProperty('--camera-y', `${y}px`)
}

function getBase(el: HTMLElement, axis: 'x'|'y'): number | null {
  const v = el.dataset[axis === 'x' ? 'baseX' : 'baseY']
  if (!v) return null
  const p = parseFloat(v)
  return isNaN(p) ? null : p
}

function getTwigCollisionDiameter(el: HTMLElement): number {
  const w = Math.min(el.offsetWidth || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  const h = Math.min(el.offsetHeight || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  return Math.hypot(w, h)
}

function getTwigRadius(el: HTMLElement): number {
  const r = el.dataset.twigRadius
  if (r) { const p = parseFloat(r); if (!isNaN(p)) return p }
  return Math.hypot(el.offsetWidth || TWIG_BASE_SIZE, el.offsetHeight || TWIG_BASE_SIZE) / 2
}

function seeded(seed: number, salt: number): number { const v = Math.sin(seed * salt) * 43758.5453; return v - Math.floor(v) }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function clamp(v: number, min: number, max: number): number { return Math.min(Math.max(v, min), max) }

function buildRadialOffsets(count: number, minR: number, maxR: number, sizes: number[], angle: number): Array<{x: number, y: number}> {
  if (!count) return []
  const radii = sizes.map(s => s/2), step = (Math.PI * 2) / count
  const safe = getSafeRadius(radii, step)
  const ring = Math.max(minR + (maxR - minR) * TWIG_RING_RATIO, safe, minR)
  return Array.from({length: count}, (_, i) => ({ x: Math.cos(step * i + angle) * ring, y: Math.sin(step * i + angle) * ring }))
}

function getSafeRadius(radii: number[], step: number): number {
  if (radii.length < 2) return 0
  const denom = 2 * Math.sin(step / 2)
  if (!denom) return 0
  return Math.max(...radii.map((r, i) => (r + radii[(i+1) % radii.length] + TWIG_GAP) / denom))
}

// Debug SVG helpers
function createSvg(w: number, h: number): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', `${w}`); svg.setAttribute('height', `${h}`)
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100'
  return svg
}

function createEllipse(cx: number, cy: number, rx: number, ry: number): SVGEllipseElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
  el.setAttribute('cx', `${cx}`); el.setAttribute('cy', `${cy}`); el.setAttribute('rx', `${rx}`); el.setAttribute('ry', `${ry}`)
  el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'red'); el.setAttribute('stroke-width', '2')
  el.setAttribute('stroke-dasharray', '8 4'); el.setAttribute('opacity', '0.7')
  return el
}

function createSvgLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', `${x1}`); line.setAttribute('y1', `${y1}`); line.setAttribute('x2', `${x2}`); line.setAttribute('y2', `${y2}`)
  line.setAttribute('stroke', 'red'); line.setAttribute('stroke-width', '1.5'); line.setAttribute('opacity', '0.6')
  return line
}
