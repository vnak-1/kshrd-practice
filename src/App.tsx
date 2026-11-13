import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UpdateToast } from './components/UpdateToast'
import { mistakeIds } from './lib/progress'
import { useAppState } from './lib/store'
import { Home } from './pages/Home'
import { Mistakes } from './pages/Mistakes'
import { More } from './pages/More'
import { Practice } from './pages/Practice'
import { Review } from './pages/Review'
import { Session } from './pages/Session'
import { StartSet } from './pages/StartSet'

/** Pages that show the bottom tab bar. Every other page shows one big
 *  action button at the bottom instead. Never both: they share that space. */
const NAV_PATHS = new Set(['/', '/practice', '/mistakes', '/more'])

function Shell() {
  const location = useLocation()
  const state = useAppState()
  const onNavPage = NAV_PATHS.has(location.pathname)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <main className={`page ${onNavPage ? 'with-nav' : 'with-action'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/start/:topic" element={<StartSet />} />
          <Route path="/session" element={<Session />} />
          <Route path="/review" element={<Review />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {onNavPage ? <BottomNav mistakeCount={mistakeIds(state).length} /> : null}
      <UpdateToast />
    </div>
  )
}

export default function App() {
  // HashRouter, so GitHub Pages needs no server rules for deep links.
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
