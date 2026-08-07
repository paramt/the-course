import { CONTEXTS, CONTEXT_LABELS, POSITIONS, chartIdFor } from '../../lib/charts'
import { useLog } from './state'

interface CellStats {
  correct: number
  wrong: number
}

export default function ReportView() {
  const [log] = useLog()

  const stats = new Map<string, CellStats>()
  for (const e of log) {
    const key = `${e.position}|${e.context}`
    const s = stats.get(key) ?? { correct: 0, wrong: 0 }
    if (e.ok) s.correct++
    else s.wrong++
    stats.set(key, s)
  }

  const ranked = [...stats.entries()]
    .map(([key, s]) => {
      const [position, context] = key.split('|')
      return { position, context, ...s, total: s.correct + s.wrong }
    })
    .filter((r) => r.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)

  if (log.length === 0) {
    return <p className="empty-state">No decisions yet — the report fills in as you practice.</p>
  }

  return (
    <div className="report-view">
      <h2>Accuracy by position and situation</h2>
      <div className="report-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th></th>
              {CONTEXTS.map((c) => (
                <th key={c}>{CONTEXT_LABELS[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {POSITIONS.map((p) => (
              <tr key={p}>
                <th>{p}</th>
                {CONTEXTS.map((c) => {
                  if (chartIdFor(p, c) === null) {
                    return <td key={c} className="cell-invalid">–</td>
                  }
                  const s = stats.get(`${p}|${c}`)
                  if (!s) return <td key={c} className="cell-empty">no data</td>
                  const total = s.correct + s.wrong
                  const pct = Math.round((s.correct / total) * 100)
                  const tone = pct >= 90 ? 'good' : pct >= 70 ? 'mid' : 'bad'
                  return (
                    <td key={c} className={`cell-stat stat-${tone}`}>
                      <strong>{pct}%</strong>
                      <span className="stat-detail">
                        {s.correct}/{total}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ranked.length > 0 && (
        <>
          <h2>Most mistakes</h2>
          <ol className="mistake-list">
            {ranked.map((r) => (
              <li key={`${r.position}|${r.context}`}>
                <strong>
                  {r.position} — {CONTEXT_LABELS[r.context as keyof typeof CONTEXT_LABELS]}
                </strong>
                : {r.wrong} wrong out of {r.total} (
                {Math.round((r.correct / r.total) * 100)}% accuracy)
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
