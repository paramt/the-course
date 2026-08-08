import { dealCards, type Card, type HandClass } from './cards'
import {
  CHARTS,
  CONTEXTS,
  POSITIONS,
  chartDefault,
  chartIdFor,
  compileChart,
  type ActionId,
  type Context,
  type Position,
} from './charts'

export interface Scenario {
  position: Position
  context: Context
  chartId: string
  cards: [Card, Card]
}

export interface Settings {
  position: Position | 'random'
  context: Context | 'random'
}

export const DEFAULT_SETTINGS: Settings = { position: 'random', context: 'random' }

/** All valid (position, context) pairs. */
export const VALID_COMBOS: { position: Position; context: Context }[] = POSITIONS.flatMap(
  (position) =>
    CONTEXTS.filter((context) => chartIdFor(position, context) !== null).map((context) => ({
      position,
      context,
    })),
)

export function validContextsFor(position: Position | 'random'): Context[] {
  if (position === 'random') return CONTEXTS
  return CONTEXTS.filter((c) => chartIdFor(position, c) !== null)
}

export function validPositionsFor(context: Context | 'random'): Position[] {
  if (context === 'random') return POSITIONS
  return POSITIONS.filter((p) => chartIdFor(p, context) !== null)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Generate a scenario respecting the settings; invalid fixed combos fall back to random. */
export function generateScenario(settings: Settings): Scenario {
  let combos = VALID_COMBOS
  if (settings.position !== 'random') {
    combos = combos.filter((c) => c.position === settings.position)
  }
  if (settings.context !== 'random') {
    const filtered = combos.filter((c) => c.context === settings.context)
    if (filtered.length > 0) combos = filtered
  }
  const { position, context } = pick(combos)
  return { position, context, chartId: chartIdFor(position, context)!, cards: dealCards() }
}

/** The chart-correct action for a hand, honoring any user override map. */
export function correctAction(
  chartId: string,
  hc: HandClass,
  overrides: Record<string, Record<HandClass, ActionId>> | undefined,
): ActionId {
  const override = overrides?.[chartId]?.[hc]
  if (override) return override
  return compileChart(CHARTS[chartId]).get(hc) ?? chartDefault(CHARTS[chartId])
}
