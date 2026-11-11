import { NavLink } from 'react-router-dom'

/**
 * Header tab. By default it is active when its route matches; pass `active`
 * to decide that yourself (e.g. when two tabs share a URL prefix).
 */
export default function NavTab({ to, active, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        // square corners: a rounded box would curl the underline up at the ends, like a button
        `px-4 py-3 text-ink no-underline underline-offset-6 [-webkit-tap-highlight-color:transparent] hover:underline ${
          (active ?? isActive) ? 'font-bold shadow-[inset_0_-3px_0_var(--accent)]' : ''
        }`
      }
    >
      {children}
    </NavLink>
  )
}
