import { describe, it, expect } from 'vitest'
import { planGridMotion, type GridSnapshot } from './gridMotion.ts'

function snapshot(ids: string[], first: number, last: number): GridSnapshot {
  return { ids: new Set(ids), near: new Set(ids.slice(first, last + 1)), first, last }
}

describe('planGridMotion', () => {
  it('on delete, also animates the cards that slide up into the near slots', () => {
    const before = snapshot(['a', 'b', 'c', 'd', 'e', 'f'], 0, 3)
    const plan = planGridMotion(before, ['a', 'c', 'd', 'e', 'f'])
    expect([...plan.near].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(plan.entering.size).toBe(0)
  })

  it('on undo, marks the cards coming back near the viewport as entering', () => {
    const before = snapshot(['a', 'c', 'd'], 0, 1)
    const plan = planGridMotion(before, ['a', 'b', 'c', 'd'])
    expect([...plan.near].sort()).toEqual(['a', 'b', 'c'])
    expect([...plan.entering]).toEqual(['b'])
  })

  it('leaves out the cards that land far from the viewport', () => {
    const before = snapshot(['a', 'b', 'c', 'd', 'e', 'f'], 2, 3)
    const plan = planGridMotion(before, ['x', 'a', 'b', 'c', 'd', 'e', 'f'])
    expect([...plan.near].sort()).toEqual(['b', 'c', 'd'])
    expect(plan.entering.size).toBe(0)
  })

  it('animates nothing when no card was near the viewport', () => {
    const empty: GridSnapshot = { ids: new Set(), near: new Set(), first: Infinity, last: -1 }
    const plan = planGridMotion(empty, ['a', 'b'])
    expect(plan.near.size).toBe(0)
    expect(plan.entering.size).toBe(0)
  })
})
