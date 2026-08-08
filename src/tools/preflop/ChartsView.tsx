import { useMemo, useState } from 'react'
import { gridClass, type HandClass } from '../../lib/cards'
import HandGrid from './HandGrid'
import {
  ACTION_LABELS,
  CHARTS,
  chartActions,
  chartDefault,
  compileChart,
  type ActionId,
} from '../../lib/charts'
import { renderRange } from '../../lib/range'
import { useChartOverrides } from './state'

const CHART_IDS = Object.keys(CHARTS)

export default function ChartsView() {
  const [selected, setSelected] = useState(CHART_IDS[0])
  const [editing, setEditing] = useState(false)
  const [overrides, setOverrides] = useChartOverrides()

  const chart = CHARTS[selected]
  const compiled = useMemo(() => compileChart(chart), [chart])
  const actions = chartActions(chart)
  const chartOverrides = overrides[selected]
  const modified = !!chartOverrides

  function effective(hc: HandClass): ActionId {
    return chartOverrides?.[hc] ?? compiled.get(hc) ?? chartDefault(chart)
  }

  function cycleCell(hc: HandClass) {
    if (!editing) return
    const current = effective(hc)
    const nextAction = actions[(actions.indexOf(current) + 1) % actions.length]
    const defaultAction = compiled.get(hc) ?? chartDefault(chart)
    setOverrides((prev) => {
      const forChart = { ...prev[selected] }
      if (nextAction === defaultAction) delete forChart[hc]
      else forChart[hc] = nextAction
      const out = { ...prev }
      if (Object.keys(forChart).length > 0) out[selected] = forChart
      else delete out[selected]
      return out
    })
  }

  const rangeStrings = useMemo(() => {
    const defaultAction = chartDefault(chart)
    return actions
      .filter((a) => a !== defaultAction)
      .map((action) => {
        const set = new Set<HandClass>()
        for (let r = 0; r < 13; r++) {
          for (let c = 0; c < 13; c++) {
            const hc = gridClass(r, c)
            if ((chartOverrides?.[hc] ?? compiled.get(hc) ?? defaultAction) === action) set.add(hc)
          }
        }
        return { action, range: renderRange(set) }
      })
  }, [chart, actions, compiled, chartOverrides])

  return (
    <div className="charts-view">
      <div className="charts-toolbar">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {CHART_IDS.map((id) => (
            <option key={id} value={id}>
              {CHARTS[id].label}
            </option>
          ))}
        </select>
        <label className="edit-toggle">
          <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
          Edit mode
        </label>
        {modified && (
          <>
            <span className="badge badge-modified">modified</span>
            <button
              className="btn-subtle"
              onClick={() =>
                setOverrides((prev) => {
                  const out = { ...prev }
                  delete out[selected]
                  return out
                })
              }
            >
              Reset to Miller defaults
            </button>
          </>
        )}
      </div>

      {editing && (
        <p className="hint">Click a cell to cycle it through {actions.map((a) => ACTION_LABELS[a]).join(' → ')}.</p>
      )}

      <HandGrid getAction={effective} editable={editing} onCellClick={cycleCell} />

      <div className="legend">
        {actions.map((a) => (
          <span key={a} className="legend-item">
            <span className={`legend-swatch act-${a}`} /> {ACTION_LABELS[a]}
          </span>
        ))}
      </div>

      <div className="range-strings">
        {rangeStrings.map(({ action, range }) => (
          <p key={action}>
            <strong>{ACTION_LABELS[action]}:</strong> <code>{range || '(none)'}</code>
          </p>
        ))}
      </div>

      {chart.notes && (
        <ul className="chart-notes">
          {chart.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
