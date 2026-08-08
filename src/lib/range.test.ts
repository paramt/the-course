import { describe, expect, it } from 'vitest'
import { handFamilyMatches, parseRange, parseRangeTokens, renderRange } from './range'
import { CHARTS, chartActions, chartDefault, chartIdFor, compileChart } from './charts'

const sorted = (s: Set<string>) => [...s].sort()

describe('parseRange', () => {
  it('parses single pairs and pair plus', () => {
    expect(sorted(parseRange('22'))).toEqual(['22'])
    expect(sorted(parseRange('KK+'))).toEqual(['AA', 'KK'])
    expect(sorted(parseRange('99+'))).toEqual(['99', 'AA', 'JJ', 'KK', 'QQ', 'TT'])
    expect(parseRange('22+').size).toBe(13)
  })

  it('parses pair ranges', () => {
    expect(sorted(parseRange('44-22'))).toEqual(['22', '33', '44'])
    expect(parseRange('QQ-22').size).toBe(11)
  })

  it('parses single hands', () => {
    expect(sorted(parseRange('AKs,AQo,J7s'))).toEqual(['AKs', 'AQo', 'J7s'])
  })

  it('parses kicker plus', () => {
    expect(sorted(parseRange('KTs+'))).toEqual(['KJs', 'KQs', 'KTs'])
    expect(parseRange('A2s+').size).toBe(12)
    expect(sorted(parseRange('Q9o+'))).toEqual(['Q9o', 'QJo', 'QTo'])
    expect(sorted(parseRange('ATo+'))).toEqual(['AJo', 'AKo', 'AQo', 'ATo'])
  })

  it('parses kicker runs (high card fixed)', () => {
    expect(sorted(parseRange('A5s-A2s'))).toEqual(['A2s', 'A3s', 'A4s', 'A5s'])
    expect(sorted(parseRange('K7s-K5s'))).toEqual(['K5s', 'K6s', 'K7s'])
    expect(sorted(parseRange('ATo-A8o'))).toEqual(['A8o', 'A9o', 'ATo'])
    expect(sorted(parseRange('AKs-ATs'))).toEqual(['AJs', 'AKs', 'AQs', 'ATs'])
  })

  it('parses diagonal runs', () => {
    expect(sorted(parseRange('JTs-76s'))).toEqual(['76s', '87s', '98s', 'JTs', 'T9s'])
    expect(sorted(parseRange('J9s-86s'))).toEqual(['86s', '97s', 'J9s', 'T8s'])
    expect(sorted(parseRange('T7s-96s'))).toEqual(['96s', 'T7s'])
    expect(sorted(parseRange('JTo-98o'))).toEqual(['98o', 'JTo', 'T9o'])
    expect(sorted(parseRange('98s-54s'))).toEqual(['54s', '65s', '76s', '87s', '98s'])
    expect(sorted(parseRange('64s-53s'))).toEqual(['53s', '64s'])
    expect(sorted(parseRange('75s-53s'))).toEqual(['53s', '64s', '75s'])
  })

  it('rejects malformed tokens', () => {
    expect(() => parseRange('XYs')).toThrow()
    expect(() => parseRange('A')).toThrow()
    expect(() => parseRange('KAs')).toThrow()
    expect(() => parseRange('76s-JTs')).toThrow()
    expect(() => parseRange('J9s-86o')).toThrow()
  })

  it('parses the EP opening chart to 14% of combos', () => {
    const set = parseRange(CHARTS['open-ep'].ranges[0].range)
    // 22+ (13 pairs * 6) + A2s+ (12*4) + KTs+ (3*4) + QTs+ (2*4) + JTs-76s (5*4) + AKo,AQo (2*12)
    const combos = 13 * 6 + (12 + 3 + 2 + 5) * 4 + 2 * 12
    expect(combos).toBe(190) // ~14.3% of 1326
    expect(set.size).toBe(13 + 12 + 3 + 2 + 5 + 2)
  })

  it('parses the BTN opening chart to ~33% of combos', () => {
    const set = parseRange(CHARTS['open-btn'].ranges[0].range)
    let combos = 0
    for (const hc of set) combos += hc.length === 2 ? 6 : hc[2] === 's' ? 4 : 12
    expect(combos / 1326).toBeGreaterThan(0.31)
    expect(combos / 1326).toBeLessThan(0.35)
  })
})

describe('renderRange', () => {
  it('round-trips through parseRange', () => {
    for (const chart of Object.values(CHARTS)) {
      for (const { range } of chart.ranges) {
        const set = parseRange(range)
        expect(sorted(parseRange(renderRange(set)))).toEqual(sorted(set))
      }
    }
  })

  it('collapses pairs and kicker runs', () => {
    expect(renderRange(parseRange('99+,A5s-A2s,KQs-KTs'))).toBe('99+,A5s-A2s,KTs+')
  })
})

describe('token families', () => {
  const epOpen = CHARTS['open-ep'].ranges[0].range

  function matching(hc: string, range: string): string[] {
    return parseRangeTokens(range)
      .filter((t) => handFamilyMatches(hc, t))
      .map((t) => t.text)
  }

  it('54s matches the suited-connector token in the EP opening range', () => {
    expect(matching('54s', epOpen)).toEqual(['JTs-76s'])
  })

  it('pairs match pair tokens only', () => {
    expect(matching('55', epOpen)).toEqual(['22+'])
    expect(matching('AA', '99+,ATs+,AQo+')).toEqual(['99+'])
  })

  it('kicker families match by high card and suit', () => {
    expect(matching('K5s', epOpen)).toEqual(['KTs+'])
    expect(matching('K5o', epOpen)).toEqual([])
    expect(matching('A9o', epOpen)).toEqual(['AKo', 'AQo'])
  })

  it('single tokens match via high card or small gap', () => {
    // vs-loose-ep 3-bet range: T9s and 87s are suited-connector singles.
    const threeBet = 'QQ+,AKs,A5s-A2s,T9s,87s,AKo'
    expect(matching('54s', threeBet)).toEqual(['T9s', '87s'])
    expect(matching('A8s', threeBet)).toEqual(['AKs', 'A5s-A2s'])
  })

  it('big gaps are not treated as a family', () => {
    // K5s (gap 8) must not match A6s (also gap 8) — only true connector-ish gaps group.
    expect(matching('K5s', 'A6s')).toEqual([])
    expect(matching('72o', epOpen)).toEqual([])
  })
})

describe('charts', () => {
  it('all chart ranges parse without error', () => {
    for (const chart of Object.values(CHARTS)) {
      for (const { range } of chart.ranges) {
        expect(() => parseRange(range)).not.toThrow()
      }
    }
  })

  it('3bet ranges take priority over call ranges', () => {
    const map = compileChart(CHARTS['vs-tight'])
    expect(map.get('KK')).toBe('3bet')
    expect(map.get('A5s')).toBe('3bet')
    expect(map.get('QQ')).toBe('call')
    expect(map.get('22')).toBe('call')
    expect(map.get('72o')).toBeUndefined()
  })

  it('SB vs limpers: raise the premium range, complete the rest, fold junk', () => {
    const map = compileChart(CHARTS['sb-vs-limpers'])
    expect(map.get('99')).toBe('raise')
    expect(map.get('ATs')).toBe('raise')
    for (const hc of ['J4o', '96o', '52o', 'T3o']) expect(map.get(hc)).toBeUndefined()
    for (const hc of ['98o', 'Q2o', 'J4s', '22', 'A2o', 'JTo']) {
      expect(map.get(hc)).toBe('complete')
    }
  })

  it('BB vs limpers: raise the premium range, check everything else', () => {
    const chart = CHARTS['bb-vs-limpers']
    expect(chartDefault(chart)).toBe('check')
    expect(chartActions(chart)).toEqual(['raise', 'check'])
    const map = compileChart(chart)
    expect(map.get('AQo')).toBe('raise')
    expect(map.get('JTs')).toBeUndefined() // → checks via the default action
  })

  it('maps positions/contexts to the right charts', () => {
    expect(chartIdFor('EP', 'unopened')).toBe('open-ep')
    expect(chartIdFor('SB', 'unopened')).toBeNull()
    expect(chartIdFor('BB', 'vs-loose-raise')).toBe('vs-loose-ep')
    expect(chartIdFor('BTN', 'vs-steal')).toBeNull()
    expect(chartIdFor('CO', 'vs-tight-raise')).toBe('vs-tight')
    expect(chartIdFor('SB', 'vs-limpers')).toBe('sb-vs-limpers')
    expect(chartIdFor('BB', 'vs-limpers')).toBe('bb-vs-limpers')
    expect(chartIdFor('CO', 'vs-limpers')).toBeNull()
  })
})
