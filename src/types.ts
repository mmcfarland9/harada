export type BranchGroup = {
  group: HTMLDivElement
  branch: HTMLButtonElement
  twigs: HTMLButtonElement[]
}

// Sprout types (replacing goal system)
export type SproutSeason = '1w' | '2w' | '1m' | '3m' | '6m' | '1y'
export type SproutState = 'draft' | 'active' | 'completed' | 'failed'
export type SproutEnvironment = 'fertile' | 'firm' | 'barren'

// Water entry - journal entries when watering a sprout
export type WaterEntry = {
  timestamp: string
  content: string
  prompt?: string
}

// Leaf - a saga/trajectory of related sprouts (identity derived from its sprouts)
export type LeafStatus = 'active' | 'dormant' | 'archived'

export type Leaf = {
  id: string
  status: LeafStatus
  createdAt: string
}

export type Sprout = {
  id: string
  title: string
  season: SproutSeason
  environment: SproutEnvironment
  state: SproutState
  soilCost: number
  createdAt: string
  activatedAt?: string
  endDate?: string
  result?: number // 1-5 scale
  reflection?: string
  completedAt?: string
  // Leaf association
  leafId?: string
  waterEntries?: WaterEntry[]
  graftedFromId?: string
}

// Soil system - represents focus/energy capacity
export type SoilState = {
  available: number
  capacity: number
}

// Water system - represents daily/recurring attention
export type WaterState = {
  available: number
  capacity: number
}

// Legacy goal type (for migration)
export type GoalType = 'binary' | 'continuous'

export type NodeData = {
  label: string
  note: string
  // Sprout and leaf data
  sprouts?: Sprout[]
  leaves?: Leaf[]
  // Legacy fields (for migration, will be converted to sprouts)
  goalType?: GoalType
  goalValue?: number
  goalTitle?: string
}

export type EditorApi = {
  container: HTMLDivElement
  open: (target: HTMLButtonElement, placeholder: string) => void
  reposition: (target: HTMLButtonElement) => void
  close: () => void
}

export type TwigViewApi = {
  container: HTMLDivElement
  open: (twigNode: HTMLButtonElement) => void
  close: () => void
  isOpen: () => boolean
}

export type LeafViewApi = {
  container: HTMLDivElement
  open: (leafId: string, twigId: string, branchIndex: number) => void
  close: () => void
  isOpen: () => boolean
}

export type ViewMode = 'overview' | 'branch' | 'twig' | 'leaf'

export type AppElements = {
  shell: HTMLDivElement
  header: HTMLElement
  canvas: HTMLDivElement
  trunk: HTMLButtonElement
  guideLayer: HTMLDivElement
  sidePanel: HTMLElement
  focusMeta: HTMLParagraphElement
  focusTitle: HTMLParagraphElement
  focusNote: HTMLParagraphElement
  focusGoal: HTMLParagraphElement
  progressCount: HTMLParagraphElement
  progressFill: HTMLSpanElement
  backToTrunkButton: HTMLButtonElement
  activeSproutsToggle: HTMLButtonElement
  activeSproutsList: HTMLDivElement
  cultivatedSproutsToggle: HTMLButtonElement
  cultivatedSproutsList: HTMLDivElement
  statusMessage: HTMLParagraphElement
  statusMeta: HTMLParagraphElement
  importInput: HTMLInputElement
  debugCheckbox: HTMLInputElement
  debugClockBtn: HTMLButtonElement
  debugSoilResetBtn: HTMLButtonElement
  debugClearSproutsBtn: HTMLButtonElement
  debugClockOffset: HTMLSpanElement
  sproutsDialog: HTMLDivElement
  sproutsDialogContent: HTMLDivElement
  sproutsDialogClose: HTMLButtonElement
  gardenGuideDialog: HTMLDivElement
  gardenGuideClose: HTMLButtonElement
  waterDialog: HTMLDivElement
  waterDialogTitle: HTMLParagraphElement
  waterDialogMeta: HTMLParagraphElement
  waterDialogJournal: HTMLTextAreaElement
  waterDialogClose: HTMLButtonElement
  waterDialogCancel: HTMLButtonElement
  waterDialogSave: HTMLButtonElement
  soilMeterFill: HTMLDivElement
  soilMeterValue: HTMLSpanElement
  waterMeterFill: HTMLDivElement
  waterMeterValue: HTMLSpanElement
}

export type AppContext = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
  editor: EditorApi
  twigView?: TwigViewApi
  leafView?: LeafViewApi
}
