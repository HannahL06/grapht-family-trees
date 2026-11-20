import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, login } from '../api/auth'
import { AppShell, Button, Card, TextField } from '../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/trees', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <Card className="mx-auto max-w-md">
        <h1 className="mb-6 font-display text-4xl leading-none font-medium">Log in</h1>
        <form onSubmit={onSubmit} className="grid gap-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-ink">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          No account?{' '}
          <Link to="/register" className="text-accent">
            Register
          </Link>
        </p>
      </Card>
    </AppShell>
  )
}
