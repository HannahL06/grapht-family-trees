import { Link, matchPath, useLocation } from 'react-router-dom'
import { GearIcon } from './icons'
import Logo from './Logo'
import NavTab from './NavTab'
import UserMenu from './UserMenu'

/**
 * The top bar: logo, Trees / Members tabs, then any page-specific controls
 * (`toolbar`, e.g. the tree page's search and view switch), then the user
 * menu and the settings icon.
 */
export default function AppHeader({ toolbar }) {
  const { pathname } = useLocation()
  // Inside a tree (/trees/:id, /trees/:id/members, ...) a Members tab appears
  const treeId = matchPath('/trees/:id/*', pathname)?.params.id
  const onMembers = /\/members(\/|$)/.test(pathname)

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-rule px-7 py-3">
      <Link to="/trees" aria-label="Grapht, your trees" className="flex items-center">
        <Logo className="h-14" />
      </Link>
      <nav className="ml-5 flex flex-wrap gap-1">
        <NavTab to="/trees" active={pathname.startsWith('/trees') && !onMembers}>
          Trees
        </NavTab>
        {treeId && (
          <NavTab to={`/trees/${treeId}/members`} active={onMembers}>
            Members
          </NavTab>
        )}
      </nav>
      <div className="flex flex-1 flex-wrap items-center gap-2 sm:ml-4 sm:gap-3">{toolbar}</div>
      <UserMenu />
      <Link
        to="/settings"
        aria-label="Settings"
        title="Settings"
        className="flex size-11 items-center justify-center rounded-full bg-chrome text-ink"
      >
        <GearIcon />
      </Link>
    </header>
  )
}
