import { Link, Outlet, Route, Routes } from 'react-router-dom'
import PreflopTrainer from './tools/preflop/PreflopTrainer'
import Practice from './tools/preflop/Practice'
import ChartsView from './tools/preflop/ChartsView'
import LogView from './tools/preflop/LogView'
import ReportView from './tools/preflop/ReportView'

function Layout() {
  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="site-title">
          The Course <span className="site-subtitle">training tools</span>
        </Link>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        Companion tools for Ed Miller's <em>The Course</em>. Not affiliated with the author.
      </footer>
    </div>
  )
}

function Home() {
  return (
    <div className="home">
      <h1>Training Tools</h1>
      <div className="tool-list">
        <Link to="/preflop-training" className="tool-card">
          <h2>Preflop Trainer</h2>
          <p>
            Drill preflop decisions by position and situation, track your mistakes, and review
            the charts.
          </p>
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="preflop-training" element={<PreflopTrainer />}>
          <Route index element={<Practice />} />
          <Route path="charts" element={<ChartsView />} />
          <Route path="log" element={<LogView />} />
          <Route path="report" element={<ReportView />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
