import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, isLoggedIn, logout } from '../../api/auth'

/** Header user button: shows the name, opens a small menu with Log out. */
export default function UserMenu() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const loggedIn = isLoggedIn()

  useEffect(() => {
    if (!loggedIn) return
    getMe()
      .then((me) => setName(me.name))
      .catch(() => {})
  }, [loggedIn])

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!loggedIn) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 max-w-48 cursor-pointer truncate rounded-full bg-chrome px-5 font-medium text-ink"
      >
        {name || 'user'}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 min-w-40 rounded-2xl border-2 border-rule bg-page p-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="min-h-11 w-full cursor-pointer rounded-xl px-4 text-left text-ink hover:bg-chrome"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
