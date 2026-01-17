import type { AppElements, BranchGroup } from '../types'
import { BRANCH_COUNT, TWIG_COUNT } from '../constants'
import { syncNode } from './node-ui'
import { getSoilAvailable, getSoilCapacity, getWaterAvailable, getWaterCapacity } from '../state'
import ampersandImage from '../../assets/ampersand_alpha.png'

export type DomBuilderResult = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
}

export type NodeClickHandler = (
  element: HTMLButtonElement,
  nodeId: string,
  placeholder: string
) => void

export function buildApp(
  appRoot: HTMLDivElement,
  onNodeClick: NodeClickHandler
): DomBuilderResult {
  const allNodes: HTMLButtonElement[] = []
  const branchGroups: BranchGroup[] = []
  const nodeLookup = new Map<string, HTMLButtonElement>()

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
  logo.alt = 'Trunk mark'

  const settingsButton = document.createElement('button')
  settingsButton.type = 'button'
  settingsButton.className = 'action-button'
  settingsButton.textContent = 'Settings'

  const importButton = document.createElement('button')
  importButton.type = 'button'
  importButton.className = 'action-button'
  importButton.textContent = 'Import'

  const exportButton = document.createElement('button')
  exportButton.type = 'button'
  exportButton.className = 'action-button'
  exportButton.textContent = 'Export'

  const showSproutsButton = document.createElement('button')
  showSproutsButton.type = 'button'
  showSproutsButton.className = 'action-button'
  showSproutsButton.textContent = 'Show all Sprouts'

  const encyclopediaButtons = {
    garden: createEncyclopediaButton('🌱 Garden', 'garden'),
    lab: createEncyclopediaButton('🧬 Lab', 'lab'),
    biome: createEncyclopediaButton('🌍 Biome', 'biome'),
    flora: createEncyclopediaButton('🌸 Flora', 'flora'),
    fauna: createEncyclopediaButton('🦋 Fauna', 'fauna'),
  }

  function createEncyclopediaButton(label: string, tab: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'action-button encyclopedia-btn'
    btn.textContent = label
    btn.dataset.encyclopediaTab = tab
    return btn
  }

  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json'
  importInput.className = 'visually-hidden'

  importButton.addEventListener('click', () => importInput.click())

  actions.append(
    settingsButton,
    importButton,
    exportButton,
    showSproutsButton
  )

  // Global Soil meter
  const soilMeter = document.createElement('div')
  soilMeter.className = 'resource-meter soil-meter'

  const soilLabel = document.createElement('span')
  soilLabel.className = 'resource-meter-label'
  soilLabel.textContent = 'Soil:'

  const soilTrack = document.createElement('div')
  soilTrack.className = 'resource-meter-track'

  const soilFill = document.createElement('div')
  soilFill.className = 'resource-meter-fill'
  const initialAvailable = getSoilAvailable()
  const initialCapacity = getSoilCapacity()
  soilFill.style.width = `${(initialAvailable / initialCapacity) * 100}%`

  const soilValue = document.createElement('span')
  soilValue.className = 'resource-meter-value'
  soilValue.textContent = `${initialAvailable}/${initialCapacity}`

  soilTrack.append(soilFill)
  soilMeter.append(soilLabel, soilTrack, soilValue)

  // Global Water meter
  const waterMeter = document.createElement('div')
  waterMeter.className = 'resource-meter water-meter'

  const waterLabel = document.createElement('span')
  waterLabel.className = 'resource-meter-label'
  waterLabel.textContent = 'Water:'

  const waterTrack = document.createElement('div')
  waterTrack.className = 'resource-meter-track'

  const waterFill = document.createElement('div')
  waterFill.className = 'resource-meter-fill'
  const initialWaterAvailable = getWaterAvailable()
  const initialWaterCapacity = getWaterCapacity()
  waterFill.style.width = `${(initialWaterAvailable / initialWaterCapacity) * 100}%`

  const waterValue = document.createElement('span')
  waterValue.className = 'resource-meter-value'
  waterValue.textContent = `${initialWaterAvailable}/${initialWaterCapacity}`

  waterTrack.append(waterFill)
  waterMeter.append(waterLabel, waterTrack, waterValue)

  // Global Sun meter (visual only for now)
  const sunMeter = document.createElement('div')
  sunMeter.className = 'resource-meter sun-meter'

  const sunLabel = document.createElement('span')
  sunLabel.className = 'resource-meter-label'
  sunLabel.textContent = 'Sun:'

  const sunTrack = document.createElement('div')
  sunTrack.className = 'resource-meter-track'

  const sunFill = document.createElement('div')
  sunFill.className = 'resource-meter-fill'
  sunFill.style.width = '100%' // 3/3

  const sunValue = document.createElement('span')
  sunValue.className = 'resource-meter-value'
  sunValue.textContent = '3/3'

  sunTrack.append(sunFill)
  sunMeter.append(sunLabel, sunTrack, sunValue)

  // Meter group for visual cohesion
  const meterGroup = document.createElement('div')
  meterGroup.className = 'meter-group'
  meterGroup.append(soilMeter, waterMeter, sunMeter)

  header.append(actions, meterGroup, logo, importInput)

  // Future Ideas Folder - contains archived encyclopedia features
  const futureIdeasFolder = document.createElement('div')
  futureIdeasFolder.className = 'future-ideas-folder is-collapsed'

  const futureIdeasToggle = document.createElement('button')
  futureIdeasToggle.type = 'button'
  futureIdeasToggle.className = 'future-ideas-toggle'

  const futureIdeasLabel = document.createElement('span')
  futureIdeasLabel.textContent = 'Future Ideas'

  const futureIdeasArrow = document.createElement('span')
  futureIdeasArrow.className = 'future-ideas-arrow'
  futureIdeasArrow.textContent = '▼'

  futureIdeasToggle.append(futureIdeasLabel, futureIdeasArrow)

  futureIdeasToggle.addEventListener('click', () => {
    futureIdeasFolder.classList.toggle('is-collapsed')
  })

  const futureIdeasContent = document.createElement('div')
  futureIdeasContent.className = 'future-ideas-content'

  // Disable encyclopedia buttons and add to Future Ideas
  Object.values(encyclopediaButtons).forEach(btn => {
    btn.disabled = true
    btn.classList.add('future-idea-item')
  })

  futureIdeasContent.append(
    encyclopediaButtons.garden,
    encyclopediaButtons.lab,
    encyclopediaButtons.biome,
    encyclopediaButtons.flora,
    encyclopediaButtons.fauna
  )

  futureIdeasFolder.append(futureIdeasToggle, futureIdeasContent)

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
  const trunk = document.createElement('button')
  trunk.type = 'button'
  trunk.className = 'node trunk'
  trunk.dataset.nodeId = 'trunk'
  trunk.dataset.defaultLabel = 'Trunk'
  trunk.dataset.placeholder = 'Trunk'
  trunk.setAttribute('aria-label', 'Trunk - your core purpose')
  trunk.style.setProperty('--ampersand', `url(${ampersandImage})`)

  const trunkLabel = document.createElement('span')
  trunkLabel.className = 'trunk-title node-label'
  trunkLabel.textContent = 'Trunk'
  trunk.append(trunkLabel)

  canvas.append(trunk)

  initializeNode(trunk, 'Trunk', nodeLookup, onNodeClick)
  allNodes.push(trunk)

  // Create branches
  for (let i = 0; i < BRANCH_COUNT; i += 1) {
    const wrapper = document.createElement('div')
    wrapper.className = 'branch-group'

    const branchId = `branch-${i}`
    const branch = document.createElement('button')
    branch.type = 'button'
    branch.className = 'node branch'
    branch.dataset.nodeId = branchId
    branch.dataset.defaultLabel = String(i + 1)
    branch.dataset.placeholder = `Branch ${i + 1}`
    branch.dataset.branchIndex = String(i)
    branch.setAttribute('aria-label', `Branch ${i + 1}`)

    const branchLabel = document.createElement('span')
    branchLabel.className = 'node-label'
    branch.append(branchLabel)

    const keyHint = document.createElement('span')
    keyHint.className = 'key-hint'
    keyHint.textContent = String(i + 1)
    branch.append(keyHint)

    initializeNode(branch, `Branch ${i + 1}`, nodeLookup, onNodeClick)
    allNodes.push(branch)

    const twigs: HTMLButtonElement[] = []
    for (let j = 0; j < TWIG_COUNT; j += 1) {
      const twigId = `branch-${i}-twig-${j}`
      const twig = document.createElement('button')
      twig.type = 'button'
      twig.className = 'node twig'
      twig.dataset.nodeId = twigId
      twig.dataset.defaultLabel = ''
      twig.dataset.placeholder = `Twig ${j + 1} for branch ${i + 1}`
      twig.dataset.branchIndex = String(i)
      twig.dataset.twigIndex = String(j)
      twig.dataset.twigStyle = '0'
      twig.style.setProperty('--twig-delay', `${getBloomDelay(j)}ms`)
      twig.setAttribute('aria-label', `Twig ${j + 1} for branch ${i + 1}`)

      const twigLabel = document.createElement('span')
      twigLabel.className = 'node-label'
      twig.append(twigLabel)

      const twigKeyHint = document.createElement('span')
      twigKeyHint.className = 'key-hint'
      twigKeyHint.textContent = String(j + 1)
      twig.append(twigKeyHint)

      initializeNode(twig, `Twig ${j + 1} for branch ${i + 1}`, nodeLookup, onNodeClick)
      twigs.push(twig)
      allNodes.push(twig)
      wrapper.append(twig)
    }

    wrapper.append(branch)
    branchGroups.push({ group: wrapper, branch, twigs })
    canvas.append(wrapper)
  }

  // Debug panel
  const debugPanel = document.createElement('div')
  debugPanel.className = 'debug-panel'

  // Debug checkbox
  const debugLabel = document.createElement('label')
  debugLabel.className = 'debug-toggle'
  const debugCheckbox = document.createElement('input')
  debugCheckbox.type = 'checkbox'
  debugCheckbox.checked = false
  const debugText = document.createTextNode(' Show debug guide lines')
  debugLabel.append(debugCheckbox, debugText)

  // Debug clock
  const debugClockRow = document.createElement('div')
  debugClockRow.className = 'debug-clock-row'
  const debugClockOffset = document.createElement('span')
  debugClockOffset.className = 'debug-clock-offset'
  const debugClockBtn = document.createElement('button')
  debugClockBtn.type = 'button'
  debugClockBtn.className = 'debug-clock-btn'
  debugClockBtn.title = 'Add 1 day to internal clock'
  debugClockBtn.textContent = '+1 day'
  const debugSoilResetBtn = document.createElement('button')
  debugSoilResetBtn.type = 'button'
  debugSoilResetBtn.className = 'debug-clock-btn'
  debugSoilResetBtn.title = 'Reset all resources to default'
  debugSoilResetBtn.textContent = 'Reset Resources'
  const debugClearSproutsBtn = document.createElement('button')
  debugClearSproutsBtn.type = 'button'
  debugClearSproutsBtn.className = 'debug-clock-btn'
  debugClearSproutsBtn.title = 'Clear all sprouts and leaves'
  debugClearSproutsBtn.textContent = 'Clear Sprouts'
  debugClockRow.append(debugClockOffset, debugClockBtn, debugSoilResetBtn, debugClearSproutsBtn)

  debugPanel.append(debugLabel, debugClockRow)
  mapPanel.append(canvas, guideLayer, debugPanel)

  // Side Panel
  const sidePanel = document.createElement('aside')
  sidePanel.className = 'side-panel'
  sidePanel.innerHTML = `
    <section class="panel-section focus-section">
      <p class="focus-meta"></p>
      <p class="focus-title"></p>
      <p class="focus-note"></p>
      <p class="focus-goal"></p>
    </section>
    <section class="panel-section progress-section">
      <p class="progress-count"></p>
      <div class="progress-track">
        <span class="progress-fill" style="width: 0%"></span>
      </div>
      <div class="progress-actions">
        <button type="button" class="panel-button back-to-trunk">← Back to trunk</button>
      </div>
    </section>
    <section class="panel-section sprouts-section">
      <button type="button" class="sprouts-toggle is-expanded" data-section="active">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Growing</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="active"></div>
      <button type="button" class="sprouts-toggle" data-section="cultivated">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Cultivated</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="cultivated"></div>
    </section>
    <section class="panel-section">
      <p class="status-message"></p>
      <p class="status-meta"></p>
    </section>
  `

  body.append(mapPanel, sidePanel)

  // Sprouts dialog
  const sproutsDialog = document.createElement('div')
  sproutsDialog.className = 'sprouts-dialog hidden'
  sproutsDialog.innerHTML = `
    <div class="sprouts-dialog-box">
      <div class="sprouts-dialog-header">
        <h2 class="sprouts-dialog-title">All Sprouts</h2>
        <button type="button" class="sprouts-dialog-close">×</button>
      </div>
      <div class="sprouts-dialog-content"></div>
    </div>
  `

  // Garden Guide dialog
  const gardenGuideDialog = document.createElement('div')
  gardenGuideDialog.className = 'garden-guide-dialog hidden'
  gardenGuideDialog.innerHTML = `
    <div class="garden-guide-box">
      <div class="garden-guide-header">
        <h2 class="garden-guide-title">Trunk Encyclopedia</h2>
        <button type="button" class="garden-guide-close">×</button>
      </div>
      <nav class="guide-tabs">
        <button type="button" class="guide-tab is-active" data-tab="garden">🌱 Garden</button>
        <button type="button" class="guide-tab" data-tab="lab">🧬 Lab</button>
        <button type="button" class="guide-tab" data-tab="biome">🌍 Biome</button>
        <button type="button" class="guide-tab" data-tab="flora">🌸 Flora</button>
        <button type="button" class="guide-tab" data-tab="fauna">🦋 Fauna</button>
      </nav>
      <div class="garden-guide-content">
        <!-- GARDEN TAB -->
        <div class="guide-panel is-active" data-panel="garden">
        <section class="guide-section">
          <h3 class="guide-section-title">The Flowerdex <span class="guide-draft">[DRAFT v0.3]</span></h3>
          <p class="guide-intro">Your Trunk is a living ecosystem. Every cultivated Sprout blooms into a collectible Flower with genetic traits that can be inherited, combined, and cross-pollinated. Discover new species, breed rare variants, and fill your Flowerdex with every bloom in existence.</p>
          <p class="guide-text">Failed attempts leave behind 🥀 Wilted blooms — still collected, still part of your story.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Species Tiers</h3>
          <p class="guide-text">Base species are determined by Season length. Each tier contains multiple discoverable species.</p>
          <div class="guide-tiers">
            <div class="guide-tier tier-common">
              <span class="tier-icon">🌼</span>
              <div class="tier-info">
                <span class="tier-name">Common</span>
                <span class="tier-season">1 week · Base species</span>
                <span class="tier-species">Daisy 🌼 · Sunflower 🌻 · Whitepetal 💮</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
            <div class="guide-tier tier-uncommon">
              <span class="tier-icon">🌸</span>
              <div class="tier-info">
                <span class="tier-name">Uncommon</span>
                <span class="tier-season">2 weeks · Base species</span>
                <span class="tier-species">Cherry 🌸 · Tulip 🌷 · Bouquet 💐</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
            <div class="guide-tier tier-rare">
              <span class="tier-icon">🌺</span>
              <div class="tier-info">
                <span class="tier-name">Rare</span>
                <span class="tier-season">1 month · Base species</span>
                <span class="tier-species">Hibiscus 🌺 · Rosette 🏵️ · Clover ☘️</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
            <div class="guide-tier tier-epic">
              <span class="tier-icon">🪻</span>
              <div class="tier-info">
                <span class="tier-name">Epic</span>
                <span class="tier-season">3 months · Base species</span>
                <span class="tier-species">Hyacinth 🪻 · Fourleaf 🍀 · Wheat 🌾</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
            <div class="guide-tier tier-legendary">
              <span class="tier-icon">🪷</span>
              <div class="tier-info">
                <span class="tier-name">Legendary</span>
                <span class="tier-season">6 months · Base species</span>
                <span class="tier-species">Lotus 🪷 · Potted 🪴 · Cactus 🌵</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
            <div class="guide-tier tier-mythic">
              <span class="tier-icon">🌹</span>
              <div class="tier-info">
                <span class="tier-name">Mythic</span>
                <span class="tier-season">1 year · Base species</span>
                <span class="tier-species">Rose 🌹 · ??? · ???</span>
              </div>
              <span class="tier-discovered">0/3</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Hybrid Species <span class="guide-draft">[CROSS-POLLINATION]</span></h3>
          <p class="guide-text">When flowers from different Branches bloom near each other, they can cross-pollinate to create Hybrid species. Hybrids inherit traits from both parents.</p>
          <div class="guide-breeds">
            <div class="breed-row">
              <span class="breed-parents">🌼 + 🌸</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">🌷 Blushing Daisy</span>
              <span class="breed-chance">~12%</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">🌺 + 🪻</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">🏵️ Tropical Hyacinth</span>
              <span class="breed-chance">~8%</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">🌸 + 🌹</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">💐 Eternal Bouquet</span>
              <span class="breed-chance">~3%</span>
            </div>
            <div class="breed-row breed-secret">
              <span class="breed-parents">??? + ???</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">??? Undiscovered</span>
              <span class="breed-chance">???</span>
            </div>
          </div>
          <p class="guide-text guide-subtext">Cross-pollination occurs when you have active sprouts in multiple Branches simultaneously.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Genetic Traits</h3>
          <p class="guide-text">Every flower carries genetic traits that can be passed to offspring through cross-pollination. Traits have dominant (shown) and recessive (hidden) alleles.</p>
          <div class="guide-genetics">
            <div class="gene-category">
              <span class="gene-title">🎨 Pigment Genes</span>
              <div class="gene-alleles">
                <span class="allele dominant">Crimson</span>
                <span class="allele dominant">Azure</span>
                <span class="allele recessive">Ivory</span>
                <span class="allele recessive">Obsidian</span>
                <span class="allele rare">Prismatic</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">🍃 Foliage Genes</span>
              <div class="gene-alleles">
                <span class="allele dominant">Broad Leaf</span>
                <span class="allele dominant">Needle</span>
                <span class="allele recessive">Variegated</span>
                <span class="allele rare">Crystalline</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">✨ Aura Genes</span>
              <div class="gene-alleles">
                <span class="allele recessive">Shimmer</span>
                <span class="allele recessive">Glow</span>
                <span class="allele rare">Radiant</span>
                <span class="allele mythic">Celestial</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">🌙 Temporal Genes</span>
              <div class="gene-alleles">
                <span class="allele recessive">Nocturnal</span>
                <span class="allele recessive">Dawn-bloom</span>
                <span class="allele rare">Everbloom</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Mutations</h3>
          <p class="guide-text">Rarely, genetic anomalies produce Mutant flowers with unique traits not found in either parent. Mutations are the only way to discover certain species.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🧬 Minor Mutation</span>
              <span class="luck-value">~5% · Single trait shifts</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🔬 Major Mutation</span>
              <span class="luck-value">~1% · New trait emerges</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">💎 Pristine Mutation</span>
              <span class="luck-value">~0.1% · Perfect trait expression</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌌 Anomaly</span>
              <span class="luck-value">~0.01% · Entirely new species</span>
            </div>
          </div>
          <p class="guide-text guide-subtext">Mutation chance increases with: longer seasons, streak bonuses, specific trait combinations.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Branch Biomes</h3>
          <p class="guide-text">Each Branch represents a unique biome that favors certain species and traits. Flowers grown in their native biome gain bonuses.</p>
          <div class="guide-biomes">
            <div class="biome-row">
              <span class="biome-icon">🌲</span>
              <span class="biome-name">Branch 1: Evergreen</span>
              <span class="biome-bonus">+Needle foliage, cold-resistant species</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">🌴</span>
              <span class="biome-name">Branch 2: Tropical</span>
              <span class="biome-bonus">+Vibrant pigments, exotic species</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">🌳</span>
              <span class="biome-name">Branch 3: Temperate</span>
              <span class="biome-bonus">+Balanced traits, hybrid fertility</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">🏜️</span>
              <span class="biome-name">Branch 4: Arid</span>
              <span class="biome-bonus">+Succulent species, drought-resistant</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">🌊</span>
              <span class="biome-name">Branch 5: Coastal</span>
              <span class="biome-bonus">+Aquatic traits, salt-tolerant</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">⛰️</span>
              <span class="biome-name">Branch 6: Alpine</span>
              <span class="biome-bonus">+Rare mutations, high-altitude species</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">🌙</span>
              <span class="biome-name">Branch 7: Nocturnal</span>
              <span class="biome-bonus">+Temporal genes, night-blooming species</span>
            </div>
            <div class="biome-row">
              <span class="biome-icon">✨</span>
              <span class="biome-name">Branch 8: Ethereal</span>
              <span class="biome-bonus">+Aura genes, mythic species chance</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Companions</h3>
          <p class="guide-text">Some flowers attract companion creatures that provide bonuses to nearby blooms.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🐝 Honeybee</span>
              <span class="luck-value">+15% cross-pollination chance</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🦋 Butterfly</span>
              <span class="luck-value">+10% mutation chance</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🐞 Ladybug</span>
              <span class="luck-value">Protects against wilt (failed → retry)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🪲 Beetle</span>
              <span class="luck-value">+5% to all offspring stats</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🦜 Hummingbird</span>
              <span class="luck-value">Rare species discovery +25%</span>
            </div>
          </div>
          <p class="guide-text guide-subtext">Companions are attracted by specific flower combinations in your garden.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Growth States</h3>
          <div class="guide-outcomes">
            <div class="outcome-row">
              <span class="outcome-icon">🌱</span>
              <span class="outcome-label">Seedling</span>
              <span class="outcome-desc">Sprout planted, genetics determined at this stage</span>
            </div>
            <div class="outcome-row">
              <span class="outcome-icon">🌿</span>
              <span class="outcome-label">Growing</span>
              <span class="outcome-desc">Season in progress, can still cross-pollinate</span>
            </div>
            <div class="outcome-row">
              <span class="outcome-icon">🪺</span>
              <span class="outcome-label">Budding</span>
              <span class="outcome-desc">Ready to harvest, traits locked in</span>
            </div>
            <div class="outcome-row outcome-success">
              <span class="outcome-icon">🌸</span>
              <span class="outcome-label">Bloomed</span>
              <span class="outcome-desc">Successfully cultivated → added to Flowerdex</span>
            </div>
            <div class="outcome-row outcome-failed">
              <span class="outcome-icon">🥀</span>
              <span class="outcome-label">Wilted</span>
              <span class="outcome-desc">Failed → wilted variant collected</span>
            </div>
            <div class="outcome-row outcome-uprooted">
              <span class="outcome-icon">🍂</span>
              <span class="outcome-label">Fallen</span>
              <span class="outcome-desc">Uprooted → no collection, genetics lost</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Flowerdex Completion</h3>
          <p class="guide-text">Track your discovery progress across all species, variants, and trait combinations.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">📖 Base Species</span>
              <span class="luck-value">18 species across 6 tiers (0/18)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🧬 Hybrid Species</span>
              <span class="luck-value">24+ discoverable combinations (0/??)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">💎 Mutant Species</span>
              <span class="luck-value">??? hidden species (0/??)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🎨 Trait Variants</span>
              <span class="luck-value">100+ possible trait combinations</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🏆 Perfect Specimens</span>
              <span class="luck-value">All dominant traits expressed (0/??)</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Grove Milestones</h3>
          <p class="guide-text">Each Branch grows from barren soil into a thriving grove as you cultivate more flowers.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🌱 Barren</span>
              <span class="luck-value">No flowers yet · Start your journey</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌿 Sprouting</span>
              <span class="luck-value">3+ flowers · Unlocks cross-pollination</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌲 Growing</span>
              <span class="luck-value">8+ flowers · Unlocks companions</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌳 Flourishing</span>
              <span class="luck-value">25+ flowers · Biome bonus active</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌴 Ancient</span>
              <span class="luck-value">100+ flowers · Legendary species chance +</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🏛️ Mythic Grove</span>
              <span class="luck-value">All species discovered · ???</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Trunk Achievements</h3>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🌰 First Seed</span>
              <span class="luck-value">Plant your very first sprout</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🧬 First Hybrid</span>
              <span class="luck-value">Discover your first cross-pollinated species</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🔬 Geneticist</span>
              <span class="luck-value">Observe 10 different trait combinations</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">💐 Bouquet Master</span>
              <span class="luck-value">Collect one flower from each base tier</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🍀 Lucky Gardener</span>
              <span class="luck-value">Get 3 lucky bloom upgrades</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🦋 Butterfly Effect</span>
              <span class="luck-value">Attract all 5 companion types</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌌 Anomaly Hunter</span>
              <span class="luck-value">Discover a mutation anomaly species</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌲🌳🌴 Full Forest</span>
              <span class="luck-value">Reach Flourishing in all 8 Branches</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">📚 Flowerdex Complete</span>
              <span class="luck-value">Discover every species in existence</span>
            </div>
          </div>
        </section>

        <section class="guide-section guide-notes">
          <h3 class="guide-section-title">Design Notes</h3>
          <ul class="guide-list">
            <li>All emojis are placeholders — will be replaced with illustrated flowers</li>
            <li>Each species will have unique illustrated variants based on genetic traits</li>
            <li>Breeding mechanics inspired by Forestry/Extra Bees for Minecraft</li>
            <li>Flowerdex tracks discovery like a Pokédex — silhouettes for undiscovered</li>
            <li>Cross-pollination requires active sprouts in 2+ Branches simultaneously</li>
            <li>Consider: "Greenhouse" feature to control breeding environment?</li>
            <li>Consider: Trading/gifting flowers or seeds between users?</li>
            <li>Consider: Seasonal real-world events with limited species?</li>
            <li>Consider: "Exhibition" mode to showcase your best specimens?</li>
          </ul>
        </section>
        </div>

        <!-- LAB TAB -->
        <div class="guide-panel" data-panel="lab">
        <section class="guide-section">
          <h3 class="guide-section-title">Genetic Laboratory <span class="guide-draft">[RESEARCH v0.1]</span></h3>
          <p class="guide-intro">The Lab is where you study and manipulate the genetic code of your flowers. Understand inheritance patterns, isolate rare alleles, and breed the perfect specimens.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Inheritance Mechanics</h3>
          <p class="guide-text">Each flower carries two alleles for every trait — one from each parent. When breeding, offspring randomly inherit one allele from each parent.</p>
          <div class="guide-genetics">
            <div class="gene-category">
              <span class="gene-title">📐 Punnett Square Example</span>
              <div class="gene-alleles">
                <span class="allele dominant">Aa</span>
                <span class="allele">×</span>
                <span class="allele dominant">Aa</span>
                <span class="allele">→</span>
                <span class="allele dominant">AA</span>
                <span class="allele dominant">Aa</span>
                <span class="allele dominant">Aa</span>
                <span class="allele recessive">aa</span>
              </div>
            </div>
          </div>
          <p class="guide-text guide-subtext">25% pure dominant · 50% carrier · 25% pure recessive</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Trait Categories</h3>
          <div class="guide-genetics">
            <div class="gene-category">
              <span class="gene-title">🎨 Pigment Genes</span>
              <p class="guide-text">Control petal and leaf coloration. Prismatic is extremely rare.</p>
              <div class="gene-alleles">
                <span class="allele dominant">Crimson (Cr)</span>
                <span class="allele dominant">Azure (Az)</span>
                <span class="allele dominant">Golden (Go)</span>
                <span class="allele recessive">Ivory (iv)</span>
                <span class="allele recessive">Obsidian (ob)</span>
                <span class="allele rare">Prismatic (Pr)</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">🍃 Foliage Genes</span>
              <p class="guide-text">Determine leaf shape and structure. Affects biome compatibility.</p>
              <div class="gene-alleles">
                <span class="allele dominant">Broad (Br)</span>
                <span class="allele dominant">Needle (Ne)</span>
                <span class="allele dominant">Palmate (Pa)</span>
                <span class="allele recessive">Variegated (va)</span>
                <span class="allele recessive">Serrated (se)</span>
                <span class="allele rare">Crystalline (Xy)</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">✨ Aura Genes</span>
              <p class="guide-text">Visual effects and special properties. All auras are recessive or rare.</p>
              <div class="gene-alleles">
                <span class="allele recessive">Shimmer (sh)</span>
                <span class="allele recessive">Glow (gl)</span>
                <span class="allele recessive">Mist (mi)</span>
                <span class="allele rare">Radiant (Ra)</span>
                <span class="allele mythic">Celestial (Ce)</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">🌙 Temporal Genes</span>
              <p class="guide-text">When the flower blooms and how long it lasts.</p>
              <div class="gene-alleles">
                <span class="allele dominant">Diurnal (Di)</span>
                <span class="allele recessive">Nocturnal (no)</span>
                <span class="allele recessive">Dawn-bloom (da)</span>
                <span class="allele recessive">Dusk-bloom (du)</span>
                <span class="allele rare">Everbloom (Ev)</span>
              </div>
            </div>
            <div class="gene-category">
              <span class="gene-title">🏔️ Adaptation Genes</span>
              <p class="guide-text">Environmental tolerance and special survival traits.</p>
              <div class="gene-alleles">
                <span class="allele dominant">Hardy (Ha)</span>
                <span class="allele recessive">Aquatic (aq)</span>
                <span class="allele recessive">Xerophyte (xe)</span>
                <span class="allele recessive">Alpine (al)</span>
                <span class="allele rare">Extremophile (Ex)</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Mutation Research</h3>
          <p class="guide-text">Mutations occur randomly during reproduction. Certain conditions increase mutation rates.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🧪 Base Rate</span>
              <span class="luck-value">~2% per gene per breeding</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🧬 Hybrid Parents</span>
              <span class="luck-value">+3% mutation chance</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">⚡ Stressed Growth</span>
              <span class="luck-value">+5% (wrong biome)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌙 Nocturnal Breeding</span>
              <span class="luck-value">+2% for aura genes</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">💎 Perfect Specimens</span>
              <span class="luck-value">-50% (genetic stability)</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Breeding Projects</h3>
          <p class="guide-text">Long-term breeding goals to isolate and express specific trait combinations.</p>
          <div class="guide-breeds">
            <div class="breed-row">
              <span class="breed-parents">Goal</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Pure Prismatic Rose</span>
              <span class="breed-chance">~0.01%</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">Goal</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Celestial Everbloom</span>
              <span class="breed-chance">~0.001%</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">Goal</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Crystalline Extremophile</span>
              <span class="breed-chance">~0.005%</span>
            </div>
            <div class="breed-row breed-secret">
              <span class="breed-parents">???</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">The Impossible Bloom</span>
              <span class="breed-chance">???</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Gene Sequencing</h3>
          <p class="guide-text">As you cultivate more flowers, you unlock the ability to "read" their genetic code.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🔬 Novice</span>
              <span class="luck-value">See 1 dominant trait</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🧬 Apprentice</span>
              <span class="luck-value">See all dominant traits</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🔭 Researcher</span>
              <span class="luck-value">See hidden recessives (50%)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🧪 Geneticist</span>
              <span class="luck-value">Full genome visibility</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌌 Master</span>
              <span class="luck-value">Predict offspring traits</span>
            </div>
          </div>
        </section>
        </div>

        <!-- BIOME TAB -->
        <div class="guide-panel" data-panel="biome">
        <section class="guide-section">
          <h3 class="guide-section-title">World Biomes <span class="guide-draft">[TERRAIN v0.1]</span></h3>
          <p class="guide-intro">Each Branch of your Trunk represents a distinct biome with unique climate, terrain, and native species. Flowers grown in compatible biomes thrive; those in hostile environments may struggle — or mutate.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">The Eight Realms</h3>
          <div class="biome-grid">
            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🌲</span>
                <span class="biome-card-name">Evergreen Forest</span>
                <span class="biome-card-branch">Branch 1</span>
              </div>
              <p class="biome-card-desc">Dense coniferous woodland with filtered light and cool temperatures year-round. Rich in fungi and mosses.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Needle foliage</span>
                <span class="biome-trait">+Cold-hardy</span>
                <span class="biome-trait">+Shade-tolerant</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Pine Blossom 🌲, Moss Rose 🌿, Frostbell ❄️</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🌴</span>
                <span class="biome-card-name">Tropical Rainforest</span>
                <span class="biome-card-branch">Branch 2</span>
              </div>
              <p class="biome-card-desc">Lush, humid jungle with towering canopy. Intense competition for light drives dramatic adaptations.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Vibrant pigments</span>
                <span class="biome-trait">+Broad leaves</span>
                <span class="biome-trait">+Rapid growth</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Jungle Orchid 🌺, Paradise Bird 🦜, Canopy Vine 🌿</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🌳</span>
                <span class="biome-card-name">Temperate Woodland</span>
                <span class="biome-card-branch">Branch 3</span>
              </div>
              <p class="biome-card-desc">Deciduous forest with four distinct seasons. The most balanced biome, ideal for hybrid breeding.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Balanced traits</span>
                <span class="biome-trait">+Hybrid fertility +15%</span>
                <span class="biome-trait">+Seasonal blooms</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Oak Bloom 🌳, Maple Star 🍁, Wildflower 🌼</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🏜️</span>
                <span class="biome-card-name">Arid Desert</span>
                <span class="biome-card-branch">Branch 4</span>
              </div>
              <p class="biome-card-desc">Scorching days, freezing nights. Only the most adapted species survive. Extreme stress increases mutation.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Xerophyte adaptation</span>
                <span class="biome-trait">+Mutation +10%</span>
                <span class="biome-trait">+Thick stems</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Desert Rose 🌵, Sandfire 🔥, Moonbloom 🌙</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🌊</span>
                <span class="biome-card-name">Coastal Shores</span>
                <span class="biome-card-branch">Branch 5</span>
              </div>
              <p class="biome-card-desc">Salt spray, sandy soil, constant wind. Aquatic traits emerge here. Tidal rhythms affect bloom timing.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Aquatic adaptation</span>
                <span class="biome-trait">+Salt-tolerant</span>
                <span class="biome-trait">+Tidal blooms</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Sea Lavender 🌊, Coral Lily 🪸, Driftwood Rose 🪵</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">⛰️</span>
                <span class="biome-card-name">Alpine Heights</span>
                <span class="biome-card-branch">Branch 6</span>
              </div>
              <p class="biome-card-desc">Thin air, intense UV, extreme cold. High-altitude specialists develop unique protective traits.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Alpine adaptation</span>
                <span class="biome-trait">+Rare mutation +20%</span>
                <span class="biome-trait">+Compact growth</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Edelweiss ⛰️, Sky Gentian 💙, Stone Orchid 🪨</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">🌙</span>
                <span class="biome-card-name">Twilight Grove</span>
                <span class="biome-card-branch">Branch 7</span>
              </div>
              <p class="biome-card-desc">Perpetual dusk. Bioluminescent species thrive here. Temporal genes express more freely.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Nocturnal traits</span>
                <span class="biome-trait">+Aura genes +25%</span>
                <span class="biome-trait">+Glow effects</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Moonpetal 🌙, Starflower ⭐, Glowmoss ✨</span>
              </div>
            </div>

            <div class="biome-card">
              <div class="biome-card-header">
                <span class="biome-card-icon">✨</span>
                <span class="biome-card-name">Ethereal Glade</span>
                <span class="biome-card-branch">Branch 8</span>
              </div>
              <p class="biome-card-desc">A realm between worlds. Reality bends here. Mythic species spawn naturally. The impossible becomes possible.</p>
              <div class="biome-card-traits">
                <span class="biome-trait">+Mythic species +50%</span>
                <span class="biome-trait">+Celestial aura</span>
                <span class="biome-trait">+Reality-bending</span>
              </div>
              <div class="biome-card-species">
                <span class="biome-species">Native: Void Lily 🕳️, Prism Rose 🌈, Eternal Bloom ♾️</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Biome Interactions</h3>
          <p class="guide-text">Cross-pollination between adjacent biomes creates unique hybrid opportunities.</p>
          <div class="guide-breeds">
            <div class="breed-row">
              <span class="breed-parents">🌲 + 🌳</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Transition species, hardy hybrids</span>
              <span class="breed-chance">Common</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">🏜️ + 🌊</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Impossible — biomes too different</span>
              <span class="breed-chance">0%</span>
            </div>
            <div class="breed-row">
              <span class="breed-parents">🌙 + ✨</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">Otherworldly species</span>
              <span class="breed-chance">Rare</span>
            </div>
            <div class="breed-row breed-secret">
              <span class="breed-parents">All 8</span>
              <span class="breed-arrow">→</span>
              <span class="breed-result">??? Universal Bloom ???</span>
              <span class="breed-chance">???</span>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Climate Events</h3>
          <p class="guide-text">Random events that temporarily alter biome conditions.</p>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🌧️ Monsoon</span>
              <span class="luck-value">+Aquatic traits in all biomes</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">☀️ Heatwave</span>
              <span class="luck-value">+Xerophyte mutations</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">❄️ Cold Snap</span>
              <span class="luck-value">+Alpine traits spread</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌫️ Strange Fog</span>
              <span class="luck-value">+Ethereal effects everywhere</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🌈 Prismatic Dawn</span>
              <span class="luck-value">+50% all rare traits (24hr)</span>
            </div>
          </div>
        </section>
        </div>

        <!-- FLORA TAB -->
        <div class="guide-panel" data-panel="flora">
        <section class="guide-section">
          <h3 class="guide-section-title">Flowerdex <span class="guide-draft">[CATALOG v0.1]</span></h3>
          <p class="guide-intro">A comprehensive catalog of all discoverable flower species, their traits, and how to obtain them. Undiscovered species appear as silhouettes.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Common Species (1 Week)</h3>
          <div class="flora-grid">
            <div class="flora-card">
              <span class="flora-icon">🌼</span>
              <div class="flora-info">
                <span class="flora-name">Daisy</span>
                <span class="flora-traits">Simple · Diurnal · Hardy</span>
                <span class="flora-obtain">Base species — any biome</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🌻</span>
              <div class="flora-info">
                <span class="flora-name">Sunflower</span>
                <span class="flora-traits">Tall · Sun-tracking · Golden</span>
                <span class="flora-obtain">Base species — temperate/arid</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">💮</span>
              <div class="flora-info">
                <span class="flora-name">Whitepetal</span>
                <span class="flora-traits">Pure · Ivory pigment · Delicate</span>
                <span class="flora-obtain">Base species — shade biomes</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Uncommon Species (2 Weeks)</h3>
          <div class="flora-grid">
            <div class="flora-card">
              <span class="flora-icon">🌸</span>
              <div class="flora-info">
                <span class="flora-name">Cherry Blossom</span>
                <span class="flora-traits">Ephemeral · Pink · Spring-bloom</span>
                <span class="flora-obtain">Base species — temperate</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🌷</span>
              <div class="flora-info">
                <span class="flora-name">Tulip</span>
                <span class="flora-traits">Cup-shaped · Variable color · Bulb</span>
                <span class="flora-obtain">Base species — temperate</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">💐</span>
              <div class="flora-info">
                <span class="flora-name">Bouquet</span>
                <span class="flora-traits">Multi-bloom · Mixed · Clustered</span>
                <span class="flora-obtain">Hybrid — any 3 common species</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Rare Species (1 Month)</h3>
          <div class="flora-grid">
            <div class="flora-card">
              <span class="flora-icon">🌺</span>
              <div class="flora-info">
                <span class="flora-name">Hibiscus</span>
                <span class="flora-traits">Tropical · Crimson · Large</span>
                <span class="flora-obtain">Base species — tropical only</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🏵️</span>
              <div class="flora-info">
                <span class="flora-name">Rosette</span>
                <span class="flora-traits">Layered · Complex · Ornamental</span>
                <span class="flora-obtain">Hybrid — rose × any rare</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">☘️</span>
              <div class="flora-info">
                <span class="flora-name">Clover</span>
                <span class="flora-traits">Lucky · Three-leaf · Ground cover</span>
                <span class="flora-obtain">Base species — temperate ground</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Epic Species (3 Months)</h3>
          <div class="flora-grid">
            <div class="flora-card">
              <span class="flora-icon">🪻</span>
              <div class="flora-info">
                <span class="flora-name">Hyacinth</span>
                <span class="flora-traits">Fragrant · Clustered · Spring</span>
                <span class="flora-obtain">Base species — temperate/alpine</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🍀</span>
              <div class="flora-info">
                <span class="flora-name">Four-Leaf Clover</span>
                <span class="flora-traits">Extremely lucky · Mutation</span>
                <span class="flora-obtain">Rare mutation of ☘️ Clover</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🌾</span>
              <div class="flora-info">
                <span class="flora-name">Golden Wheat</span>
                <span class="flora-traits">Abundance · Harvest · Golden</span>
                <span class="flora-obtain">Base species — arid/temperate</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Legendary Species (6 Months)</h3>
          <div class="flora-grid">
            <div class="flora-card flora-legendary">
              <span class="flora-icon">🪷</span>
              <div class="flora-info">
                <span class="flora-name">Sacred Lotus</span>
                <span class="flora-traits">Aquatic · Pure · Enlightened</span>
                <span class="flora-obtain">Base species — coastal/ethereal</span>
              </div>
            </div>
            <div class="flora-card flora-legendary">
              <span class="flora-icon">🪴</span>
              <div class="flora-info">
                <span class="flora-name">Bonzai Spirit</span>
                <span class="flora-traits">Ancient · Miniature · Wise</span>
                <span class="flora-obtain">Aged specimen — 10+ cultivations</span>
              </div>
            </div>
            <div class="flora-card flora-legendary">
              <span class="flora-icon">🌵</span>
              <div class="flora-info">
                <span class="flora-name">Desert Guardian</span>
                <span class="flora-traits">Immortal · Thorned · Survivor</span>
                <span class="flora-obtain">Base species — arid extremes</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Mythic Species (1 Year)</h3>
          <div class="flora-grid">
            <div class="flora-card flora-mythic">
              <span class="flora-icon">🌹</span>
              <div class="flora-info">
                <span class="flora-name">Eternal Rose</span>
                <span class="flora-traits">Timeless · Perfect · Legendary</span>
                <span class="flora-obtain">Base species — ethereal only</span>
              </div>
            </div>
            <div class="flora-card flora-mythic flora-undiscovered">
              <span class="flora-icon">❓</span>
              <div class="flora-info">
                <span class="flora-name">???</span>
                <span class="flora-traits">Unknown traits</span>
                <span class="flora-obtain">Discovery method unknown</span>
              </div>
            </div>
            <div class="flora-card flora-mythic flora-undiscovered">
              <span class="flora-icon">❓</span>
              <div class="flora-info">
                <span class="flora-name">???</span>
                <span class="flora-traits">Unknown traits</span>
                <span class="flora-obtain">Discovery method unknown</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Insect Companions</h3>
          <p class="guide-text">Beneficial insects attracted to your garden. Each provides unique bonuses.</p>
          <div class="flora-grid">
            <div class="flora-card">
              <span class="flora-icon">🐝</span>
              <div class="flora-info">
                <span class="flora-name">Honeybee</span>
                <span class="flora-traits">Pollinator · Hardworking · Social</span>
                <span class="flora-obtain">Attracted by: 5+ flowering species</span>
                <span class="flora-bonus">+15% cross-pollination success</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🦋</span>
              <div class="flora-info">
                <span class="flora-name">Butterfly</span>
                <span class="flora-traits">Beautiful · Transformative · Rare</span>
                <span class="flora-obtain">Attracted by: Nectar-rich flowers</span>
                <span class="flora-bonus">+10% mutation chance</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🐞</span>
              <div class="flora-info">
                <span class="flora-name">Ladybug</span>
                <span class="flora-traits">Lucky · Protective · Garden friend</span>
                <span class="flora-obtain">Attracted by: Healthy ecosystem</span>
                <span class="flora-bonus">Failed → 25% retry chance</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🪲</span>
              <div class="flora-info">
                <span class="flora-name">Scarab Beetle</span>
                <span class="flora-traits">Ancient · Persistent · Recycler</span>
                <span class="flora-obtain">Attracted by: Arid/desert biomes</span>
                <span class="flora-bonus">+5% offspring quality</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🦗</span>
              <div class="flora-info">
                <span class="flora-name">Cricket</span>
                <span class="flora-traits">Musical · Nocturnal · Seasonal</span>
                <span class="flora-obtain">Attracted by: Twilight biome</span>
                <span class="flora-bonus">+Temporal gene expression</span>
              </div>
            </div>
            <div class="flora-card">
              <span class="flora-icon">🐛</span>
              <div class="flora-info">
                <span class="flora-name">Silkworm</span>
                <span class="flora-traits">Patient · Weaver · Valuable</span>
                <span class="flora-obtain">Attracted by: Mulberry species</span>
                <span class="flora-bonus">+Rare trait inheritance</span>
              </div>
            </div>
          </div>
        </section>
        </div>

        <!-- FAUNA TAB -->
        <div class="guide-panel" data-panel="fauna">
        <section class="guide-section">
          <h3 class="guide-section-title">Garden Creatures <span class="guide-draft">[BESTIARY v0.1]</span></h3>
          <p class="guide-intro">As your garden flourishes, it attracts wildlife. Each creature provides bonuses and adds life to your growing ecosystem. Rare creatures appear only in thriving gardens.</p>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Common Visitors</h3>
          <p class="guide-text">These friendly creatures appear in any healthy garden.</p>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🐦</span>
              <div class="fauna-info">
                <span class="fauna-name">Songbird</span>
                <span class="fauna-habitat">All biomes</span>
                <span class="fauna-bonus">Seeds spread faster between branches</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐿️</span>
              <div class="fauna-info">
                <span class="fauna-name">Squirrel</span>
                <span class="fauna-habitat">Evergreen, Temperate</span>
                <span class="fauna-bonus">Caches seeds for future seasons</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐇</span>
              <div class="fauna-info">
                <span class="fauna-name">Rabbit</span>
                <span class="fauna-habitat">Temperate, Coastal</span>
                <span class="fauna-bonus">+Luck for common species</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦔</span>
              <div class="fauna-info">
                <span class="fauna-name">Hedgehog</span>
                <span class="fauna-habitat">Temperate, Twilight</span>
                <span class="fauna-bonus">Protects against pest damage</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Biome-Specific Fauna</h3>

          <h4 class="fauna-biome-title">🌲 Evergreen Forest</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦌</span>
              <div class="fauna-info">
                <span class="fauna-name">Deer</span>
                <span class="fauna-bonus">Spreads seeds across great distances</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦉</span>
              <div class="fauna-info">
                <span class="fauna-name">Owl</span>
                <span class="fauna-bonus">+Nocturnal trait expression</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐻</span>
              <div class="fauna-info">
                <span class="fauna-name">Bear</span>
                <span class="fauna-bonus">Rare — grants +Hardy genes</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">🌴 Tropical Rainforest</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦜</span>
              <div class="fauna-info">
                <span class="fauna-name">Parrot</span>
                <span class="fauna-bonus">+25% rare species discovery</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐒</span>
              <div class="fauna-info">
                <span class="fauna-name">Monkey</span>
                <span class="fauna-bonus">Redistributes flowers between twigs</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦎</span>
              <div class="fauna-info">
                <span class="fauna-name">Chameleon</span>
                <span class="fauna-bonus">+Pigment gene variety</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">🏜️ Arid Desert</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦂</span>
              <div class="fauna-info">
                <span class="fauna-name">Scorpion</span>
                <span class="fauna-bonus">+Extremophile mutations</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐍</span>
              <div class="fauna-info">
                <span class="fauna-name">Sand Viper</span>
                <span class="fauna-bonus">Guards rare specimens</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦅</span>
              <div class="fauna-info">
                <span class="fauna-name">Eagle</span>
                <span class="fauna-bonus">Overview of entire garden (+vision)</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">🌊 Coastal Shores</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦀</span>
              <div class="fauna-info">
                <span class="fauna-name">Crab</span>
                <span class="fauna-bonus">+Aquatic trait inheritance</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐚</span>
              <div class="fauna-info">
                <span class="fauna-name">Hermit</span>
                <span class="fauna-bonus">Protects young seedlings</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐬</span>
              <div class="fauna-info">
                <span class="fauna-name">Dolphin</span>
                <span class="fauna-bonus">Rare — +Luck across all biomes</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">⛰️ Alpine Heights</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦙</span>
              <div class="fauna-info">
                <span class="fauna-name">Llama</span>
                <span class="fauna-bonus">Hardy seed transport</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦅</span>
              <div class="fauna-info">
                <span class="fauna-name">Condor</span>
                <span class="fauna-bonus">Cross-biome pollination</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐐</span>
              <div class="fauna-info">
                <span class="fauna-name">Mountain Goat</span>
                <span class="fauna-bonus">Access to impossible locations</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">🌙 Twilight Grove</h4>
          <div class="fauna-grid">
            <div class="fauna-card">
              <span class="fauna-icon">🦇</span>
              <div class="fauna-info">
                <span class="fauna-name">Bat</span>
                <span class="fauna-bonus">Nocturnal pollination</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🦊</span>
              <div class="fauna-info">
                <span class="fauna-name">Fox</span>
                <span class="fauna-bonus">Clever — reveals hidden traits</span>
              </div>
            </div>
            <div class="fauna-card">
              <span class="fauna-icon">🐺</span>
              <div class="fauna-info">
                <span class="fauna-name">Wolf</span>
                <span class="fauna-bonus">Pack bonus — multiple wolves multiply</span>
              </div>
            </div>
          </div>

          <h4 class="fauna-biome-title">✨ Ethereal Glade</h4>
          <div class="fauna-grid">
            <div class="fauna-card fauna-mythic">
              <span class="fauna-icon">🦄</span>
              <div class="fauna-info">
                <span class="fauna-name">Unicorn</span>
                <span class="fauna-bonus">+50% Mythic species chance</span>
              </div>
            </div>
            <div class="fauna-card fauna-mythic">
              <span class="fauna-icon">🐉</span>
              <div class="fauna-info">
                <span class="fauna-name">Dragon</span>
                <span class="fauna-bonus">Legendary — guards mythic blooms</span>
              </div>
            </div>
            <div class="fauna-card fauna-mythic">
              <span class="fauna-icon">🦚</span>
              <div class="fauna-info">
                <span class="fauna-name">Phoenix Peacock</span>
                <span class="fauna-bonus">Resurrects wilted flowers (1/season)</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Legendary Guardians</h3>
          <p class="guide-text">Ancient beings that appear only in the most flourishing gardens. Each grants powerful permanent bonuses.</p>
          <div class="fauna-grid">
            <div class="fauna-card fauna-legendary">
              <span class="fauna-icon">🐢</span>
              <div class="fauna-info">
                <span class="fauna-name">Ancient Tortoise</span>
                <span class="fauna-requirement">Requires: 100+ cultivated flowers</span>
                <span class="fauna-bonus">Time flows differently — seasons extended</span>
              </div>
            </div>
            <div class="fauna-card fauna-legendary">
              <span class="fauna-icon">🦢</span>
              <div class="fauna-info">
                <span class="fauna-name">Swan Queen</span>
                <span class="fauna-requirement">Requires: All common species discovered</span>
                <span class="fauna-bonus">All flowers gain +Grace trait</span>
              </div>
            </div>
            <div class="fauna-card fauna-legendary">
              <span class="fauna-icon">🐋</span>
              <div class="fauna-info">
                <span class="fauna-name">Sky Whale</span>
                <span class="fauna-requirement">Requires: Coastal + Ethereal mastery</span>
                <span class="fauna-bonus">Cross-biome breeding has no penalties</span>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-section-title">Creature Collection</h3>
          <div class="guide-luck-table">
            <div class="luck-row">
              <span class="luck-label">🐾 Common</span>
              <span class="luck-value">12 creatures (0/12)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">🦁 Biome-Specific</span>
              <span class="luck-value">24 creatures (0/24)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">✨ Mythic</span>
              <span class="luck-value">3 creatures (0/3)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">👑 Legendary</span>
              <span class="luck-value">3 guardians (0/3)</span>
            </div>
            <div class="luck-row">
              <span class="luck-label">📖 Total</span>
              <span class="luck-value">42 creatures to discover</span>
            </div>
          </div>
        </section>
        </div>

      </div>
    </div>
  `

  // Water journaling dialog
  const waterDialog = document.createElement('div')
  waterDialog.className = 'water-dialog hidden'
  waterDialog.innerHTML = `
    <div class="water-dialog-box">
      <div class="water-dialog-header">
        <h2 class="water-dialog-title">Water Sprout</h2>
        <button type="button" class="water-dialog-close">×</button>
      </div>
      <div class="water-dialog-body">
        <p class="water-dialog-sprout-title"></p>
        <p class="water-dialog-sprout-meta"></p>
        <textarea class="water-dialog-journal" placeholder="How is this sprout growing? Reflect on your progress..."></textarea>
        <div class="water-dialog-actions">
          <button type="button" class="water-dialog-cancel">Cancel</button>
          <button type="button" class="water-dialog-save">Pour</button>
        </div>
      </div>
    </div>
  `

  // Shine journaling dialog (for cultivated sprouts)
  const shineDialog = document.createElement('div')
  shineDialog.className = 'shine-dialog hidden'
  shineDialog.innerHTML = `
    <div class="shine-dialog-box">
      <div class="shine-dialog-header">
        <h2 class="shine-dialog-title">Shine Light</h2>
        <button type="button" class="shine-dialog-close">×</button>
      </div>
      <div class="shine-dialog-body">
        <p class="shine-dialog-sprout-title"></p>
        <p class="shine-dialog-sprout-meta"></p>
        <textarea class="shine-dialog-journal" placeholder="Reflect on this journey. What did you learn? Where might it lead next?"></textarea>
        <div class="shine-dialog-actions">
          <button type="button" class="shine-dialog-cancel">Cancel</button>
          <button type="button" class="shine-dialog-save">Radiate</button>
        </div>
      </div>
    </div>
  `

  shell.append(header, body, sproutsDialog, gardenGuideDialog, waterDialog, shineDialog, futureIdeasFolder)
  appRoot.append(shell)

  const elements: AppElements = {
    shell,
    header,
    canvas,
    trunk,
    guideLayer,
    sidePanel,
    focusMeta: sidePanel.querySelector<HTMLParagraphElement>('.focus-meta')!,
    focusTitle: sidePanel.querySelector<HTMLParagraphElement>('.focus-title')!,
    focusNote: sidePanel.querySelector<HTMLParagraphElement>('.focus-note')!,
    focusGoal: sidePanel.querySelector<HTMLParagraphElement>('.focus-goal')!,
    progressCount: sidePanel.querySelector<HTMLParagraphElement>('.progress-count')!,
    progressFill: sidePanel.querySelector<HTMLSpanElement>('.progress-fill')!,
    backToTrunkButton: sidePanel.querySelector<HTMLButtonElement>('.back-to-trunk')!,
    activeSproutsToggle: sidePanel.querySelector<HTMLButtonElement>('.sprouts-toggle[data-section="active"]')!,
    activeSproutsList: sidePanel.querySelector<HTMLDivElement>('.sprouts-list[data-section="active"]')!,
    cultivatedSproutsToggle: sidePanel.querySelector<HTMLButtonElement>('.sprouts-toggle[data-section="cultivated"]')!,
    cultivatedSproutsList: sidePanel.querySelector<HTMLDivElement>('.sprouts-list[data-section="cultivated"]')!,
    statusMessage: sidePanel.querySelector<HTMLParagraphElement>('.status-message')!,
    statusMeta: sidePanel.querySelector<HTMLParagraphElement>('.status-meta')!,
    importInput,
    debugCheckbox,
    debugClockBtn,
    debugSoilResetBtn,
    debugClearSproutsBtn,
    debugClockOffset,
    sproutsDialog,
    sproutsDialogContent: sproutsDialog.querySelector<HTMLDivElement>('.sprouts-dialog-content')!,
    sproutsDialogClose: sproutsDialog.querySelector<HTMLButtonElement>('.sprouts-dialog-close')!,
    gardenGuideDialog,
    gardenGuideClose: gardenGuideDialog.querySelector<HTMLButtonElement>('.garden-guide-close')!,
    waterDialog,
    waterDialogTitle: waterDialog.querySelector<HTMLParagraphElement>('.water-dialog-sprout-title')!,
    waterDialogMeta: waterDialog.querySelector<HTMLParagraphElement>('.water-dialog-sprout-meta')!,
    waterDialogJournal: waterDialog.querySelector<HTMLTextAreaElement>('.water-dialog-journal')!,
    waterDialogClose: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-close')!,
    waterDialogCancel: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-cancel')!,
    waterDialogSave: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-save')!,
    soilMeterFill: soilFill,
    soilMeterValue: soilValue,
    waterMeterFill: waterFill,
    waterMeterValue: waterValue,
    sunMeterFill: sunFill,
    sunMeterValue: sunValue,
    shineDialog,
    shineDialogTitle: shineDialog.querySelector<HTMLParagraphElement>('.shine-dialog-sprout-title')!,
    shineDialogMeta: shineDialog.querySelector<HTMLParagraphElement>('.shine-dialog-sprout-meta')!,
    shineDialogJournal: shineDialog.querySelector<HTMLTextAreaElement>('.shine-dialog-journal')!,
    shineDialogClose: shineDialog.querySelector<HTMLButtonElement>('.shine-dialog-close')!,
    shineDialogCancel: shineDialog.querySelector<HTMLButtonElement>('.shine-dialog-cancel')!,
    shineDialogSave: shineDialog.querySelector<HTMLButtonElement>('.shine-dialog-save')!,
  }

  // Wire up button handlers (will be connected to features in main.ts)
  settingsButton.dataset.action = 'settings'
  exportButton.dataset.action = 'export'
  showSproutsButton.dataset.action = 'show-sprouts'

  return {
    elements,
    branchGroups,
    allNodes,
    nodeLookup,
  }
}

function initializeNode(
  element: HTMLButtonElement,
  placeholder: string,
  nodeLookup: Map<string, HTMLButtonElement>,
  onNodeClick: NodeClickHandler
): void {
  const nodeId = element.dataset.nodeId
  if (nodeId) {
    nodeLookup.set(nodeId, element)
  }
  element.dataset.placeholder = placeholder
  syncNode(element)

  element.addEventListener('click', (event) => {
    event.stopPropagation()
    if (nodeId) {
      onNodeClick(element, nodeId, placeholder)
    }
  })
}

function getBloomDelay(twigIndex: number): number {
  const baseDelay = 60
  const delayStep = 40
  const distanceFromFront = Math.min(twigIndex, TWIG_COUNT - twigIndex)
  return baseDelay + distanceFromFront * delayStep
}

export function getActionButtons(shell: HTMLDivElement): {
  settingsButton: HTMLButtonElement
  exportButton: HTMLButtonElement
  showSproutsButton: HTMLButtonElement
  encyclopediaButtons: HTMLButtonElement[]
} {
  return {
    settingsButton: shell.querySelector<HTMLButtonElement>('[data-action="settings"]')!,
    exportButton: shell.querySelector<HTMLButtonElement>('[data-action="export"]')!,
    showSproutsButton: shell.querySelector<HTMLButtonElement>('[data-action="show-sprouts"]')!,
    encyclopediaButtons: Array.from(shell.querySelectorAll<HTMLButtonElement>('.encyclopedia-btn')),
  }
}
