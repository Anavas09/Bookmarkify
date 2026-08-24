import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleShortcut, isEditableTarget, type ShortcutActions } from './keyboardShortcuts.ts'

function makeActions() {
  const moveFocus = vi.fn<(d: number) => void>()
  const markAndAdvance = vi.fn<() => void>()
  const unmark = vi.fn<() => void>()
  const actions: ShortcutActions = { moveFocus, markAndAdvance, unmark }
  return { actions, moveFocus, markAndAdvance, unmark }
}

describe('handleShortcut', () => {
  let actions: ShortcutActions
  let moveFocus: ReturnType<typeof vi.fn>
  let markAndAdvance: ReturnType<typeof vi.fn>
  let unmark: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ actions, moveFocus, markAndAdvance, unmark } = makeActions())
  })

  it('j moves focus forward', () => {
    expect(handleShortcut('j', actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(1)
  })

  it('ArrowDown moves focus forward', () => {
    expect(handleShortcut('ArrowDown', actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(1)
  })

  it('k moves focus backward', () => {
    expect(handleShortcut('k', actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(-1)
  })

  it('ArrowUp moves focus backward', () => {
    expect(handleShortcut('ArrowUp', actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(-1)
  })

  it('x marks and advances', () => {
    expect(handleShortcut('x', actions)).toBe(true)
    expect(markAndAdvance).toHaveBeenCalledOnce()
  })

  it('u unmarks without moving', () => {
    expect(handleShortcut('u', actions)).toBe(true)
    expect(unmark).toHaveBeenCalledOnce()
    expect(moveFocus).not.toHaveBeenCalled()
  })

  it('unhandled keys return false and trigger nothing', () => {
    expect(handleShortcut('Enter', actions)).toBe(false)
    expect(handleShortcut('a', actions)).toBe(false)
    expect(handleShortcut(' ', actions)).toBe(false)
    expect(moveFocus).not.toHaveBeenCalled()
    expect(markAndAdvance).not.toHaveBeenCalled()
    expect(unmark).not.toHaveBeenCalled()
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
