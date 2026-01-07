import type { TwigViewApi, Sprout, SproutSeason, SproutType } from '../types'
import {
  nodeState,
  saveState,
  generateSproutId,
  getActiveSprouts,
  getHistorySprouts,
} from '../state'

export type TwigViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
}

const SEASONS: SproutSeason[] = ['1w', '2w', '1m', '3m', '6m', '1y']

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

function isOverdue(sprout: Sprout): boolean {
  if (!sprout.endDate) return false
  return new Date(sprout.endDate) < new Date()
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
          <label class="sprout-field-label">Type</label>
          <div class="sprout-type-toggle">
            <button type="button" class="sprout-type-btn" data-type="seed">Seed</button>
            <button type="button" class="sprout-type-btn" data-type="sapling">Sapling</button>
          </div>
          <div class="type-hint-area">
            <span class="type-hint" data-for="seed">[binary outcome]</span>
            <span class="type-hint" data-for="sapling">[continuous practice]</span>
          </div>
          <input type="text" class="sprout-title-input" placeholder="Describe this sprout." maxlength="60" />
          <label class="sprout-field-label">Season</label>
          <div class="sprout-season-selector">
            ${SEASONS.map(s => `<button type="button" class="sprout-season-btn" data-season="${s}">${s}</button>`).join('')}
          </div>
          <div class="sprout-end-date"></div>
          <label class="sprout-field-label">Water</label>
          <textarea class="sprout-water-input" placeholder="How can you check in on this Sprout's growth?" rows="1" maxlength="200"></textarea>
          <label class="sprout-field-label">Environment</label>
          <textarea class="sprout-environment-input" placeholder="What does growth look like for this Sprout?" rows="1" maxlength="200"></textarea>
          <label class="sprout-field-label">Soil</label>
          <textarea class="sprout-soil-input" placeholder="What can you do to ensure this Sprout will grow?" rows="1" maxlength="200"></textarea>
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
        <h3 class="column-title">Active <span class="active-count">(0)</span></h3>
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
  const typeBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-type-btn')
  const typeHints = container.querySelectorAll<HTMLSpanElement>('.type-hint')
  const sproutTitleInput = container.querySelector<HTMLInputElement>('.sprout-title-input')!
  const waterInput = container.querySelector<HTMLTextAreaElement>('.sprout-water-input')!
  const environmentInput = container.querySelector<HTMLTextAreaElement>('.sprout-environment-input')!
  const soilInput = container.querySelector<HTMLTextAreaElement>('.sprout-soil-input')!
  const seasonBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-season-btn')
  const endDateDisplay = container.querySelector<HTMLDivElement>('.sprout-end-date')!
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
  let selectedType: SproutType | null = null
  let selectedSeason: SproutSeason | null = null
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
    const hasType = selectedType !== null
    const hasTitle = sproutTitleInput.value.trim().length > 0
    const hasSeason = selectedSeason !== null
    const isReady = hasType && hasTitle && hasSeason
    setBtn.disabled = !isReady
    // Update button text - show n/a until type and title are set
    if (hasType && hasTitle) {
      setBtn.textContent = selectedType === 'seed' ? 'Sow' : 'Plant'
    } else {
      setBtn.textContent = 'n/a'
    }
  }

  function renderSprouts(): void {
    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const history = getHistorySprouts(sprouts)

    activeCount.textContent = `(${active.length})`
    cultivatedCount.textContent = `(${history.length})`

    // Render active
    activeList.innerHTML = active.map(s => `
      <div class="sprout-card sprout-active-card ${isOverdue(s) ? 'is-overdue' : ''}" data-id="${s.id}">
        <div class="sprout-card-header">
          <span class="sprout-card-type">${s.type}</span>
          <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
          <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${s.title}</p>
        <p class="sprout-card-date">${s.endDate ? `Due: ${formatDate(new Date(s.endDate))}` : ''}</p>
        <div class="sprout-complete-section">
          ${s.type === 'seed' ? `
            <div class="sprout-result-toggle">
              <button type="button" class="result-btn" data-result="0">Missed</button>
              <button type="button" class="result-btn" data-result="100">Done</button>
            </div>
          ` : `
            <div class="sprout-result-slider">
              <input type="range" min="0" max="5" value="0" class="result-slider" />
              <span class="result-value">0/5</span>
            </div>
          `}
          <textarea class="sprout-reflection-input" placeholder="Reflection (optional)..." rows="2"></textarea>
          <button type="button" class="sprout-complete-btn">${s.type === 'seed' ? 'Reap' : 'Prune'}</button>
        </div>
      </div>
    `).join('') || '<p class="empty-message">No active sprouts</p>'

    // Render history
    historyList.innerHTML = history.map(s => `
      <div class="sprout-card sprout-history-card ${s.state === 'failed' ? 'is-failed' : 'is-completed'}" data-id="${s.id}">
        <div class="sprout-card-header">
          <span class="sprout-card-type">${s.type}</span>
          <span class="sprout-card-result">${s.type === 'seed' ? (s.result === 100 ? 'reaped' : 'missed') : `${s.result}/5`}</span>
          <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${s.title}</p>
        ${s.reflection ? `<p class="sprout-card-reflection">${s.reflection}</p>` : ''}
        <p class="sprout-card-date">${s.completedAt ? formatDate(new Date(s.completedAt)) : ''}</p>
      </div>
    `).join('') || '<p class="empty-message">No history</p>'

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
        const confirmed = await showConfirm('Are you sure you want to uproot this sprout?')
        if (!confirmed) return
        const sprouts = getSprouts().filter(s => s.id !== id)
        setSprouts(sprouts)
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
          valueDisplay.textContent = `${result}/5`
          if (completeBtn) completeBtn.disabled = false
        })
      }

      completeBtn?.addEventListener('click', () => {
        if (!hasSelected) return
        const sprouts = getSprouts()
        const sprout = sprouts.find(s => s.id === id)
        if (!sprout) return
        sprout.state = result > 0 ? 'completed' : 'failed'
        sprout.result = result
        sprout.reflection = reflectionInput?.value.trim() || undefined
        sprout.completedAt = new Date().toISOString()
        setSprouts(sprouts)
        renderSprouts()
      })
    })
  }

  function resetForm(): void {
    selectedType = null
    selectedSeason = null
    sproutTitleInput.value = ''
    waterInput.value = ''
    environmentInput.value = ''
    soilInput.value = ''
    typeBtns.forEach(btn => btn.classList.remove('is-active'))
    typeHints.forEach(h => h.classList.remove('is-visible'))
    seasonBtns.forEach(btn => btn.classList.remove('is-active'))
    endDateDisplay.textContent = ''
    updateFormState()
  }


  // Type toggle
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type as SproutType
      selectedType = selectedType === type ? null : type
      typeBtns.forEach(b => b.classList.toggle('is-active', b.dataset.type === selectedType))
      typeHints.forEach(h => h.classList.toggle('is-visible', h.dataset.for === selectedType))
      updateFormState()
    })
  })

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

  // Sprout title input
  sproutTitleInput.addEventListener('input', updateFormState)

  // Set button - create draft sprout
  setBtn.addEventListener('click', () => {
    if (!selectedType || !selectedSeason) return
    const title = sproutTitleInput.value.trim()
    if (!title) return

    const water = waterInput.value.trim() || undefined
    const environment = environmentInput.value.trim() || undefined
    const soil = soilInput.value.trim() || undefined

    const now = new Date()
    const newSprout: Sprout = {
      id: generateSproutId(),
      type: selectedType,
      title,
      season: selectedSeason,
      state: 'active',
      createdAt: now.toISOString(),
      activatedAt: now.toISOString(),
      endDate: getEndDate(selectedSeason, now).toISOString(),
      water,
      environment,
      soil,
    }

    const sprouts = getSprouts()
    sprouts.push(newSprout)
    setSprouts(sprouts)
    resetForm()
    renderSprouts()
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
