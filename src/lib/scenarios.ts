import { dealCards, gridClass, handClass, type Card, type HandClass } from './cards'
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
  /** Deal 50/50 between playable hands and default-action (fold/check) hands. */
  skew?: boolean
}

export const DEFAULT_SETTINGS: Settings = { position: 'random', context: 'random', skew: false }

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

type Overrides = Record<string, Record<HandClass, ActionId>> | undefined

/** Generate a scenario respecting the settings; invalid fixed combos fall back to random. */
export function generateScenario(settings: Settings, overrides?: Overrides): Scenario {
  let combos = VALID_COMBOS
  if (settings.position !== 'random') {
    combos = combos.filter((c) => c.position === settings.position)
  }
  if (settings.context !== 'random') {
    const filtered = combos.filter((c) => c.context === settings.context)
    if (filtered.length > 0) combos = filtered
  }
  const { position, context } = pick(combos)
  const chartId = chartIdFor(position, context)!
  const cards = settings.skew ? dealSkewed(chartId, overrides) : dealCards()
  return { position, context, chartId, cards }
}

function classCombos(hc: HandClass): number {
  return hc.length === 2 ? 6 : hc[2] === 's' ? 4 : 12
}

/**
 * Deal so that playable hands come up 50% of the time instead of their natural
 * frequency, while keeping the relative mix *within* the playable hands (and
 * within the default-action hands) at natural combo weights. If playable hands
 * are already the majority, deal naturally.
 */
function dealSkewed(chartId: string, overrides: Overrides): [Card, Card] {
  const chart = CHARTS[chartId]
  const defaultAction = chartDefault(chart)
  const compiled = compileChart(chart)
  const effective = (hc: HandClass) =>
    overrides?.[chartId]?.[hc] ?? compiled.get(hc) ?? defaultAction

  let playableCombos = 0
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const hc = gridClass(r, c)
      if (effective(hc) !== defaultAction) playableCombos += classCombos(hc)
    }
  }
  const pPlayable = playableCombos / 1326
  if (pPlayable === 0 || pPlayable >= 0.5) return dealCards()

  const wantPlayable = Math.random() < 0.5
  // Rejection-sample; both groups are non-empty so this terminates fast.
  for (let i = 0; i < 1000; i++) {
    const cards = dealCards()
    if ((effective(handClass(cards)) !== defaultAction) === wantPlayable) return cards
  }
  return dealCards()
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
