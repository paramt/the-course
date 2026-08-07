import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '.', end: true, label: 'Practice' },
  { to: 'charts', end: false, label: 'Charts' },
  { to: 'log', end: false, label: 'Log' },
  { to: 'report', end: false, label: 'Report' },
]

export default function PreflopTrainer() {
  return (
    <div className="trainer">
      <h1>Preflop Trainer</h1>
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink
            key={t.label}
            to={t.to}
            end={t.end}
            className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
