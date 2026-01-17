# Button Uniformity Design

**Goal:** Standardize all action buttons with consistent positioning, sizing, and semantic coloring.

---

## Positioning System

Every button container uses a **split layout**:

```
┌─────────────────────────────────────┐
│                                     │
│  [Passive]              [Progress]  │
│   (left)                  (right)   │
└─────────────────────────────────────┘
```

**Left side (passive actions):**
- Cancel, Water, Shine
- Actions that nurture or retreat

**Right side (progress actions):**
- Plant, Graft, Harvest, Confirm
- Actions that move things forward

**Single-button cases:** Button goes to its designated side based on type.

**CSS pattern for containers:**
```css
.action-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## Color System

| Action | Side | Color Token | Style |
|--------|------|-------------|-------|
| Cancel | Left | `--ink-faint` | Outline (neutral gray) |
| Water | Left | `--water` | Outline (steelblue) |
| Shine | Left | `--sun` | Outline (gold) |
| Plant | Right | `--twig` | Subtle fill (green) |
| Graft | Right | `--twig` | Subtle fill (green) |
| Harvest | Right | `--twig` | Subtle fill (green) |
| Uproot | Right | `--error-tone` | Subtle fill (red) |

**Treatment by side:**
- **Left (passive):** Outline - colored border, colored text, transparent background
- **Right (progress):** Subtle fill - colored border, colored text, ~15% opacity tinted background

---

## Unified Button Styles

All action buttons share standard sizing:
- Padding: `var(--space-2) var(--space-3)` (8px 12px)
- Font: `var(--font-ascii)`, `var(--text-sm)`
- Text transform: uppercase with 0.03em letter-spacing

**CSS Structure:**
```css
/* Base for all action buttons */
.action-btn {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-ascii);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid;
  cursor: pointer;
  transition: all 150ms ease;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Left side - outline style */
.action-btn-passive {
  background: transparent;
}
.action-btn-passive:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
}

/* Right side - subtle fill style */
.action-btn-progress {
  background: rgba(var(--btn-rgb), 0.15);
}
.action-btn-progress:hover:not(:disabled) {
  background: rgba(var(--btn-rgb), 0.25);
}

/* Color variants */
.action-btn-neutral { border-color: var(--border); color: var(--ink-faint); }
.action-btn-water   { border-color: var(--water); color: var(--water); --btn-rgb: 70, 130, 180; }
.action-btn-sun     { border-color: var(--sun); color: var(--sun); --btn-rgb: 212, 160, 0; }
.action-btn-twig    { border-color: var(--twig); color: var(--twig); --btn-rgb: 58, 107, 74; }
.action-btn-error   { border-color: var(--error-tone); color: var(--error-tone); --btn-rgb: 138, 74, 58; }
```

---

## Scope of Changes

### Containers to Update

| Container | File | Current | New Layout |
|-----------|------|---------|------------|
| `.sprout-card-footer` | twig-view.ts | Right-aligned | Shine(L) / Graft(R) |
| `.sprout-complete-section` | twig-view.ts | Single button | Harvest (R) |
| `.water-dialog-actions` | dom-builder.ts | Right-aligned | Cancel(L) / Pour(R) |
| `.shine-dialog-actions` | dom-builder.ts | Right-aligned | Cancel(L) / Radiate(R) |
| `.confirm-dialog-actions` | twig-view.ts | Centered | Cancel(L) / Uproot(R) |
| `.graft-actions` | leaf-view.ts | Left-aligned | Cancel(L) / Plant(R) |
| Draft form | twig-view.ts | Left-aligned | Plant (R) |

### Out of Scope

- Header buttons (Settings, Import, Export, Show Sprouts)
- Navigation links
- Period selector buttons
- Resource meter interactions

---

## Button Inventory

All buttons migrating to new system:

**Passive (left, outline):**
- Cancel (all dialogs) → `.action-btn .action-btn-passive .action-btn-neutral`
- Water → `.action-btn .action-btn-passive .action-btn-water`
- Shine → `.action-btn .action-btn-passive .action-btn-sun`

**Progress (right, subtle fill):**
- Plant → `.action-btn .action-btn-progress .action-btn-twig`
- Graft → `.action-btn .action-btn-progress .action-btn-twig`
- Harvest → `.action-btn .action-btn-progress .action-btn-twig`
- Pour → `.action-btn .action-btn-progress .action-btn-water`
- Radiate → `.action-btn .action-btn-progress .action-btn-sun`
- Uproot → `.action-btn .action-btn-progress .action-btn-error`
