import { Link, matchPath, useLocation } from 'react-router-dom'
import { MoonIcon, SunIcon } from './icons'
import Logo from './Logo'
import NavTab from './NavTab'
import UserMenu from './UserMenu'
import { useTheme } from '../../theme'

export default function AppHeader() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  // Inside a tree (/trees/:id, /trees/:id/members, ...) a Members tab appears
  const treeId = matchPath('/trees/:id/*', pathname)?.params.id
  const onMembers = /\/members(\/|$)/.test(pathname)

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-rule px-7 py-3">
      <Link to="/trees" aria-label="Grapht, your trees" className="flex items-center">
        <Logo className="h-14" />
      </Link>
      <nav className="ml-5 flex flex-1 flex-wrap gap-1">
        <NavTab to="/trees" active={pathname.startsWith('/trees') && !onMembers}>
          Trees
        </NavTab>
        {treeId && (
          <NavTab to={`/trees/${treeId}/members`} active={onMembers}>
            Members
          </NavTab>
        )}
      </nav>
      <UserMenu />
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-chrome text-ink"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}
