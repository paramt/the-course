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
    const rate = playableRate({ position: 'EP', context: 'vs-tight-raise', skew: true }, 600)
    expect(rate).toBeGreaterThan(0.4)
    expect(rate).toBeLessThan(0.6)
  })

  it('deals naturally when skew is off', () => {
    const rate = playableRate({ position: 'EP', context: 'vs-tight-raise', skew: false }, 600)
    expect(rate).toBeLessThan(0.25)
  })

  it('leaves dealing natural when playable hands are already the majority', () => {
    // SB vs limpers completes most hands (~67% playable); skew must not drag it toward 50%.
    const rate = playableRate({ position: 'SB', context: 'vs-limpers', skew: true }, 600)
    expect(rate).toBeGreaterThan(0.6)
  })
})
