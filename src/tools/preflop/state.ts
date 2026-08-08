import { useMemo } from 'react'
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

// The 'sb-limped' context and the 'blinds-vs-limpers'/'sb-limped' charts were
// merged into per-blind vs-limpers charts; migrate stored data from that era.
function migrateLogEntry(e: LogEntry): LogEntry {
  if ((e.context as string) === 'sb-limped') {
    return { ...e, context: 'vs-limpers', chartId: 'sb-vs-limpers' }
  }
  if (e.chartId === 'blinds-vs-limpers') {
    return { ...e, chartId: e.position === 'SB' ? 'sb-vs-limpers' : 'bb-vs-limpers' }
  }
  return e
}

// Settings were single-select ({position, context}) before becoming multi-select.
interface LegacySettings {
  position?: Position | 'random'
  context?: string
  skew?: boolean
}

function migrateSettings(s: Settings | LegacySettings): Settings {
  if ('positions' in s && Array.isArray(s.positions)) return s as Settings
  const legacy = s as LegacySettings
  const ctx = legacy.context === 'sb-limped' ? 'vs-limpers' : legacy.context
  return {
    positions: legacy.position && legacy.position !== 'random' ? [legacy.position] : [],
    contexts: ctx && ctx !== 'random' ? [ctx as Context] : [],
    skew: legacy.skew ?? false,
  }
}

export function useSettings() {
  const [raw, setSettings] = useStoredState<Settings | LegacySettings>(
    'preflop:v1:settings',
    DEFAULT_SETTINGS,
  )
  const settings = useMemo(() => migrateSettings(raw), [raw])
  return [settings, setSettings as (next: Settings) => void] as const
}

export function useTally() {
  return useStoredState<Tally>('preflop:v1:tally', EMPTY_TALLY)
}

export function useLog() {
  const [log, setLog] = useStoredState<LogEntry[]>('preflop:v1:log', [])
  const migrated = useMemo(() => log.map(migrateLogEntry), [log])
  return [migrated, setLog] as const
}

export function useChartOverrides() {
  return useStoredState<ChartOverrides>('preflop:v1:chart-overrides', {})
}

export function appendLog(log: LogEntry[], entry: LogEntry): LogEntry[] {
  return [entry, ...log].slice(0, LOG_CAP)
}
