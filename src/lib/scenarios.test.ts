import { describe, expect, it } from 'vitest'
import { handClass } from './cards'
import { correctAction, generateScenario, type Settings } from './scenarios'

function playableRate(settings: Settings, n: number): number {
  let playable = 0
  for (let i = 0; i < n; i++) {
    const s = generateScenario(settings)
    if (correctAction(s.chartId, handClass(s.cards), undefined) !== 'fold') playable++
  }
  return playable / n
}

describe('skewed dealing', () => {
  it('deals ~50% playable hands for EP vs tight raise (naturally ~11%)', () => {
    const rate = playableRate(
      { positions: ['EP'], contexts: ['vs-tight-raise'], skew: true },
      600,
    )
    expect(rate).toBeGreaterThan(0.4)
    expect(rate).toBeLessThan(0.6)
  })

  it('deals naturally when skew is off', () => {
    const rate = playableRate(
      { positions: ['EP'], contexts: ['vs-tight-raise'], skew: false },
      600,
    )
    expect(rate).toBeLessThan(0.25)
  })

  it('leaves dealing natural when playable hands are already the majority', () => {
    // SB vs limpers completes most hands (~67% playable); skew must not drag it toward 50%.
    const rate = playableRate({ positions: ['SB'], contexts: ['vs-limpers'], skew: true }, 600)
    expect(rate).toBeGreaterThan(0.6)
  })
})

describe('multi-select scenario generation', () => {
  it('only generates scenarios from the selected sets', () => {
    for (let i = 0; i < 50; i++) {
      const s = generateScenario({
        positions: ['EP', 'CO'],
        contexts: ['unopened', 'vs-loose-raise'],
      })
      expect(['EP', 'CO']).toContain(s.position)
      expect(['unopened', 'vs-loose-raise']).toContain(s.context)
    }
  })

  it('empty selections mean any', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const s = generateScenario({ positions: [], contexts: [] })
      seen.add(s.position)
    }
    expect(seen.size).toBe(5)
  })

  it('falls back to the position filter when the intersection is impossible', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateScenario({ positions: ['EP'], contexts: ['vs-steal'] })
      expect(s.position).toBe('EP')
    }
  })
})
