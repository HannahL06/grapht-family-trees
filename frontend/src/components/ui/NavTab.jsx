import { NavLink } from 'react-router-dom'

export default function NavTab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl px-4 py-3 text-ink no-underline underline-offset-6 hover:underline ${
          isActive ? 'font-bold shadow-[inset_0_-3px_0_var(--accent)]' : ''
        }`
      }
    >
      {children}
    </NavLink>
  )
}
