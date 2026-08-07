import { gridClass, type HandClass } from '../../lib/cards'
import { ACTION_LABELS, type ActionId } from '../../lib/charts'

export default function HandGrid({
  getAction,
  editable,
  onCellClick,
  highlight,
  mini,
}: {
  getAction: (hc: HandClass) => ActionId
  editable?: boolean
  onCellClick?: (hc: HandClass) => void
  highlight?: HandClass
  mini?: boolean
}) {
  return (
    <div className={'hand-grid' + (mini ? ' mini' : '')} role="grid">
      {Array.from({ length: 13 }, (_, r) =>
        Array.from({ length: 13 }, (_, c) => {
          const hc = gridClass(r, c)
          const action = getAction(hc)
          const classes =
            `cell act-${action}` +
            (editable ? ' editable' : '') +
            (highlight === hc ? ' highlight' : '')
          return (
            <button
              key={hc}
              className={classes}
              onClick={() => onCellClick?.(hc)}
              title={`${hc}: ${ACTION_LABELS[action]}`}
            >
              {hc}
            </button>
          )
        }),
      )}
    </div>
  )
}
