import { NavLink } from 'react-router-dom'
import { HomeIcon, MistakesIcon, MoreIcon, PracticeIcon } from './Icons'

interface Props {
  mistakeCount: number
}

export function BottomNav({ mistakeCount }: Props) {
  return (
    <nav className="nav" aria-label="Main">
      <NavLink to="/" end>
        <HomeIcon />
        Home
      </NavLink>
      <NavLink to="/practice">
        <PracticeIcon />
        Practice
      </NavLink>
      <NavLink to="/mistakes">
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <MistakesIcon />
          {mistakeCount > 0 ? (
            <span className="badge">{mistakeCount > 99 ? '99+' : mistakeCount}</span>
          ) : null}
        </span>
        Mistakes
      </NavLink>
      <NavLink to="/more">
        <MoreIcon />
        More
      </NavLink>
    </nav>
  )
}
