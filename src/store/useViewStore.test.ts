import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readStoredView, useViewStore, VIEW_STORAGE_KEY } from './useViewStore.ts'

beforeEach(() => {
  localStorage.clear()
  useViewStore.setState({ view: 'grid' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readStoredView', () => {
  it('is grid when nothing is stored', () => {
    expect(readStoredView()).toBe('grid')
  })

  it('is list when list is stored', () => {
    localStorage.setItem(VIEW_STORAGE_KEY, 'list')
    expect(readStoredView()).toBe('list')
  })

  it.each(['grid', '', 'LIST', 'banana'])('is grid when %j is stored', value => {
    localStorage.setItem(VIEW_STORAGE_KEY, value)
    expect(readStoredView()).toBe('grid')
  })

  it('is grid when reading the storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredView()).toBe('grid')
  })
})

describe('setView', () => {
  it('updates the state and stores the choice', () => {
    useViewStore.getState().setView('list')
    expect(useViewStore.getState().view).toBe('list')
    expect(localStorage.getItem('bookmarkify:view')).toBe('list')

    useViewStore.getState().setView('grid')
    expect(useViewStore.getState().view).toBe('grid')
    expect(localStorage.getItem('bookmarkify:view')).toBe('grid')
  })

  it('keeps the state when storing throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    expect(() => useViewStore.getState().setView('list')).not.toThrow()
    expect(useViewStore.getState().view).toBe('list')
  })
})
