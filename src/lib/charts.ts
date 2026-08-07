// Default preflop charts transcribed from preflop-charts.txt
// (Ed Miller, "The Course", $1/$2 live).
import { RANKS, rankValue, type HandClass } from './cards'
import { parseRange, renderRange } from './range'

export type Position = 'EP' | 'CO' | 'BTN' | 'SB' | 'BB'
export const POSITIONS: Position[] = ['EP', 'CO', 'BTN', 'SB', 'BB']

export type Context =
  | 'unopened'
  | 'vs-limpers'
  | 'sb-limped'
  | 'vs-tight-raise'
  | 'vs-loose-raise'
  | 'vs-steal'

export const CONTEXTS: Context[] = [
  'unopened',
  'vs-limpers',
  'sb-limped',
  'vs-tight-raise',
  'vs-loose-raise',
  'vs-steal',
]

export const CONTEXT_LABELS: Record<Context, string> = {
  unopened: 'Unopened pot',
  'vs-limpers': 'Blinds vs limpers',
  'sb-limped': 'SB in limped pot',
  'vs-tight-raise': 'vs Tight raise',
  'vs-loose-raise': 'vs Loose raise',
  'vs-steal': 'Blinds vs steal',
}

export type ActionId = 'raise' | '3bet' | 'call' | 'complete' | 'fold'

export const ACTION_LABELS: Record<ActionId, string> = {
  raise: 'Raise',
  '3bet': '3-bet',
  call: 'Call',
  complete: 'Complete',
  fold: 'Fold',
}

export interface ChartDef {
  id: string
  label: string
  /** Non-fold actions in priority order; fold is implicit for everything else. */
  ranges: { action: ActionId; range: string }[]
  notes?: string[]
}

// SB complete-or-fold in a limped pot: fold unconnected offsuit hands with no
// card above a jack; complete everything else. Expanded to an explicit range.
function sbLimpedCompleteRange(): string {
  const complete = new Set<HandClass>()
  for (let hi = 0; hi < RANKS.length; hi++) {
    for (let lo = hi; lo < RANKS.length; lo++) {
      const hiV = rankValue(RANKS[hi])
      const loV = rankValue(RANKS[lo])
      if (hi === lo) {
        complete.add(RANKS[hi] + RANKS[lo])
        continue
      }
      complete.add(RANKS[hi] + RANKS[lo] + 's')
      const foldOffsuit = hiV - loV >= 2 && hiV <= rankValue('J')
      if (!foldOffsuit) complete.add(RANKS[hi] + RANKS[lo] + 'o')
    }
  }
  return renderRange(complete)
}

export const CHARTS: Record<string, ChartDef> = {
  'open-ep': {
    id: 'open-ep',
    label: 'Opening — EP (UTG to 2 off button), 14%',
    ranges: [{ action: 'raise', range: '22+,A2s+,KTs+,QTs+,JTs-76s,AKo,AQo' }],
    notes: ['Raise, never limp.'],
  },
  'open-co': {
    id: 'open-co',
    label: 'Opening — CO, 22%',
    ranges: [{ action: 'raise', range: '22+,A2s+,K7s+,Q9s+,JTs-43s,J9s-53s,ATo+,KJo+' }],
    notes: ['Raise, never limp.'],
  },
  'open-btn': {
    id: 'open-btn',
    label: 'Opening — BTN, 33%',
    ranges: [
      {
        action: 'raise',
        range: '22+,A2s+,K2s+,Q5s+,J7s+,T9s-43s,T8s-53s,T7s-96s,A7o+,K9o+,QTo+,JTo',
      },
    ],
    notes: ['Raise, never limp.'],
  },
  'blinds-vs-limpers': {
    id: 'blinds-vs-limpers',
    label: 'Blinds vs limpers — raise',
    ranges: [{ action: 'raise', range: '99+,ATs+,KJs+,AQo+' }],
    notes: [
      "Not graded: add A5s-A2s, K8s, 76s if there's a real chance everyone folds.",
    ],
  },
  'sb-limped': {
    id: 'sb-limped',
    label: 'SB complete-or-fold in limped pot',
    ranges: [{ action: 'complete', range: sbLimpedCompleteRange() }],
    notes: [
      'Fold unconnected offsuit hands with no card above a jack (J4o, 96o, 52o, T3o). Complete everything else.',
    ],
  },
  'vs-tight': {
    id: 'vs-tight',
    label: 'vs Tight raise (he limps weak hands) — all positions',
    ranges: [
      { action: '3bet', range: 'KK+,A5s' },
      { action: 'call', range: 'QQ-22,ATs+,KTs+,QTs+,JTs-76s,AKo' },
    ],
    notes: ['vs a tight raise, position buys you nothing — same range from every seat.'],
  },
  'vs-loose-ep': {
    id: 'vs-loose-ep',
    label: 'vs Loose raise — EP (also blinds vs loose EP raise)',
    ranges: [
      { action: '3bet', range: 'QQ+,AKs,A5s-A2s,T9s,87s,AKo' },
      { action: 'call', range: 'JJ-22,AQs-A6s,KTs+,QTs+,JTs,98s,76s,AQo' },
    ],
  },
  'vs-loose-co': {
    id: 'vs-loose-co',
    label: 'vs Loose raise — CO',
    ranges: [
      { action: '3bet', range: 'JJ+,AKs,A7s,A5s-A2s,T9s,87s,54s,AKo' },
      {
        action: 'call',
        range: 'TT-22,AQs-A8s,A6s,K9s+,Q9s+,JTs,98s,76s-65s,J9s-86s,AQo-AJo,KQo',
      },
    ],
    notes: ['Not graded: optional trim ATo, KJo, K8s-K7s, 43s, 75s-53s.'],
  },
  'vs-loose-btn': {
    id: 'vs-loose-btn',
    label: 'vs Loose raise — BTN',
    ranges: [
      { action: '3bet', range: '99+,AKs-ATs,A5s-A2s,KQs-KJs,QJs,JTs,97s,75s,AKo-AQo' },
      {
        action: 'call',
        range: '88-22,A9s-A6s,KTs-K9s,QTs-Q9s,T9s-43s,J9s-T8s,86s,64s-53s,J8s-T7s,AJo-ATo,KQo-KJo',
      },
    ],
  },
  'vs-steal': {
    id: 'vs-steal',
    label: 'Blinds vs steal raise — 36% defense',
    ranges: [
      { action: '3bet', range: '99+,44-22,A2s+,KJs+,K7s-K5s,Q9s,98s-54s,J9s-86s,AJo+,KQo' },
      {
        action: 'call',
        range:
          '88-55,KTs-K8s,K4s-K2s,QJs-QTs,Q8s-Q5s,JTs-T9s,43s,75s-53s,J8s-96s,J7s,ATo-A8o,KJo-K9o,Q9o+,JTo-98o,J9o',
      },
    ],
    notes: [
      "Don't use this block until you confirm the opener actually steals 40%+ into folded blinds.",
      'Raise-size threshold: small = under 3bb ($6 at 1/2), big = over. Nearly all live raises are big.',
    ],
  },
}

/** Which chart applies for a given position + context (null if invalid combo). */
export function chartIdFor(position: Position, context: Context): string | null {
  switch (context) {
    case 'unopened':
      if (position === 'EP') return 'open-ep'
      if (position === 'CO') return 'open-co'
      if (position === 'BTN') return 'open-btn'
      return null
    case 'vs-limpers':
      return position === 'SB' || position === 'BB' ? 'blinds-vs-limpers' : null
    case 'sb-limped':
      return position === 'SB' ? 'sb-limped' : null
    case 'vs-tight-raise':
      return 'vs-tight'
    case 'vs-loose-raise':
      // Blinds defend vs a loose EP raise with the EP chart (chart line 34).
      if (position === 'EP' || position === 'SB' || position === 'BB') return 'vs-loose-ep'
      if (position === 'CO') return 'vs-loose-co'
      return 'vs-loose-btn'
    case 'vs-steal':
      return position === 'SB' || position === 'BB' ? 'vs-steal' : null
  }
}

/** The non-fold actions the user can choose from for a chart, plus fold. */
export function chartActions(chart: ChartDef): ActionId[] {
  return [...chart.ranges.map((r) => r.action), 'fold']
}

/** Compile a chart's range strings into a hand-class → action map (fold implicit). */
export function compileChart(chart: ChartDef): Map<HandClass, ActionId> {
  const map = new Map<HandClass, ActionId>()
  for (const { action, range } of chart.ranges) {
    for (const hc of parseRange(range)) {
      if (!map.has(hc)) map.set(hc, action)
    }
  }
  return map
}
