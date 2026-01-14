import type { TwigViewApi, Sprout, SproutSeason, SproutEnvironment } from '../types'
import {
  nodeState,
  saveState,
  generateSproutId,
  getActiveSprouts,
  getHistorySprouts,
  getDebugNow,
  calculateSoilCost,
  getCapacityReward,
  getSoilAvailable,
  canAffordSoil,
  spendSoil,
  recoverSoil,
  recoverPartialSoil,
  getTwigLeaves,
  getSproutsByLeaf,
  getUnassignedSprouts,
  createLeaf,
} from '../state'

export type TwigViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
  onOpenLeaf?: (leafId: string, twigId: string, branchIndex: number) => void
}

const SEASONS: SproutSeason[] = ['1w', '2w', '1m', '3m', '6m', '1y']
const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

function getEnvironmentLabel(env: SproutEnvironment): string {
  const labels: Record<SproutEnvironment, string> = {
    fertile: 'Fertile',
    firm: 'Firm',
    barren: 'Barren',
  }
  return labels[env]
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

// Result emoji scale: 1=withered, 2=sprout, 3=sapling, 4=tree, 5=oak
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
  // Set to 9am CST (UTC-6 = 15:00 UTC)
  end.setUTCHours(15, 0, 0, 0)
  return end
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isReady(sprout: Sprout): boolean {
  if (!sprout.endDate) return true
  return new Date(sprout.endDate).getTime() <= getDebugNow()
}

function getGrowthProgress(sprout: Sprout): number {
  if (!sprout.activatedAt || !sprout.endDate) return 100
  const start = new Date(sprout.activatedAt).getTime()
  const end = new Date(sprout.endDate).getTime()
  const now = getDebugNow()
  if (now >= end) return 100
  if (now <= start) return 0
  return Math.round(((now - start) / (end - start)) * 100)
}

function getDaysRemaining(sprout: Sprout): number {
  if (!sprout.endDate) return 0
  const end = new Date(sprout.endDate).getTime()
  const now = getDebugNow()
  const diff = end - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function buildTwigView(mapPanel: HTMLElement, callbacks: TwigViewCallbacks): TwigViewApi {
  const container = document.createElement('div')
  container.className = 'twig-view hidden'

  container.innerHTML = `
    <div class="twig-view-header">
      <div class="twig-title-section">
        <input type="text" class="twig-title-input" readonly tabindex="-1" />
        <textarea class="twig-note-input" readonly tabindex="-1" rows="1"></textarea>
      </div>
    </div>
    <div class="twig-view-body">
      <div class="sprout-column sprout-drafts">
        <h3 class="column-title">New</h3>
        <div class="sprout-draft-form">
          <input type="text" class="sprout-title-input" placeholder="Describe this sprout." maxlength="60" />
          <label class="sprout-field-label">Season</label>
          <div class="sprout-season-selector">
            ${SEASONS.map(s => `<button type="button" class="sprout-season-btn" data-season="${s}">${s}</button>`).join('')}
          </div>
          <div class="sprout-end-date"></div>
          <label class="sprout-field-label">Environment</label>
          <div class="sprout-environment-selector">
            ${ENVIRONMENTS.map(e => `<button type="button" class="sprout-env-btn" data-env="${e}">${getEnvironmentLabel(e)}</button>`).join('')}
          </div>
          <div class="env-hint-area">
            <span class="env-hint" data-for="fertile">[gentle · no capacity reward]</span>
            <span class="env-hint" data-for="firm">[steady · +1 max capacity]</span>
            <span class="env-hint" data-for="barren">[bold · +2 max capacity]</span>
          </div>
          <div class="sprout-soil-cost"></div>
          <button type="button" class="sprout-set-btn" disabled></button>
        </div>
        <div class="twig-nav-row">
          <button type="button" class="twig-back-btn">< back to branch</button>
          <div class="twig-nav-arrows">
            <button type="button" class="twig-prev-btn" title="Previous twig">prev</button>
            <button type="button" class="twig-next-btn" title="Next twig">next</button>
          </div>
        </div>
      </div>
      <div class="sprout-column sprout-active">
        <h3 class="column-title">Growing <span class="active-count">(0)</span></h3>
        <div class="active-sprouts-list"></div>
      </div>
      <div class="sprout-column sprout-history">
        <h3 class="column-title">Cultivated <span class="cultivated-count">(0)</span></h3>
        <div class="history-sprouts-list"></div>
      </div>
    </div>
    <div class="confirm-dialog hidden">
      <div class="confirm-dialog-box">
        <p class="confirm-dialog-message"></p>
        <div class="confirm-dialog-actions">
          <button type="button" class="confirm-dialog-cancel">Cancel</button>
          <button type="button" class="confirm-dialog-confirm">Uproot</button>
        </div>
      </div>
    </div>
  `

  mapPanel.append(container)

  // Element references
  const backBtn = container.querySelector<HTMLButtonElement>('.twig-back-btn')!
  const titleInput = container.querySelector<HTMLInputElement>('.twig-title-input')!
  const noteInput = container.querySelector<HTMLTextAreaElement>('.twig-note-input')!
  const sproutTitleInput = container.querySelector<HTMLInputElement>('.sprout-title-input')!
  const seasonBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-season-btn')
  const endDateDisplay = container.querySelector<HTMLDivElement>('.sprout-end-date')!
  const envBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-env-btn')
  const envHints = container.querySelectorAll<HTMLSpanElement>('.env-hint')
  const soilCostDisplay = container.querySelector<HTMLDivElement>('.sprout-soil-cost')!
  const setBtn = container.querySelector<HTMLButtonElement>('.sprout-set-btn')!
  const activeCount = container.querySelector<HTMLSpanElement>('.active-count')!
  const cultivatedCount = container.querySelector<HTMLSpanElement>('.cultivated-count')!
  const activeList = container.querySelector<HTMLDivElement>('.active-sprouts-list')!
  const historyList = container.querySelector<HTMLDivElement>('.history-sprouts-list')!
  const confirmDialog = container.querySelector<HTMLDivElement>('.confirm-dialog')!
  const confirmMessage = container.querySelector<HTMLParagraphElement>('.confirm-dialog-message')!
  const confirmCancelBtn = container.querySelector<HTMLButtonElement>('.confirm-dialog-cancel')!
  const confirmConfirmBtn = container.querySelector<HTMLButtonElement>('.confirm-dialog-confirm')!
  const prevBtn = container.querySelector<HTMLButtonElement>('.twig-prev-btn')!
  const nextBtn = container.querySelector<HTMLButtonElement>('.twig-next-btn')!

  // Form state
  let selectedSeason: SproutSeason | null = null
  let selectedEnvironment: SproutEnvironment | null = null
  let currentTwigNode: HTMLButtonElement | null = null
  let confirmResolve: ((value: boolean) => void) | null = null

  function showConfirm(message: string): Promise<boolean> {
    confirmMessage.textContent = message
    confirmDialog.classList.remove('hidden')
    confirmConfirmBtn.focus()
    return new Promise((resolve) => {
      confirmResolve = resolve
    })
  }

  function hideConfirm(result: boolean): void {
    confirmDialog.classList.add('hidden')
    if (confirmResolve) {
      confirmResolve(result)
      confirmResolve = null
    }
  }

  confirmCancelBtn.addEventListener('click', () => hideConfirm(false))
  confirmConfirmBtn.addEventListener('click', () => hideConfirm(true))

  function getCurrentNodeId(): string | null {
    return currentTwigNode?.dataset.nodeId || null
  }

  function getSprouts(): Sprout[] {
    const nodeId = getCurrentNodeId()
    if (!nodeId) return []
    return nodeState[nodeId]?.sprouts || []
  }

  function setSprouts(sprouts: Sprout[]): void {
    const nodeId = getCurrentNodeId()
    if (!nodeId) return
    if (!nodeState[nodeId]) {
      nodeState[nodeId] = { label: '', note: '' }
    }
    nodeState[nodeId].sprouts = sprouts.length > 0 ? sprouts : undefined
    saveState(callbacks.onSave)
  }

  function updateFormState(): void {
    const hasTitle = sproutTitleInput.value.trim().length > 0
    const hasSeason = selectedSeason !== null
    const hasEnv = selectedEnvironment !== null

    // Calculate and display soil cost
    if (hasSeason && hasEnv) {
      const cost = calculateSoilCost(selectedSeason!, selectedEnvironment!)
      const available = getSoilAvailable()
      const canAfford = canAffordSoil(cost)
      soilCostDisplay.textContent = `Cost: ${cost} soil (${available} available)`
      soilCostDisplay.classList.toggle('insufficient', !canAfford)
    } else {
      soilCostDisplay.textContent = ''
      soilCostDisplay.classList.remove('insufficient')
    }

    // Check if form is ready and affordable
    const isFormComplete = hasTitle && hasSeason && hasEnv
    const cost = hasSeason && hasEnv ? calculateSoilCost(selectedSeason!, selectedEnvironment!) : 0
    const isAffordable = canAffordSoil(cost)
    setBtn.disabled = !isFormComplete || !isAffordable

    // Update button text
    if (hasTitle && hasSeason && hasEnv) {
      if (!isAffordable) {
        setBtn.textContent = 'Not enough soil'
      } else {
        setBtn.textContent = 'Plant'
      }
    } else {
      setBtn.textContent = 'n/a'
    }
  }

  function renderHistoryCard(s: Sprout): string {
    const hasLeaf = !!s.leafId

    return `
      <div class="sprout-card sprout-history-card ${s.state === 'failed' ? 'is-failed' : 'is-completed'} ${hasLeaf ? 'is-clickable' : ''}" data-id="${s.id}" ${hasLeaf ? `data-leaf-id="${s.leafId}"` : ''}>
        <div class="sprout-card-header">
          <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
          <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${s.title}</p>
        <div class="sprout-result-section">
          <span class="sprout-result-display">${getResultEmoji(s.result || 1)} ${s.result || 1}/5</span>
          <span class="sprout-card-date">${s.completedAt ? formatDate(new Date(s.completedAt)) : ''}</span>
        </div>
        ${s.reflection ? `<p class="sprout-card-reflection">${s.reflection}</p>` : ''}
      </div>
    `
  }

  function renderSprouts(): void {
    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const history = getHistorySprouts(sprouts)

    activeCount.textContent = `(${active.length})`
    cultivatedCount.textContent = `(${history.length})`

    // Render active
    activeList.innerHTML = active.map(s => {
      const ready = isReady(s)
      const progress = getGrowthProgress(s)
      const daysLeft = getDaysRemaining(s)
      const hasLeaf = !!s.leafId

      return `
      <div class="sprout-card sprout-active-card ${ready ? 'is-ready' : 'is-growing'} ${hasLeaf ? 'is-clickable' : ''}" data-id="${s.id}" ${hasLeaf ? `data-leaf-id="${s.leafId}"` : ''}>
        <div class="sprout-card-header">
          <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
          <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${s.title}</p>

        ${ready ? `
          <p class="sprout-card-status">Ready to harvest</p>
          <div class="sprout-complete-section">
            <div class="sprout-result-slider">
              <input type="range" min="1" max="5" value="1" class="result-slider" />
              <span class="result-value">${getResultEmoji(1)}</span>
            </div>
            <textarea class="sprout-reflection-input" placeholder="Recap (optional)..." rows="2"></textarea>
            <button type="button" class="sprout-complete-btn">Harvest</button>
          </div>
        ` : `
          <div class="sprout-growing-section">
            <div class="sprout-growth-visual">
              <div class="growth-animation">
                <span class="growth-icon">🌱</span>
              </div>
              <div class="growth-progress-bar">
                <div class="growth-progress-fill" style="width: ${progress}%"></div>
              </div>
            </div>
            <p class="sprout-days-remaining">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
          </div>
        `}
      </div>
    `}).join('') || '<p class="empty-message">No growing sprouts</p>'

    // Render history - grouped by leaf
    const nodeId = getCurrentNodeId()
    const leaves = nodeId ? getTwigLeaves(nodeId) : []
    const unassigned = getUnassignedSprouts(history)

    let historyHtml = ''

    // Render each leaf's history
    leaves.forEach(leaf => {
      const leafHistory = getSproutsByLeaf(history, leaf.id)
      if (leafHistory.length === 0) return

      // Sort by date to get the most recent sprout (top layer) for the title
      const sortedHistory = [...leafHistory].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const topSprout = sortedHistory[0]

      historyHtml += `
        <div class="leaf-group" data-leaf-id="${leaf.id}">
          <button type="button" class="leaf-group-header">
            <span class="leaf-group-title">${topSprout.title}</span>
            <span class="leaf-group-count">${leafHistory.length}</span>
            <span class="leaf-group-arrow">></span>
          </button>
          <div class="leaf-group-sprouts">
            ${leafHistory.map(s => renderHistoryCard(s)).join('')}
          </div>
        </div>
      `
    })

    // Render unassigned sprouts
    if (unassigned.length > 0) {
      historyHtml += unassigned.map(s => renderHistoryCard(s)).join('')
    }

    historyList.innerHTML = historyHtml || '<p class="empty-message">No history</p>'

    // Wire up event listeners for cards
    wireCardEvents()
  }

  function wireCardEvents(): void {
    // Delete buttons
    container.querySelectorAll<HTMLButtonElement>('.sprout-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const card = btn.closest('.sprout-card') as HTMLElement
        const id = card?.dataset.id
        if (!id) return

        // Find sprout to calculate soil return
        const sprouts = getSprouts()
        const sprout = sprouts.find(s => s.id === id)
        const soilReturn = sprout?.state === 'active' ? Math.floor(sprout.soilCost * 0.25) : 0
        const soilMsg = soilReturn > 0 ? ` (+${soilReturn} soil returned)` : ''
        const confirmed = await showConfirm(`Are you sure you want to uproot this sprout?${soilMsg}`)
        if (!confirmed) return

        if (sprout && sprout.state === 'active') {
          // Uproot returns 25% of soil cost
          recoverPartialSoil(sprout.soilCost, 0.25)
          callbacks.onSoilChange?.()
        }

        const remaining = sprouts.filter(s => s.id !== id)
        setSprouts(remaining)
        renderSprouts()
      })
    })

    // Complete buttons and result controls
    container.querySelectorAll<HTMLDivElement>('.sprout-active-card').forEach(card => {
      const id = card.dataset.id
      if (!id) return

      const completeBtn = card.querySelector<HTMLButtonElement>('.sprout-complete-btn')
      const reflectionInput = card.querySelector<HTMLTextAreaElement>('.sprout-reflection-input')
      const resultBtns = card.querySelectorAll<HTMLButtonElement>('.result-btn')
      const slider = card.querySelector<HTMLInputElement>('.result-slider')
      const valueDisplay = card.querySelector<HTMLSpanElement>('.result-value')

      let result = 0
      let hasSelected = false

      // Start disabled
      if (completeBtn) completeBtn.disabled = true

      resultBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          result = parseInt(btn.dataset.result || '0', 10)
          hasSelected = true
          resultBtns.forEach(b => b.classList.toggle('is-active', b === btn))
          if (completeBtn) completeBtn.disabled = false
        })
      })

      if (slider && valueDisplay) {
        slider.addEventListener('input', () => {
          result = parseInt(slider.value, 10)
          hasSelected = true
          valueDisplay.textContent = getResultEmoji(result)
          if (completeBtn) completeBtn.disabled = false
        })
      }

      completeBtn?.addEventListener('click', () => {
        if (!hasSelected) return
        const sprouts = getSprouts()
        const sprout = sprouts.find(s => s.id === id)
        if (!sprout) return

        // 1-2 = failed, 3-5 = success
        const isSuccess = result >= 3
        sprout.state = isSuccess ? 'completed' : 'failed'
        sprout.result = result
        sprout.reflection = reflectionInput?.value.trim() || undefined
        sprout.completedAt = new Date().toISOString()

        // Auto-create a leaf for this sprout if it doesn't have one
        // (creates a saga/trajectory starting with this sprout)
        const nodeId = getCurrentNodeId()
        if (nodeId && !sprout.leafId) {
          const newLeaf = createLeaf(nodeId)
          sprout.leafId = newLeaf.id
        }

        // Recover soil based on outcome
        if (isSuccess) {
          // Capacity bonus scales with result: 3=0.1, 4=0.5, 5=1.0
          // Plus environment bonus
          const resultBonus = result === 5 ? 1.0 : result === 4 ? 0.5 : 0.1
          const envBonus = getCapacityReward(sprout.environment)
          recoverSoil(sprout.soilCost, resultBonus + envBonus)
        } else {
          // Failed sprouts get full soil back
          recoverSoil(sprout.soilCost)
        }

        setSprouts(sprouts)
        renderSprouts()
        callbacks.onSoilChange?.()
      })
    })

    // Leaf group headers - click to open leaf view
    container.querySelectorAll<HTMLButtonElement>('.leaf-group-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const leafGroup = btn.closest('.leaf-group') as HTMLElement
        const leafId = leafGroup?.dataset.leafId
        const nodeId = getCurrentNodeId()
        const branchIndex = currentTwigNode?.dataset.branchIndex
        if (leafId && nodeId && branchIndex !== undefined && callbacks.onOpenLeaf) {
          close()
          callbacks.onOpenLeaf(leafId, nodeId, parseInt(branchIndex, 10))
        }
      })
    })

    // Clickable cards - click to open leaf view
    container.querySelectorAll<HTMLDivElement>('.sprout-card.is-clickable').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on interactive elements
        const target = e.target as HTMLElement
        if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
          return
        }
        const leafId = card.dataset.leafId
        const nodeId = getCurrentNodeId()
        const branchIndex = currentTwigNode?.dataset.branchIndex
        if (leafId && nodeId && branchIndex !== undefined && callbacks.onOpenLeaf) {
          close()
          callbacks.onOpenLeaf(leafId, nodeId, parseInt(branchIndex, 10))
        }
      })
    })
  }

  function resetForm(): void {
    selectedSeason = null
    selectedEnvironment = null
    sproutTitleInput.value = ''
    seasonBtns.forEach(btn => btn.classList.remove('is-active'))
    envBtns.forEach(btn => btn.classList.remove('is-active'))
    envHints.forEach(h => h.classList.remove('is-visible'))
    endDateDisplay.textContent = ''
    soilCostDisplay.textContent = ''
    updateFormState()
  }

  // Season selector
  seasonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season as SproutSeason
      selectedSeason = selectedSeason === season ? null : season
      seasonBtns.forEach(b => b.classList.toggle('is-active', b.dataset.season === selectedSeason))
      // Update end date display
      if (selectedSeason) {
        const endDate = getEndDate(selectedSeason)
        endDateDisplay.textContent = `Ends on ${formatDate(endDate)}`
      } else {
        endDateDisplay.textContent = ''
      }
      updateFormState()
    })
  })

  // Environment selector
  envBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const env = btn.dataset.env as SproutEnvironment
      selectedEnvironment = selectedEnvironment === env ? null : env
      envBtns.forEach(b => b.classList.toggle('is-active', b.dataset.env === selectedEnvironment))
      envHints.forEach(h => h.classList.toggle('is-visible', h.dataset.for === selectedEnvironment))
      updateFormState()
    })
  })

  // Sprout title input
  sproutTitleInput.addEventListener('input', updateFormState)

  // Set button - create sprout
  setBtn.addEventListener('click', () => {
    if (!selectedSeason || !selectedEnvironment) return
    const title = sproutTitleInput.value.trim()
    if (!title) return

    const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
    if (!spendSoil(cost)) return

    const nodeId = getCurrentNodeId()
    if (!nodeId) return

    // Create leaf immediately so sprout is clickable from the start
    const leaf = createLeaf(nodeId)

    const now = new Date()
    const newSprout: Sprout = {
      id: generateSproutId(),
      title,
      season: selectedSeason,
      environment: selectedEnvironment,
      state: 'active',
      soilCost: cost,
      createdAt: now.toISOString(),
      activatedAt: now.toISOString(),
      endDate: getEndDate(selectedSeason, now).toISOString(),
      leafId: leaf.id,
    }

    const sprouts = getSprouts()
    sprouts.push(newSprout)
    setSprouts(sprouts)
    resetForm()
    renderSprouts()
    callbacks.onSoilChange?.()
  })

  // Back button
  backBtn.addEventListener('click', () => {
    close()
    callbacks.onClose()
  })

  // Navigation buttons
  prevBtn.addEventListener('click', () => {
    if (!callbacks.onNavigate) return
    const prevTwig = callbacks.onNavigate('prev')
    if (prevTwig) open(prevTwig)
  })

  nextBtn.addEventListener('click', () => {
    if (!callbacks.onNavigate) return
    const nextTwig = callbacks.onNavigate('next')
    if (nextTwig) open(nextTwig)
  })

  // Keyboard handler
  function handleKeydown(e: KeyboardEvent): void {
    if (container.classList.contains('hidden')) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      callbacks.onClose()
      return
    }

    if (e.key === 'ArrowLeft' && callbacks.onNavigate) {
      e.preventDefault()
      const prevTwig = callbacks.onNavigate('prev')
      if (prevTwig) open(prevTwig)
      return
    }

    if (e.key === 'ArrowRight' && callbacks.onNavigate) {
      e.preventDefault()
      const nextTwig = callbacks.onNavigate('next')
      if (nextTwig) open(nextTwig)
      return
    }
  }
  document.addEventListener('keydown', handleKeydown)

  function open(twigNode: HTMLButtonElement): void {
    currentTwigNode = twigNode
    const nodeId = twigNode.dataset.nodeId
    if (!nodeId) return

    const data = nodeState[nodeId]
    const defaultLabel = twigNode.dataset.defaultLabel || ''
    const label = data?.label?.trim() || defaultLabel

    titleInput.value = label
    noteInput.value = data?.note || ''

    resetForm()
    renderSprouts()
    container.classList.remove('hidden')
  }

  function close(): void {
    container.classList.add('hidden')
    currentTwigNode = null
  }

  function isOpen(): boolean {
    return !container.classList.contains('hidden')
  }

  return {
    container,
    open,
    close,
    isOpen,
  }
}
