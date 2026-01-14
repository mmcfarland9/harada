import type { LeafViewApi, Sprout, Leaf, SproutSeason, SproutEnvironment } from '../types'
import {
  nodeState,
  getLeafById,
  getSproutsByLeaf,
  getActiveSprouts,
  graftSprout,
  calculateSoilCost,
  getSoilAvailable,
  canAffordSoil,
  spendSoil,
  getDebugNow,
} from '../state'

export type LeafViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
}

const SEASONS: SproutSeason[] = ['1w', '2w', '1m', '3m', '6m', '1y']
const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

// Unified log entry types
type LogEntryType = 'sprout-start' | 'watering' | 'completion' | 'graft-origin'

type LogEntry = {
  type: LogEntryType
  timestamp: string
  sproutId: string
  sproutTitle: string
  data: {
    season?: SproutSeason
    environment?: SproutEnvironment
    content?: string
    prompt?: string
    result?: number
    reflection?: string
    isSuccess?: boolean
    graftedFromTitle?: string
  }
}

function getSeasonLabel(season: SproutSeason): string {
  const labels: Record<SproutSeason, string> = {
    '1w': '1 week',
    '2w': '2 weeks',
    '1m': '1 month',
    '3m': '3 months',
    '6m': '6 months',
    '1y': '1 year',
  }
  return labels[season]
}

function getEnvironmentLabel(env: SproutEnvironment): string {
  const labels: Record<SproutEnvironment, string> = {
    fertile: 'Fertile',
    firm: 'Firm',
    barren: 'Barren',
  }
  return labels[env]
}

function getResultEmoji(result: number): string {
  const emojis: Record<number, string> = {
    1: '🥀',
    2: '🌱',
    3: '🌿',
    4: '🌳',
    5: '🌲',
  }
  return emojis[result] || '🌱'
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = getDebugNow()
  const diff = now - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getEndDate(season: SproutSeason, startDate: Date = new Date()): Date {
  const end = new Date(startDate)
  switch (season) {
    case '1w': end.setDate(end.getDate() + 7); break
    case '2w': end.setDate(end.getDate() + 14); break
    case '1m': end.setMonth(end.getMonth() + 1); break
    case '3m': end.setMonth(end.getMonth() + 3); break
    case '6m': end.setMonth(end.getMonth() + 6); break
    case '1y': end.setFullYear(end.getFullYear() + 1); break
  }
  end.setUTCHours(15, 0, 0, 0)
  return end
}

export function buildLeafView(mapPanel: HTMLElement, callbacks: LeafViewCallbacks): LeafViewApi {
  const container = document.createElement('div')
  container.className = 'leaf-view'

  container.innerHTML = `
    <div class="leaf-view-header">
      <button type="button" class="leaf-back-btn">< back</button>
      <div class="leaf-title-section">
        <h2 class="leaf-title"></h2>
        <p class="leaf-meta"></p>
      </div>
    </div>
    <div class="leaf-view-body">
      <div class="leaf-log"></div>
    </div>
  `

  mapPanel.append(container)

  // Element references
  const backBtn = container.querySelector<HTMLButtonElement>('.leaf-back-btn')!
  const titleEl = container.querySelector<HTMLHeadingElement>('.leaf-title')!
  const metaEl = container.querySelector<HTMLParagraphElement>('.leaf-meta')!
  const logEl = container.querySelector<HTMLDivElement>('.leaf-log')!

  // State
  let currentTwigId: string | null = null
  let currentLeafId: string | null = null
  let graftFromSproutId: string | null = null
  let selectedSeason: SproutSeason | null = null
  let selectedEnvironment: SproutEnvironment | null = null

  function getLeaf(): Leaf | undefined {
    if (!currentTwigId || !currentLeafId) return undefined
    return getLeafById(currentTwigId, currentLeafId)
  }

  function getSprouts(): Sprout[] {
    if (!currentTwigId || !currentLeafId) return []
    const data = nodeState[currentTwigId]
    if (!data?.sprouts) return []
    return getSproutsByLeaf(data.sprouts, currentLeafId)
  }

  // Build unified log from all sprouts and their events
  function buildUnifiedLog(sprouts: Sprout[]): LogEntry[] {
    const entries: LogEntry[] = []

    for (const sprout of sprouts) {
      // Sprout start event
      entries.push({
        type: 'sprout-start',
        timestamp: sprout.activatedAt || sprout.createdAt,
        sproutId: sprout.id,
        sproutTitle: sprout.title,
        data: {
          season: sprout.season,
          environment: sprout.environment,
        }
      })

      // If grafted, note where it came from
      if (sprout.graftedFromId) {
        const parent = sprouts.find(s => s.id === sprout.graftedFromId)
        entries.push({
          type: 'graft-origin',
          timestamp: sprout.createdAt,
          sproutId: sprout.id,
          sproutTitle: sprout.title,
          data: {
            graftedFromTitle: parent?.title || 'previous sprout'
          }
        })
      }

      // Watering entries
      for (const water of sprout.waterEntries || []) {
        entries.push({
          type: 'watering',
          timestamp: water.timestamp,
          sproutId: sprout.id,
          sproutTitle: sprout.title,
          data: {
            content: water.content,
            prompt: water.prompt,
          }
        })
      }

      // Completion event
      if (sprout.completedAt) {
        entries.push({
          type: 'completion',
          timestamp: sprout.completedAt,
          sproutId: sprout.id,
          sproutTitle: sprout.title,
          data: {
            result: sprout.result,
            reflection: sprout.reflection,
            isSuccess: sprout.state === 'completed',
          }
        })
      }
    }

    // Sort by timestamp descending (most recent first)
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  function renderLogEntry(entry: LogEntry, sprouts: Sprout[]): string {
    const timeStr = formatDateTime(entry.timestamp)

    switch (entry.type) {
      case 'sprout-start':
        return `
          <div class="log-entry log-entry-start" data-sprout-id="${entry.sproutId}">
            <div class="log-entry-header">
              <span class="log-entry-type">Planted</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            <p class="log-entry-title">${entry.sproutTitle}</p>
            <p class="log-entry-meta">${getSeasonLabel(entry.data.season!)} · ${getEnvironmentLabel(entry.data.environment!)}</p>
          </div>
        `

      case 'watering':
        return `
          <div class="log-entry log-entry-water" data-sprout-id="${entry.sproutId}">
            <div class="log-entry-header">
              <span class="log-entry-type">Watered</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            ${entry.data.prompt ? `<p class="log-entry-prompt">${entry.data.prompt}</p>` : ''}
            <p class="log-entry-content">${entry.data.content}</p>
          </div>
        `

      case 'completion': {
        const sprout = sprouts.find(s => s.id === entry.sproutId)
        const isCompleted = entry.data.isSuccess
        const emoji = getResultEmoji(entry.data.result || 1)

        return `
          <div class="log-entry log-entry-completion ${isCompleted ? 'is-success' : 'is-failed'}" data-sprout-id="${entry.sproutId}">
            <div class="log-entry-header">
              <span class="log-entry-type">${isCompleted ? 'Harvested' : 'Pruned'}</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            <p class="log-entry-title">${entry.sproutTitle}</p>
            <p class="log-entry-result">${emoji} ${entry.data.result}/5</p>
            ${entry.data.reflection ? `<p class="log-entry-reflection">"${entry.data.reflection}"</p>` : ''}
            ${isCompleted && sprout ? `<button type="button" class="log-graft-btn" data-sprout-id="${entry.sproutId}">Graft</button>` : ''}
          </div>
        `
      }

      case 'graft-origin':
        return `
          <div class="log-entry log-entry-graft" data-sprout-id="${entry.sproutId}">
            <div class="log-entry-header">
              <span class="log-entry-type">Grafted</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            <p class="log-entry-meta">Continued from: ${entry.data.graftedFromTitle}</p>
          </div>
        `

      default:
        return ''
    }
  }

  function renderGraftForm(): string {
    return `
      <div class="log-graft-form hidden">
        <input type="text" class="graft-title-input" placeholder="Continue the journey..." maxlength="60" />
        <div class="graft-selectors">
          <div class="graft-season-selector">
            ${SEASONS.map(s => `<button type="button" class="graft-season-btn" data-season="${s}">${s}</button>`).join('')}
          </div>
          <div class="graft-env-selector">
            ${ENVIRONMENTS.map(e => `<button type="button" class="graft-env-btn" data-env="${e}">${getEnvironmentLabel(e)}</button>`).join('')}
          </div>
        </div>
        <div class="graft-footer">
          <span class="graft-soil-cost"></span>
          <div class="graft-actions">
            <button type="button" class="graft-cancel-btn">Cancel</button>
            <button type="button" class="graft-confirm-btn" disabled>Graft</button>
          </div>
        </div>
      </div>
    `
  }

  function render(): void {
    const leaf = getLeaf()
    if (!leaf) return

    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const logEntries = buildUnifiedLog(sprouts)

    // Get title from the most recent sprout (the "top layer")
    const sortedSprouts = [...sprouts].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const topSprout = sortedSprouts[0]
    titleEl.textContent = topSprout?.title || 'Untitled'
    metaEl.textContent = `${logEntries.length} entries · ${active.length} growing`

    if (logEntries.length === 0) {
      logEl.innerHTML = '<p class="log-empty">No activity yet.</p>'
      return
    }

    // Render all log entries + graft form at the top
    logEl.innerHTML = renderGraftForm() + logEntries.map(e => renderLogEntry(e, sprouts)).join('')

    wireLogEvents()
  }

  function wireLogEvents(): void {
    const graftForm = logEl.querySelector<HTMLDivElement>('.log-graft-form')!
    const graftTitleInput = logEl.querySelector<HTMLInputElement>('.graft-title-input')!
    const graftSeasonBtns = logEl.querySelectorAll<HTMLButtonElement>('.graft-season-btn')
    const graftEnvBtns = logEl.querySelectorAll<HTMLButtonElement>('.graft-env-btn')
    const graftSoilCost = logEl.querySelector<HTMLSpanElement>('.graft-soil-cost')!
    const graftCancelBtn = logEl.querySelector<HTMLButtonElement>('.graft-cancel-btn')!
    const graftConfirmBtn = logEl.querySelector<HTMLButtonElement>('.graft-confirm-btn')!

    function updateGraftFormState(): void {
      const title = graftTitleInput.value.trim()
      const hasAllFields = title && selectedSeason && selectedEnvironment

      if (selectedSeason && selectedEnvironment) {
        const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
        const available = getSoilAvailable()
        const canAfford = canAffordSoil(cost)
        graftSoilCost.textContent = `${cost} soil (${available} avail)`
        graftSoilCost.classList.toggle('is-warning', !canAfford)
        graftConfirmBtn.disabled = !hasAllFields || !canAfford
      } else {
        graftSoilCost.textContent = ''
        graftConfirmBtn.disabled = true
      }
    }

    function hideGraftForm(): void {
      graftForm.classList.add('hidden')
      graftTitleInput.value = ''
      selectedSeason = null
      selectedEnvironment = null
      graftFromSproutId = null
      graftSeasonBtns.forEach(btn => btn.classList.remove('is-selected'))
      graftEnvBtns.forEach(btn => btn.classList.remove('is-selected'))
    }

    function doGraft(): void {
      if (!currentTwigId || !graftFromSproutId || !selectedSeason || !selectedEnvironment) return

      const title = graftTitleInput.value.trim()
      if (!title) return

      const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
      if (!canAffordSoil(cost)) return

      spendSoil(cost)
      callbacks.onSoilChange?.()

      const endDate = getEndDate(selectedSeason)
      const now = new Date().toISOString()

      graftSprout(currentTwigId, graftFromSproutId, {
        title,
        season: selectedSeason,
        environment: selectedEnvironment,
        state: 'active',
        soilCost: cost,
        activatedAt: now,
        endDate: endDate.toISOString(),
      })

      hideGraftForm()
      render()
      callbacks.onSave()
    }

    // Graft button clicks (on completion entries)
    logEl.querySelectorAll<HTMLButtonElement>('.log-graft-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sproutId = btn.dataset.sproutId
        if (sproutId) {
          graftFromSproutId = sproutId
          graftForm.classList.remove('hidden')
          graftTitleInput.focus()
          updateGraftFormState()
        }
      })
    })

    graftTitleInput.addEventListener('input', updateGraftFormState)

    graftSeasonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        graftSeasonBtns.forEach(b => b.classList.remove('is-selected'))
        btn.classList.add('is-selected')
        selectedSeason = btn.dataset.season as SproutSeason
        updateGraftFormState()
      })
    })

    graftEnvBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        graftEnvBtns.forEach(b => b.classList.remove('is-selected'))
        btn.classList.add('is-selected')
        selectedEnvironment = btn.dataset.env as SproutEnvironment
        updateGraftFormState()
      })
    })

    graftCancelBtn.addEventListener('click', hideGraftForm)
    graftConfirmBtn.addEventListener('click', doGraft)
  }

  // Event handlers
  backBtn.addEventListener('click', () => {
    callbacks.onClose()
  })

  function isOpen(): boolean {
    return container.classList.contains('is-open')
  }

  // Keyboard navigation - on document to ensure we catch Escape regardless of focus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault()
      e.stopImmediatePropagation()
      const graftForm = logEl.querySelector<HTMLDivElement>('.log-graft-form')
      if (graftForm && !graftForm.classList.contains('hidden')) {
        graftForm.classList.add('hidden')
      } else {
        callbacks.onClose()
      }
    }
  })

  return {
    container,
    open(leafId: string, twigId: string, _branchIndex: number) {
      currentLeafId = leafId
      currentTwigId = twigId
      graftFromSproutId = null
      selectedSeason = null
      selectedEnvironment = null
      render()
      container.classList.add('is-open')
    },
    close() {
      container.classList.remove('is-open')
      currentLeafId = null
      currentTwigId = null
    },
    isOpen,
  }
}
