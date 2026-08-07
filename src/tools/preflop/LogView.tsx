import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cardParts } from '../../lib/cards'
import { ACTION_LABELS, CONTEXT_LABELS } from '../../lib/charts'
import { useLog, type LogEntry } from './state'

function MiniCard({ card }: { card: string }) {
  const { rank, symbol, red } = cardParts(card)
  return (
    <span className={'mini-card' + (red ? ' red' : '')}>
      {rank}
      {symbol}
    </span>
  )
}

export default function LogView() {
  const [log, setLog] = useLog()
  const [wrongOnly, setWrongOnly] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const navigate = useNavigate()

  const entries = wrongOnly ? log.filter((e) => !e.ok) : log

  function retry(entry: LogEntry) {
    navigate('/preflop-training', {
      state: {
        retry: {
          position: entry.position,
          context: entry.context,
          chartId: entry.chartId,
          cards: entry.cards,
        },
      },
    })
  }

  return (
    <div className="log-view">
      <div className="log-toolbar">
        <label>
          <input
            type="checkbox"
            checked={wrongOnly}
            onChange={(e) => setWrongOnly(e.target.checked)}
          />
          Wrong decisions only
        </label>
        <span className="spacer" />
        {log.length > 0 &&
          (confirmClear ? (
            <>
              <button
                className="btn-subtle btn-danger"
                onClick={() => {
                  setLog([])
                  setConfirmClear(false)
                }}
              >
                Really clear {log.length} entries?
              </button>
              <button className="btn-subtle" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn-subtle" onClick={() => setConfirmClear(true)}>
              Clear log
            </button>
          ))}
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">
          {log.length === 0 ? 'No decisions yet — go practice!' : 'No wrong decisions logged. Nice.'}
        </p>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Position</th>
              <th>Situation</th>
              <th>Hand</th>
              <th>You</th>
              <th>Chart</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className={e.ok ? '' : 'row-wrong'}>
                <td className="log-time">{new Date(e.ts).toLocaleString()}</td>
                <td>{e.position}</td>
                <td>{CONTEXT_LABELS[e.context]}</td>
                <td>
                  <MiniCard card={e.cards[0]} /> <MiniCard card={e.cards[1]} />
                </td>
                <td>{ACTION_LABELS[e.chosen]}</td>
                <td>{ACTION_LABELS[e.correct]}</td>
                <td className={e.ok ? 'mark-ok' : 'mark-bad'}>{e.ok ? '✓' : '✗'}</td>
                <td>
                  <button className="btn-subtle" onClick={() => retry(e)}>
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
