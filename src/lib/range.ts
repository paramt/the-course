import { RANKS, rankValue, type HandClass } from './cards'

// Parses poker range notation into a set of hand classes.
//
// Supported token forms (as used in Ed Miller's charts):
//   Pairs:        "22", "99+", "44-22"
//   Single hand:  "AKs", "J7s", "AQo"
//   Kicker plus:  "A2s+", "KTs+", "Q9o+"  (kicker ascends, high card fixed)
//   Kicker run:   "A5s-A2s", "K7s-K5s", "ATo-A8o"  (high card fixed)
//   Diagonal run: "JTs-76s", "J9s-86s", "T7s-96s"  (both ranks step down, gap fixed)

const RANK_RE = '[2-9TJQKA]'
const PAIR = new RegExp(`^(${RANK_RE})\\1$`)
const PAIR_PLUS = new RegExp(`^(${RANK_RE})\\1\\+$`)
const PAIR_RANGE = new RegExp(`^(${RANK_RE})\\1-(${RANK_RE})\\2$`)
const HAND = new RegExp(`^(${RANK_RE})(${RANK_RE})(s|o)$`)
const HAND_PLUS = new RegExp(`^(${RANK_RE})(${RANK_RE})(s|o)\\+$`)
const HAND_RANGE = new RegExp(`^(${RANK_RE})(${RANK_RE})(s|o)-(${RANK_RE})(${RANK_RE})\\3$`)

function classOf(hiVal: number, loVal: number, suffix: string): HandClass {
  const hi = RANKS[12 - hiVal]
  const lo = RANKS[12 - loVal]
  return hi + lo + suffix
}

function parseToken(token: string, out: Set<HandClass>): void {
  let m: RegExpMatchArray | null

  if ((m = token.match(PAIR))) {
    out.add(m[1] + m[1])
    return
  }
  if ((m = token.match(PAIR_PLUS))) {
    for (let v = rankValue(m[1]); v <= 12; v++) out.add(classOf(v, v, ''))
    return
  }
  if ((m = token.match(PAIR_RANGE))) {
    const a = rankValue(m[1])
    const b = rankValue(m[2])
    if (a < b) throw new Error(`Invalid pair range: ${token}`)
    for (let v = b; v <= a; v++) out.add(classOf(v, v, ''))
    return
  }
  if ((m = token.match(HAND))) {
    const hi = rankValue(m[1])
    const lo = rankValue(m[2])
    if (hi <= lo) throw new Error(`Invalid hand (high card must come first): ${token}`)
    out.add(classOf(hi, lo, m[3]))
    return
  }
  if ((m = token.match(HAND_PLUS))) {
    const hi = rankValue(m[1])
    const lo = rankValue(m[2])
    if (hi <= lo) throw new Error(`Invalid hand: ${token}`)
    for (let v = lo; v < hi; v++) out.add(classOf(hi, v, m[3]))
    return
  }
  if ((m = token.match(HAND_RANGE))) {
    const h1 = rankValue(m[1])
    const l1 = rankValue(m[2])
    const h2 = rankValue(m[4])
    const l2 = rankValue(m[5])
    const suffix = m[3]
    if (h1 === h2) {
      // Kicker run: high card fixed, kicker descends from l1 to l2.
      if (l1 <= l2) throw new Error(`Invalid kicker run: ${token}`)
      for (let v = l2; v <= l1; v++) out.add(classOf(h1, v, suffix))
      return
    }
    // Diagonal run: both ranks step down together; the gap must match.
    if (h1 - l1 !== h2 - l2 || h1 <= h2) throw new Error(`Invalid diagonal run: ${token}`)
    const gap = h1 - l1
    for (let h = h2; h <= h1; h++) out.add(classOf(h, h - gap, suffix))
    return
  }
  throw new Error(`Unrecognized range token: ${token}`)
}

/** Parse a comma-separated range string into a set of hand classes. */
export function parseRange(range: string): Set<HandClass> {
  const out = new Set<HandClass>()
  for (const raw of range.split(',')) {
    const token = raw.trim()
    if (token) parseToken(token, out)
  }
  return out
}

/**
 * Render a set of hand classes as a compact range string.
 * Pairs and per-high-card kicker runs are collapsed ("99+", "A5s-A2s");
 * diagonal-run notation is not reconstructed.
 */
export function renderRange(classes: Set<HandClass>): string {
  const tokens: string[] = []

  // Pairs
  const pairVals = RANKS.filter((r) => classes.has(r + r)).map((r) => rankValue(r))
  tokens.push(...collapseRuns(pairVals, (hi, lo) => {
    const hiR = RANKS[12 - hi]
    const loR = RANKS[12 - lo]
    if (hi === 12) return lo === 12 ? 'AA' : loR + loR + '+'
    return hi === lo ? hiR + hiR : hiR + hiR + '-' + loR + loR
  }))

  for (const suffix of ['s', 'o']) {
    for (const hiRank of RANKS) {
      const hi = rankValue(hiRank)
      const kickers = RANKS.filter(
        (lo) => rankValue(lo) < hi && classes.has(hiRank + lo + suffix),
      ).map((lo) => rankValue(lo))
      tokens.push(...collapseRuns(kickers, (top, bottom) => {
        const topR = RANKS[12 - top]
        const bottomR = RANKS[12 - bottom]
        if (top === hi - 1) return bottom === top ? hiRank + topR + suffix : hiRank + bottomR + suffix + '+'
        if (top === bottom) return hiRank + topR + suffix
        return hiRank + topR + suffix + '-' + hiRank + bottomR + suffix
      }))
    }
  }
  return tokens.join(',')
}

// --- Token families (used to reveal the relevant part of a range after an answer) ---
//
// Each notation token describes a "family" of hands: pair tokens, kicker tokens
// (high card fixed, e.g. A2s+ = suited aces), or diagonal tokens (gap fixed,
// e.g. JTs-76s = suited connectors). Single-hand tokens belong to both their
// high-card family and (if connector-ish) their gap family.

export type TokenFamily =
  | { kind: 'pair' }
  | { kind: 'kicker'; high: number; suffix: string }
  | { kind: 'diagonal'; gap: number; suffix: string }
  | { kind: 'single'; high: number; gap: number; suffix: string }

export interface RangeToken {
  text: string
  family: TokenFamily
}

// Gap between ranks (1 = connectors like 76, 2 = one-gappers, 3 = two-gappers).
// Beyond that, "same gap" stops being a meaningful family. Gap families also
// require no card above a jack: AKs is a "suited ace", not a connector — the
// charts' diagonal runs (JTs-76s etc.) never start above J either.
const MAX_FAMILY_GAP = 3
const MAX_FAMILY_HIGH = rankValue('J')

function inGapFamily(high: number, gap: number): boolean {
  return gap <= MAX_FAMILY_GAP && high <= MAX_FAMILY_HIGH
}

/** Split a range string into tokens with family metadata. */
export function parseRangeTokens(range: string): RangeToken[] {
  const out: RangeToken[] = []
  for (const raw of range.split(',')) {
    const text = raw.trim()
    if (!text) continue
    let m: RegExpMatchArray | null
    if (text.match(PAIR) || text.match(PAIR_PLUS) || text.match(PAIR_RANGE)) {
      out.push({ text, family: { kind: 'pair' } })
    } else if ((m = text.match(HAND))) {
      const high = rankValue(m[1])
      out.push({ text, family: { kind: 'single', high, gap: high - rankValue(m[2]), suffix: m[3] } })
    } else if ((m = text.match(HAND_PLUS))) {
      out.push({ text, family: { kind: 'kicker', high: rankValue(m[1]), suffix: m[3] } })
    } else if ((m = text.match(HAND_RANGE))) {
      const h1 = rankValue(m[1])
      if (h1 === rankValue(m[4])) {
        out.push({ text, family: { kind: 'kicker', high: h1, suffix: m[3] } })
      } else {
        out.push({ text, family: { kind: 'diagonal', gap: h1 - rankValue(m[2]), suffix: m[3] } })
      }
    } else {
      throw new Error(`Unrecognized range token: ${text}`)
    }
  }
  return out
}

/** Does this hand class belong to the family a token describes? */
export function handFamilyMatches(hc: HandClass, token: RangeToken): boolean {
  const f = token.family
  if (hc.length === 2) return f.kind === 'pair'
  if (f.kind === 'pair') return false
  if (f.suffix !== hc[2]) return false
  const high = rankValue(hc[0])
  const gap = high - rankValue(hc[1])
  const matchesHigh = (f.kind === 'kicker' || f.kind === 'single') && f.high === high
  const matchesGap =
    inGapFamily(high, gap) &&
    ((f.kind === 'diagonal' && f.gap === gap) ||
      (f.kind === 'single' && f.gap === gap && inGapFamily(f.high, f.gap)))
  return matchesHigh || matchesGap
}

/** Collapse a descending-sorted list of rank values into consecutive runs. */
function collapseRuns(vals: number[], format: (hi: number, lo: number) => string): string[] {
  const sorted = [...vals].sort((a, b) => b - a)
  const out: string[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] - 1) j++
    out.push(format(sorted[i], sorted[j]))
    i = j + 1
  }
  return out
}
