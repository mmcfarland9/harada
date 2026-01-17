# Button Uniformity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all action buttons with split positioning (passive left, progress right), uniform sizing, and semantic coloring.

**Architecture:** Add a unified `.action-btn` CSS system with position modifiers (`.action-btn-passive`, `.action-btn-progress`) and color variants. Update each button container to use `justify-content: space-between` for split layout. Migrate existing buttons to new classes.

**Tech Stack:** Vanilla CSS, vanilla TypeScript, Vite

---

## Task 1: Add Unified Button CSS System

**Files:**
- Modify: `src/styles/components.css:148-220` (after existing .btn system)

**Step 1: Add the action button base and modifier classes**

Add after the existing `.btn` system (around line 220):

```css
/* === Action Button System (unified) ===
 * Split layout: passive actions left, progress actions right
 * All action buttons use same sizing for uniformity
 */

.action-btn {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-ascii);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1;
  border: 1px solid;
  cursor: pointer;
  transition: all 150ms ease;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Passive (left side) - outline style */
.action-btn-passive {
  background: transparent;
}

.action-btn-passive:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
}

/* Progress (right side) - subtle fill style */
.action-btn-progress {
  background: rgba(var(--btn-rgb), 0.15);
}

.action-btn-progress:hover:not(:disabled) {
  background: rgba(var(--btn-rgb), 0.25);
}

/* Color variants */
.action-btn-neutral {
  border-color: var(--border);
  color: var(--ink-faint);
  --btn-rgb: 0, 0, 0;
}

.action-btn-water {
  border-color: var(--water);
  color: var(--water);
  --btn-rgb: 70, 130, 180;
}

.action-btn-sun {
  border-color: var(--sun);
  color: var(--sun);
  --btn-rgb: 212, 160, 0;
}

.action-btn-twig {
  border-color: var(--twig);
  color: var(--twig);
  --btn-rgb: 58, 107, 74;
}

.action-btn-error {
  border-color: var(--error-tone);
  color: var(--error-tone);
  --btn-rgb: 138, 74, 58;
}

/* Container for split button layout */
.action-btn-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

/* When only one button, position by type */
.action-btn-group-left {
  justify-content: flex-start;
}

.action-btn-group-right {
  justify-content: flex-end;
}
```

**Step 2: Verify no build errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: add unified action button CSS system"
```

---

## Task 2: Update Water Dialog Buttons

**Files:**
- Modify: `src/ui/dom-builder.ts:1734-1751`
- Modify: `src/styles/components.css:2535-2570` (water dialog actions)

**Step 1: Update water dialog HTML in dom-builder.ts**

Find the water dialog creation (around line 1745) and update the button classes:

```typescript
// Change from:
<button type="button" class="water-dialog-cancel">Cancel</button>
<button type="button" class="water-dialog-save">Pour</button>

// To:
<button type="button" class="action-btn action-btn-passive action-btn-neutral water-dialog-cancel">Cancel</button>
<button type="button" class="action-btn action-btn-progress action-btn-water water-dialog-save">Pour</button>
```

**Step 2: Update water dialog actions container CSS**

Find `.water-dialog-actions` in components.css and update:

```css
.water-dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}
```

**Step 3: Remove redundant button styles**

Remove the old `.water-dialog-cancel` and `.water-dialog-save` button styling (keep only layout-specific overrides if any).

**Step 4: Verify visually**

Run: `npm run dev`
Open a water dialog and verify:
- Cancel is on the left, outline style, gray
- Pour is on the right, subtle blue fill
- Both have same padding

**Step 5: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/components.css
git commit -m "refactor: migrate water dialog to unified button system"
```

---

## Task 3: Update Shine Dialog Buttons

**Files:**
- Modify: `src/ui/dom-builder.ts:1754-1772`
- Modify: `src/styles/components.css:2680-2725` (shine dialog actions)

**Step 1: Update shine dialog HTML in dom-builder.ts**

Find the shine dialog creation and update button classes:

```typescript
// Change from:
<button type="button" class="shine-dialog-cancel">Cancel</button>
<button type="button" class="shine-dialog-save">Radiate</button>

// To:
<button type="button" class="action-btn action-btn-passive action-btn-neutral shine-dialog-cancel">Cancel</button>
<button type="button" class="action-btn action-btn-progress action-btn-sun shine-dialog-save">Radiate</button>
```

**Step 2: Update shine dialog actions container CSS**

```css
.shine-dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}
```

**Step 3: Remove redundant button styles**

Remove old `.shine-dialog-cancel` and `.shine-dialog-save` button styling.

**Step 4: Verify visually**

Run: `npm run dev`
Open a shine dialog and verify:
- Cancel on left, gray outline
- Radiate on right, subtle gold/yellow fill

**Step 5: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/components.css
git commit -m "refactor: migrate shine dialog to unified button system"
```

---

## Task 4: Update Confirm Dialog Buttons

**Files:**
- Modify: `src/ui/twig-view.ts:173-180`
- Modify: `src/styles/components.css` (confirm dialog actions)

**Step 1: Find and update confirm dialog HTML in twig-view.ts**

Search for `confirm-dialog-actions` and update:

```typescript
// Change from:
<button type="button" class="confirm-dialog-cancel">Cancel</button>
<button type="button" class="confirm-dialog-confirm">Uproot</button>

// To:
<button type="button" class="action-btn action-btn-passive action-btn-neutral confirm-dialog-cancel">Cancel</button>
<button type="button" class="action-btn action-btn-progress action-btn-error confirm-dialog-confirm">Uproot</button>
```

**Step 2: Update confirm dialog actions container CSS**

```css
.confirm-dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}
```

**Step 3: Remove redundant button styles**

Remove old `.confirm-dialog-cancel` and `.confirm-dialog-confirm` styling.

**Step 4: Verify visually**

Run: `npm run dev`
Trigger a confirm dialog (try to delete a sprout) and verify:
- Cancel on left, gray outline
- Uproot on right, subtle red fill

**Step 5: Commit**

```bash
git add src/ui/twig-view.ts src/styles/components.css
git commit -m "refactor: migrate confirm dialog to unified button system"
```

---

## Task 5: Update Sprout Card Footer Buttons

**Files:**
- Modify: `src/ui/twig-view.ts:308-312`
- Modify: `src/styles/components.css:845-885` (sprout action buttons)

**Step 1: Update sprout card footer HTML in twig-view.ts**

Find the cultivated sprout card footer creation and update:

```typescript
// Change from:
<div class="sprout-card-footer">
  <button type="button" class="sprout-action-btn sprout-shine-btn">Shine</button>
  <button type="button" class="sprout-action-btn sprout-graft-btn">Graft</button>
</div>

// To:
<div class="sprout-card-footer action-btn-group">
  <button type="button" class="action-btn action-btn-passive action-btn-sun sprout-shine-btn">Shine</button>
  <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-graft-btn">Graft</button>
</div>
```

**Step 2: Update sprout card footer CSS**

```css
.sprout-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
}
```

**Step 3: Verify visually**

Run: `npm run dev`
View a cultivated sprout card and verify:
- Shine on left, gold outline
- Graft on right, green subtle fill

**Step 4: Commit**

```bash
git add src/ui/twig-view.ts src/styles/components.css
git commit -m "refactor: migrate sprout card footer to unified button system"
```

---

## Task 6: Update Harvest/Complete Button

**Files:**
- Modify: `src/ui/twig-view.ts` (sprout complete section)
- Modify: `src/styles/components.css:1080-1085`

**Step 1: Update harvest button HTML in twig-view.ts**

Find the complete section and update:

```typescript
// Change from:
<button type="button" class="sprout-action-btn is-primary sprout-complete-btn">Harvest</button>

// To:
<div class="action-btn-group action-btn-group-right">
  <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-complete-btn">Harvest</button>
</div>
```

**Step 2: Verify visually**

Run: `npm run dev`
View a ready-to-harvest sprout and verify:
- Harvest button on right, green subtle fill

**Step 3: Commit**

```bash
git add src/ui/twig-view.ts src/styles/components.css
git commit -m "refactor: migrate harvest button to unified button system"
```

---

## Task 7: Update Graft Form Buttons

**Files:**
- Modify: `src/ui/leaf-view.ts:309-331`
- Modify: `src/styles/components.css:3002-3130` (graft form)

**Step 1: Update graft form HTML in leaf-view.ts**

Find the graft form actions and update:

```typescript
// Change from:
<div class="graft-actions">
  <button type="button" class="graft-cancel-btn">Cancel</button>
  <button type="button" class="graft-confirm-btn" disabled>Plant</button>
</div>

// To:
<div class="graft-actions action-btn-group">
  <button type="button" class="action-btn action-btn-passive action-btn-neutral graft-cancel-btn">Cancel</button>
  <button type="button" class="action-btn action-btn-progress action-btn-twig graft-confirm-btn" disabled>Plant</button>
</div>
```

**Step 2: Update graft actions container CSS**

```css
.graft-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

**Step 3: Remove redundant graft button styles**

Remove old `.graft-cancel-btn` and `.graft-confirm-btn` styling.

**Step 4: Verify visually**

Run: `npm run dev`
Open a graft form in leaf view and verify:
- Cancel on left, gray outline
- Plant on right, green subtle fill

**Step 5: Commit**

```bash
git add src/ui/leaf-view.ts src/styles/components.css
git commit -m "refactor: migrate graft form to unified button system"
```

---

## Task 8: Update Draft Form Plant Button

**Files:**
- Modify: `src/ui/twig-view.ts` (draft form)
- Modify: `src/styles/components.css:840-843`

**Step 1: Update plant button HTML in twig-view.ts**

Find the draft form plant button and update:

```typescript
// Change from:
<button type="button" class="sprout-action-btn sprout-set-btn" disabled>Plant</button>

// To:
<div class="action-btn-group action-btn-group-right">
  <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-set-btn" disabled>Plant</button>
</div>
```

**Step 2: Verify visually**

Run: `npm run dev`
Open the draft sprout form and verify:
- Plant button on right, green subtle fill

**Step 3: Commit**

```bash
git add src/ui/twig-view.ts src/styles/components.css
git commit -m "refactor: migrate draft form plant button to unified button system"
```

---

## Task 9: Update Sidebar Water Button

**Files:**
- Modify: `src/ui/twig-view.ts` (sprout item in sidebar)
- Modify: `src/styles/components.css:2382-2413` (sprout water button)

**Step 1: Update sidebar water button HTML**

Find the sprout item water button and update:

```typescript
// Change from:
<button type="button" class="sprout-action-btn sprout-water-btn">Water</button>

// To:
<button type="button" class="action-btn action-btn-passive action-btn-water sprout-water-btn">Water</button>
```

**Step 2: Keep the hover-reveal behavior**

Update the CSS to maintain the opacity reveal on hover:

```css
.sprout-water-btn {
  opacity: 0;
  transition: opacity 100ms ease, background 100ms ease;
}

.sprout-item:hover .sprout-water-btn {
  opacity: 1;
}
```

**Step 3: Verify visually**

Run: `npm run dev`
Hover over a sprout in the sidebar and verify:
- Water button appears, blue outline style

**Step 4: Commit**

```bash
git add src/ui/twig-view.ts src/styles/components.css
git commit -m "refactor: migrate sidebar water button to unified button system"
```

---

## Task 10: Cleanup Old Button Styles

**Files:**
- Modify: `src/styles/components.css`

**Step 1: Search for orphaned styles**

Search for and remove unused button classes:
- `.sprout-action-btn` base styles (if no longer used)
- Old dialog button styles that were replaced
- Any `.is-primary` modifier if no longer needed

**Step 2: Verify no regressions**

Run: `npm run dev`
Click through entire app:
- All dialogs (water, shine, confirm)
- All sprout cards (growing, ready, cultivated)
- Draft form
- Graft form in leaf view
- Sidebar sprout list

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/styles/components.css
git commit -m "chore: remove orphaned button styles after migration"
```

---

## Summary

| Task | Focus | Key Files |
|------|-------|-----------|
| 1 | Add unified CSS system | components.css |
| 2 | Water dialog | dom-builder.ts, components.css |
| 3 | Shine dialog | dom-builder.ts, components.css |
| 4 | Confirm dialog | twig-view.ts, components.css |
| 5 | Sprout card footer | twig-view.ts, components.css |
| 6 | Harvest button | twig-view.ts, components.css |
| 7 | Graft form | leaf-view.ts, components.css |
| 8 | Draft form plant | twig-view.ts, components.css |
| 9 | Sidebar water | twig-view.ts, components.css |
| 10 | Cleanup | components.css |
