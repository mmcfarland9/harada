export type BranchNode = {
  wrapper: HTMLDivElement
  main: HTMLButtonElement
  subs: HTMLButtonElement[]
}

export type CircleData = {
  label: string
  note: string
}

export type EditorApi = {
  container: HTMLDivElement
  open: (target: HTMLButtonElement, placeholder: string) => void
  reposition: (target: HTMLButtonElement) => void
  close: () => void
}

export type BranchProgressItem = {
  button: HTMLButtonElement
  label: HTMLSpanElement
  count: HTMLSpanElement
  fill: HTMLSpanElement
  mainCircle: HTMLButtonElement
  index: number
}

export type ViewMode = 'overview' | 'branch'

export type AppElements = {
  shell: HTMLDivElement
  header: HTMLElement
  canvas: HTMLDivElement
  center: HTMLButtonElement
  guideLayer: HTMLDivElement
  sidePanel: HTMLElement
  focusMeta: HTMLParagraphElement
  focusTitle: HTMLParagraphElement
  focusNote: HTMLParagraphElement
  progressCount: HTMLParagraphElement
  progressFill: HTMLSpanElement
  nextButton: HTMLButtonElement
  branchProgress: HTMLDivElement
  statusMessage: HTMLParagraphElement
  statusMeta: HTMLParagraphElement
  importInput: HTMLInputElement
  debugCheckbox: HTMLInputElement
}

export type AppContext = {
  elements: AppElements
  branches: BranchNode[]
  allCircles: HTMLButtonElement[]
  circleLookup: Map<string, HTMLButtonElement>
  branchProgressItems: BranchProgressItem[]
  editor: EditorApi
}
