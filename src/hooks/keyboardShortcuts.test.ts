import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleShortcut, isEditableTarget, type ShortcutActions } from './keyboardShortcuts.ts'

const NONE = { mod: false, alt: false, shift: false }
const MOD = { mod: true, alt: false, shift: false }
const MOD_SHIFT = { mod: true, alt: false, shift: true }

function makeActions() {
  const deleteSelected = vi.fn<() => void>()
  const clearSelection = vi.fn<() => void>()
  const selectAll = vi.fn<() => void>()
  const undo = vi.fn<() => void>()
  const actions: ShortcutActions = { deleteSelected, clearSelection, selectAll, undo }
  return { actions, deleteSelected, clearSelection, selectAll, undo }
}

describe('handleShortcut', () => {
  let actions: ShortcutActions
  let deleteSelected: ReturnType<typeof vi.fn>
  let clearSelection: ReturnType<typeof vi.fn>
  let selectAll: ReturnType<typeof vi.fn>
  let undo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ actions, deleteSelected, clearSelection, selectAll, undo } = makeActions())
  })

  it('Delete deletes the selection', () => {
    expect(handleShortcut('Delete', NONE, actions)).toBe(true)
    expect(deleteSelected).toHaveBeenCalledOnce()
  })

  it('Backspace deletes the selection (Mac "delete" key)', () => {
    expect(handleShortcut('Backspace', NONE, actions)).toBe(true)
    expect(deleteSelected).toHaveBeenCalledOnce()
  })

  it('Escape clears the selection', () => {
    expect(handleShortcut('Escape', NONE, actions)).toBe(true)
    expect(clearSelection).toHaveBeenCalledOnce()
  })

  it('Ctrl/Cmd+A selects every visible bookmark', () => {
    expect(handleShortcut('a', MOD, actions)).toBe(true)
    expect(handleShortcut('A', MOD, actions)).toBe(true)
    expect(selectAll).toHaveBeenCalledTimes(2)
  })

  it('plain "a" does nothing', () => {
    expect(handleShortcut('a', NONE, actions)).toBe(false)
    expect(selectAll).not.toHaveBeenCalled()
  })

  it('Ctrl/Cmd+Z undoes the last delete (also with Caps Lock on)', () => {
    expect(handleShortcut('z', MOD, actions)).toBe(true)
    expect(handleShortcut('Z', MOD, actions)).toBe(true)
    expect(undo).toHaveBeenCalledTimes(2)
  })

  it('Ctrl/Cmd+Shift+Z (redo elsewhere) and plain "z" do nothing', () => {
    expect(handleShortcut('Z', MOD_SHIFT, actions)).toBe(false)
    expect(handleShortcut('z', NONE, actions)).toBe(false)
    expect(undo).not.toHaveBeenCalled()
  })

  it('ignores other modifier combos and Alt', () => {
    expect(handleShortcut('Delete', MOD, actions)).toBe(false)
    expect(handleShortcut('c', MOD, actions)).toBe(false)
    expect(handleShortcut('Delete', { ...NONE, alt: true }, actions)).toBe(false)
    expect(handleShortcut('z', { ...MOD, alt: true }, actions)).toBe(false)
    expect(deleteSelected).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })

  it('the old triage keys are gone', () => {
    for (const key of ['j', 'k', 'x', 'u', ' ', 'ArrowLeft', 'ArrowRight']) {
      expect(handleShortcut(key, NONE, actions)).toBe(false)
    }
    expect(deleteSelected).not.toHaveBeenCalled()
    expect(clearSelection).not.toHaveBeenCalled()
    expect(selectAll).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
  })
})

describe('isEditableTarget', () => {
  it('returns true for input elements', () => {
    const el = document.createElement('input')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for textareas', () => {
    const el = document.createElement('textarea')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for selects', () => {
    const el = document.createElement('select')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for contenteditable elements', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns true for contenteditable="" (empty attribute)', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', '')
    expect(isEditableTarget(el)).toBe(true)
  })

  it('returns false for contenteditable="false"', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'false')
    expect(isEditableTarget(el)).toBe(false)
  })

  it('returns false for regular elements', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false)
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(document.createElement('a'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false)
  })
})
