import type { Card, HandClass } from '../../lib/cards'
import type { ActionId, Context, Position } from '../../lib/charts'
import { DEFAULT_SETTINGS, type Settings } from '../../lib/scenarios'
import { useStoredState } from '../../lib/storage'

export interface Tally {
  correct: number
  wrong: number
  streak: number
}

export interface LogEntry {
  id: string
  ts: number
  position: Position
  context: Context
  chartId: string
  cards: [Card, Card]
  chosen: ActionId
  correct: ActionId
  ok: boolean
}

/** Per-chart hand-class → action overrides (only cells that differ from defaults). */
export type ChartOverrides = Record<string, Record<HandClass, ActionId>>

const LOG_CAP = 1000

export const EMPTY_TALLY: Tally = { correct: 0, wrong: 0, streak: 0 }

export function useSettings() {
  return useStoredState<Settings>('preflop:v1:settings', DEFAULT_SETTINGS)
}

export function useTally() {
  return useStoredState<Tally>('preflop:v1:tally', EMPTY_TALLY)
}

export function useLog() {
  return useStoredState<LogEntry[]>('preflop:v1:log', [])
}

export function useChartOverrides() {
  return useStoredState<ChartOverrides>('preflop:v1:chart-overrides', {})
}

export function appendLog(log: LogEntry[], entry: LogEntry): LogEntry[] {
  return [entry, ...log].slice(0, LOG_CAP)
}
