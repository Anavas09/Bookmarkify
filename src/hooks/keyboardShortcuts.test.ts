import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleShortcut, isEditableTarget, type ShortcutActions } from './keyboardShortcuts.ts'

function makeActions() {
  const moveFocus = vi.fn<(d: number) => void>()
  const toggleMark = vi.fn<() => void>()
  const extendMark = vi.fn<() => void>()
  const actions: ShortcutActions = { moveFocus, toggleMark, extendMark }
  return { actions, moveFocus, toggleMark, extendMark }
}

describe('handleShortcut', () => {
  let actions: ShortcutActions
  let moveFocus: ReturnType<typeof vi.fn>
  let toggleMark: ReturnType<typeof vi.fn>
  let extendMark: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ actions, moveFocus, toggleMark, extendMark } = makeActions())
  })

  it('j moves focus forward', () => {
    expect(handleShortcut('j', false, actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(1)
  })

  it('ArrowRight moves focus forward', () => {
    expect(handleShortcut('ArrowRight', false, actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(1)
  })

  it('k moves focus backward', () => {
    expect(handleShortcut('k', false, actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(-1)
  })

  it('ArrowLeft moves focus backward', () => {
    expect(handleShortcut('ArrowLeft', false, actions)).toBe(true)
    expect(moveFocus).toHaveBeenCalledWith(-1)
  })

  it('space toggles the mark', () => {
    expect(handleShortcut(' ', false, actions)).toBe(true)
    expect(toggleMark).toHaveBeenCalledOnce()
    expect(extendMark).not.toHaveBeenCalled()
    expect(moveFocus).not.toHaveBeenCalled()
  })

  it('shift+space extends the mark from the anchor', () => {
    expect(handleShortcut(' ', true, actions)).toBe(true)
    expect(extendMark).toHaveBeenCalledOnce()
    expect(toggleMark).not.toHaveBeenCalled()
  })

  it('unhandled keys return false and trigger nothing', () => {
    expect(handleShortcut('Enter', false, actions)).toBe(false)
    expect(handleShortcut('a', false, actions)).toBe(false)
    expect(handleShortcut('x', false, actions)).toBe(false)
    expect(handleShortcut('u', false, actions)).toBe(false)
    expect(handleShortcut('ArrowUp', false, actions)).toBe(false)
    expect(handleShortcut('ArrowDown', false, actions)).toBe(false)
    expect(moveFocus).not.toHaveBeenCalled()
    expect(toggleMark).not.toHaveBeenCalled()
    expect(extendMark).not.toHaveBeenCalled()
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
