import { Fragment } from 'react'
import { cardParts, type Card } from '../../lib/cards'
import type { Context, Position } from '../../lib/charts'

export function PlayingCard({ card }: { card: Card }) {
  const { rank, symbol, red } = cardParts(card)
  return (
    <div className={'pcard' + (red ? ' red' : '')}>
      <span className="pcard-rank">{rank}</span>
      <span className="pcard-suit">{symbol}</span>
    </div>
  )
}

// Seat roles in preflop action order. Hero's EP seat is 2 off the button,
// i.e. just before the CO.
const BTN_INDEX = 6
const SB_INDEX = 7
const BB_INDEX = 8
const HERO_ROLE_INDEX: Record<Position, number> = { EP: 4, CO: 5, BTN: 6, SB: 7, BB: 8 }

interface SeatView {
  fold?: boolean
  bet?: { amount: number; kind: 'raise' | 'limp' | 'post' }
}

// Visual conventions: tight raise = UTG raiser; loose raise = the seat just
// before hero (for the blinds: UTG+1, since a BTN raise would read as a steal
// and the chart covers a loose EP raise); steal = BTN raiser.
function seatViews(position: Position, context: Context): SeatView[] {
  const hero = HERO_ROLE_INDEX[position]
  const seats: SeatView[] = Array.from({ length: 9 }, () => ({}))
  for (let i = 0; i < hero; i++) seats[i] = { fold: true }
  const bet = (i: number, amount: number, kind: 'raise' | 'limp' | 'post') => {
    seats[i] = { bet: { amount, kind } }
  }
  switch (context) {
    case 'unopened':
      break
    case 'vs-limpers':
      bet(1, 2, 'limp')
      bet(4, 2, 'limp')
      break
    case 'vs-tight-raise':
      bet(0, 12, 'raise')
      break
    case 'vs-loose-raise':
      bet(position === 'SB' || position === 'BB' ? 1 : hero - 1, 12, 'raise')
      break
    case 'vs-steal':
      bet(BTN_INDEX, 12, 'raise')
      break
  }
  // Blinds that haven't acted yet (or hero) show their posts.
  if (!seats[SB_INDEX].fold && !seats[SB_INDEX].bet) bet(SB_INDEX, 1, 'post')
  if (!seats[BB_INDEX].fold && !seats[BB_INDEX].bet) bet(BB_INDEX, 2, 'post')
  return seats
}

// Position on the table ellipse for the seat k places after hero (clockwise,
// hero at the bottom). Angles in degrees; screen y grows downward.
function polar(k: number, rx: number, ry: number, angleOffset = 0) {
  const th = ((90 + 40 * k + angleOffset) * Math.PI) / 180
  return { x: 50 + rx * Math.cos(th), y: 50 + ry * Math.sin(th) }
}

function pctStyle(p: { x: number; y: number }) {
  return { left: p.x + '%', top: p.y + '%' }
}

export default function Table({
  position,
  context,
  cards,
}: {
  position: Position
  context: Context
  cards: [Card, Card]
}) {
  const heroIdx = HERO_ROLE_INDEX[position]
  const seats = seatViews(position, context)
  const btnK = (BTN_INDEX - heroIdx + 9) % 9

  return (
    <div className="table-wrap">
      <div className="table-felt" />
      {seats.map((s, role) => {
        const k = (role - heroIdx + 9) % 9
        const isHero = k === 0
        return (
          <Fragment key={role}>
            {isHero ? (
              <div className="hero-cards" style={pctStyle({ x: 50, y: polar(0, 43, 40).y })}>
                <PlayingCard card={cards[0]} />
                <PlayingCard card={cards[1]} />
              </div>
            ) : (
              <div
                className={'seat' + (s.fold ? ' folded' : '')}
                style={pctStyle(polar(k, 43, 40))}
              />
            )}
            {s.bet && (
              <div
                className={`bet bet-${s.bet.kind}`}
                style={pctStyle(isHero ? { x: 37, y: 72 } : polar(k, 27, 23))}
              >
                <span className="chip" />${s.bet.amount}
              </div>
            )}
          </Fragment>
        )
      })}
      <div
        className="dealer-button"
        style={pctStyle(btnK === 0 ? { x: 61, y: 74 } : polar(btnK, 34, 30, -16))}
      >
        D
      </div>
    </div>
  )
}
