import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { handClass } from '../../lib/cards'
import { handFamilyMatches, parseRangeTokens } from '../../lib/range'
import {
  ACTION_LABELS,
  CHARTS,
  CONTEXTS,
  CONTEXT_LABELS,
  POSITIONS,
  chartActions,
  compileChart,
  type ActionId,
  type Context,
  type Position,
} from '../../lib/charts'
import {
  correctAction,
  generateScenario,
  validContextsFor,
  type Scenario,
} from '../../lib/scenarios'
import { EMPTY_TALLY, appendLog, useChartOverrides, useLog, useSettings, useTally } from './state'
import HandGrid from './HandGrid'
import Table from './Table'

interface Result {
  chosen: ActionId
  correct: ActionId
  ok: boolean
}

// Keyboard shortcuts: r → raise/3-bet, c → call/complete, f → fold.
const KEY_MAP: Record<string, ActionId[]> = {
  r: ['raise', '3bet'],
  c: ['call', 'complete'],
  f: ['fold'],
}

const ACTION_KEYS: Partial<Record<ActionId, string>> = {
  raise: 'R',
  '3bet': 'R',
  call: 'C',
  complete: 'C',
  fold: 'F',
}

export default function Practice() {
  const [settings, setSettings] = useSettings()
  const [tally, setTally] = useTally()
  const [, setLog] = useLog()
  const [overrides] = useChartOverrides()
  const location = useLocation()
  const navigate = useNavigate()

  const retry = (location.state as { retry?: Scenario } | null)?.retry
  const [scenario, setScenario] = useState<Scenario>(() => retry ?? generateScenario(settings))
  const [result, setResult] = useState<Result | null>(null)

  // A "Retry" jump from the log loads that exact scenario, then clears the route state.
  useEffect(() => {
    if (retry) {
      setScenario(retry)
      setResult(null)
      navigate('.', { replace: true, state: null })
    }
  }, [retry, navigate])

  function applySettings(next: typeof settings) {
    setSettings(next)
    setScenario(generateScenario(next))
    setResult(null)
  }

  function updatePosition(position: Position | 'random') {
    const next = { ...settings, position }
    if (
      position !== 'random' &&
      next.context !== 'random' &&
      !validContextsFor(position).includes(next.context)
    ) {
      next.context = 'random'
    }
    applySettings(next)
  }

  function updateContext(context: Context | 'random') {
    const next = { ...settings, context }
    if (
      context !== 'random' &&
      next.position !== 'random' &&
      !validContextsFor(next.position).includes(context)
    ) {
      next.position = 'random'
    }
    applySettings(next)
  }

  function answer(chosen: ActionId) {
    if (result) return
    const hc = handClass(scenario.cards)
    const correct = correctAction(scenario.chartId, hc, overrides)
    const ok = correct === chosen
    setResult({ chosen, correct, ok })
    setTally((t) => ({
      correct: t.correct + (ok ? 1 : 0),
      wrong: t.wrong + (ok ? 0 : 1),
      streak: ok ? t.streak + 1 : 0,
    }))
    setLog((l) =>
      appendLog(l, {
        id: crypto.randomUUID(),
        ts: Date.now(),
        position: scenario.position,
        context: scenario.context,
        chartId: scenario.chartId,
        cards: scenario.cards,
        chosen,
        correct,
        ok,
      }),
    )
  }

  function next() {
    setScenario(generateScenario(settings))
    setResult(null)
  }

  const chart = CHARTS[scenario.chartId]
  const actions = chartActions(chart)
  const hc = handClass(scenario.cards)
  const chartModified = !!overrides[scenario.chartId]
  const compiled = useMemo(() => compileChart(chart), [chart])

  // The book's notation tokens covering this hand's family (e.g. 54s → "JTs-76s"),
  // shown after answering. Skipped when the chart has user edits (tokens reflect defaults).
  const revealTokens = useMemo(() => {
    if (chartModified) return []
    return chart.ranges
      .map(({ action, range }) => ({
        action,
        tokens: parseRangeTokens(range)
          .filter((t) => handFamilyMatches(hc, t))
          .map((t) => t.text),
      }))
      .filter((r) => r.tokens.length > 0)
  }, [chart, hc, chartModified])

  // Refs so the global key listener always sees the latest state without re-binding.
  const answerRef = useRef(answer)
  answerRef.current = answer
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      const action = KEY_MAP[e.key.toLowerCase()]?.find((a) => actionsRef.current.includes(a))
      if (action) {
        e.preventDefault()
        answerRef.current(action)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const total = tally.correct + tally.wrong
  const accuracy = total > 0 ? Math.round((tally.correct / total) * 100) : null

  return (
    <div className="practice">
      <div className="settings-bar">
        <label>
          Position
          <select
            value={settings.position}
            onChange={(e) => updatePosition(e.target.value as Position | 'random')}
          >
            <option value="random">Random</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Situation
          <select
            value={settings.context}
            onChange={(e) => updateContext(e.target.value as Context | 'random')}
          >
            <option value="random">Random</option>
            {CONTEXTS.map((c) => (
              <option
                key={c}
                value={c}
                disabled={
                  settings.position !== 'random' &&
                  !validContextsFor(settings.position).includes(c)
                }
              >
                {CONTEXT_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="tally">
          <span className="tally-correct">✓ {tally.correct}</span>
          <span className="tally-wrong">✗ {tally.wrong}</span>
          <span>Streak {tally.streak}</span>
          {accuracy !== null && <span>{accuracy}%</span>}
          <button className="btn-subtle" onClick={() => setTally(EMPTY_TALLY)}>
            Reset
          </button>
        </div>
      </div>

      <div className="quiz-card">
        <Table position={scenario.position} context={scenario.context} cards={scenario.cards} />

        {!result ? (
          <div className="action-buttons">
            {actions.map((a) => (
              <button key={a} className={`btn-action act-${a}`} onClick={() => answer(a)}>
                {ACTION_LABELS[a]} <kbd>{ACTION_KEYS[a]}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <div className={'feedback ' + (result.ok ? 'feedback-ok' : 'feedback-bad')}>
            <p className="feedback-headline">
              {result.ok ? 'Correct!' : 'Wrong'}
              {!result.ok && (
                <>
                  {' '}
                  — you chose {ACTION_LABELS[result.chosen]}, the chart says{' '}
                  <strong>{ACTION_LABELS[result.correct]}</strong>
                </>
              )}
            </p>
            <p className="feedback-detail">
              {hc} · {chart.label}
            </p>
            {revealTokens.length > 0 && (
              <div className="range-reveal">
                {revealTokens.map((r) => (
                  <p key={r.action}>
                    <strong>{ACTION_LABELS[r.action]}:</strong> <code>{r.tokens.join(', ')}</code>
                  </p>
                ))}
              </div>
            )}
            <HandGrid
              mini
              highlight={hc}
              getAction={(h) => overrides[scenario.chartId]?.[h] ?? compiled.get(h) ?? 'fold'}
            />
            <button className="btn-action btn-next" onClick={next} autoFocus>
              Next hand
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
