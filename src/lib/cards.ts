// Ranks in display order, high to low (grid rows/columns use this order).
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
export type Rank = (typeof RANKS)[number]

export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Suit = (typeof SUITS)[number]

// A card as a 2-char string, e.g. "As", "Td".
export type Card = string

// One of the 169 starting-hand classes: "AA", "AKs", "T9o", ...
export type HandClass = string

const RANK_ORDER = '23456789TJQKA'

/** Numeric value of a rank: 2 → 0 ... A → 12. */
export function rankValue(r: string): number {
  return RANK_ORDER.indexOf(r)
}

export function dealCards(): [Card, Card] {
  const deck: Card[] = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  const i = Math.floor(Math.random() * 52)
  let j = Math.floor(Math.random() * 51)
  if (j >= i) j++
  return [deck[i], deck[j]]
}

/** Map two cards to their hand class, e.g. ["Kd","Ah"] → "AKo". */
export function handClass(cards: [Card, Card]): HandClass {
  const [a, b] = cards
  if (a[0] === b[0]) return a[0] + b[0]
  const [hi, lo] = rankValue(a[0]) > rankValue(b[0]) ? [a, b] : [b, a]
  return hi[0] + lo[0] + (a[1] === b[1] ? 's' : 'o')
}

const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

export function cardParts(card: Card): { rank: string; symbol: string; red: boolean } {
  const suit = card[1]
  return { rank: card[0], symbol: SUIT_SYMBOLS[suit], red: suit === 'h' || suit === 'd' }
}

/** All 169 hand classes in 13x13 grid order: row-major, suited above the pair diagonal, offsuit below. */
export function gridClass(row: number, col: number): HandClass {
  if (row === col) return RANKS[row] + RANKS[col]
  if (row < col) return RANKS[row] + RANKS[col] + 's'
  return RANKS[col] + RANKS[row] + 'o'
}
