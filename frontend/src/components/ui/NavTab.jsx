import { NavLink } from 'react-router-dom'

/**
 * Header tab. By default it is active when its route matches; pass `active`
 * to decide that yourself (e.g. when two tabs share a URL prefix).
 * Plain text with an underline: the active tab is bold and always underlined.
 */
export default function NavTab({ to, active, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 text-sm text-ink no-underline decoration-[1.5px] underline-offset-8 [-webkit-tap-highlight-color:transparent] hover:underline ${
          (active ?? isActive) ? 'font-bold underline' : 'font-medium'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
