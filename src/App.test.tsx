// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import App from './App'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function renderAt(path: string | { pathname: string; state: unknown }) {
  act(() => {
    root = createRoot(container)
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
  })
}

function clickButton(label: string) {
  const btn = [...container.querySelectorAll('button')].find((b) => b.textContent === label)
  if (!btn) throw new Error(`No button labeled "${label}"`)
  act(() => btn.click())
}

it('renders the home page with a link to the preflop trainer', () => {
  renderAt('/')
  expect(container.textContent).toContain('Preflop Trainer')
})

it('practice flow: answer a hand, get feedback, tally and log update', () => {
  renderAt('/preflop-training')
  expect(container.textContent).toContain('Position')
  // Simulated 9-handed table: hero's two cards, 8 opponent seats, dealer button.
  expect(container.querySelectorAll('.pcard').length).toBe(2)
  expect(container.querySelectorAll('.seat').length).toBe(8)
  expect(container.querySelectorAll('.dealer-button').length).toBe(1)

  const actionButtons = [...container.querySelectorAll('.action-buttons button')]
  expect(actionButtons.length).toBeGreaterThanOrEqual(2)
  act(() => (actionButtons[0] as HTMLButtonElement).click())

  // Feedback panel with Next button appears; tally recorded one decision.
  expect(container.textContent).toMatch(/Correct!|Wrong/)
  const tally = JSON.parse(localStorage.getItem('the-course:preflop:v1:tally')!)
  expect(tally.correct + tally.wrong).toBe(1)
  const log = JSON.parse(localStorage.getItem('the-course:preflop:v1:log')!)
  expect(log.length).toBe(1)

  clickButton('Next hand')
  expect(container.querySelectorAll('.action-buttons button').length).toBeGreaterThanOrEqual(2)
})

it('keyboard shortcut answers the current hand', () => {
  renderAt('/preflop-training')
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }))
  })
  expect(container.textContent).toMatch(/Correct!|Wrong/)
  const tally = JSON.parse(localStorage.getItem('the-course:preflop:v1:tally')!)
  expect(tally.correct + tally.wrong).toBe(1)
})

it('reveals the relevant range family and a highlighted mini-grid after answering', () => {
  // 54s in an EP unopened pot: correct answer is fold; the suited-connector
  // part of the range (JTs-76s) should be revealed.
  renderAt({
    pathname: '/preflop-training',
    state: {
      retry: { position: 'EP', context: 'unopened', chartId: 'open-ep', cards: ['5h', '4h'] },
    },
  })
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }))
  })
  expect(container.textContent).toContain('Correct!')
  expect(container.querySelector('.range-reveal')!.textContent).toContain('JTs-76s')
  const highlighted = container.querySelectorAll('.hand-grid.mini .cell.highlight')
  expect(highlighted.length).toBe(1)
  expect(highlighted[0].textContent).toBe('54s')
})

it('JTs in the BB vs limpers is a correct check', () => {
  renderAt({
    pathname: '/preflop-training',
    state: {
      retry: { position: 'BB', context: 'vs-limpers', chartId: 'bb-vs-limpers', cards: ['Jc', 'Tc'] },
    },
  })
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
  })
  expect(container.textContent).toContain('Correct!')
})

it('charts tab renders the 169-cell grid and edit mode cycles a cell', () => {
  renderAt('/preflop-training/charts')
  expect(container.querySelectorAll('.hand-grid .cell').length).toBe(169)

  // AA is a raise in the default EP opening chart.
  const aa = [...container.querySelectorAll('.hand-grid .cell')].find(
    (c) => c.textContent === 'AA',
  ) as HTMLButtonElement
  expect(aa.className).toContain('act-raise')

  const editToggle = container.querySelector('.edit-toggle input') as HTMLInputElement
  act(() => editToggle.click())
  act(() => aa.click())
  expect(aa.className).toContain('act-fold')
  expect(container.textContent).toContain('modified')

  clickButton('Reset to Miller defaults')
  expect(
    ([...container.querySelectorAll('.hand-grid .cell')].find((c) => c.textContent === 'AA') as HTMLElement)
      .className,
  ).toContain('act-raise')
})

it('report tab aggregates mistakes from the log', () => {
  localStorage.setItem(
    'the-course:preflop:v1:log',
    JSON.stringify([
      {
        id: '1',
        ts: 0,
        position: 'CO',
        context: 'unopened',
        chartId: 'open-co',
        cards: ['Ah', 'Kd'],
        chosen: 'fold',
        correct: 'raise',
        ok: false,
      },
    ]),
  )
  renderAt('/preflop-training/report')
  expect(container.textContent).toContain('Most mistakes')
  expect(container.textContent).toContain('CO — Unopened pot')
})
