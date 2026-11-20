import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, login, register } from '../api/auth'
import { AppShell, Button, Card, TextField } from '../components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(name, email, password)
      // register returns no tokens, so log in right away
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
        <h1 className="mb-6 font-display text-4xl leading-none font-medium">Create account</h1>
        <form onSubmit={onSubmit} className="grid gap-4">
          <TextField
            label="Name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            autoComplete="new-password"
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
            {busy ? 'Creating…' : 'Register'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent">
            Log in
          </Link>
        </p>
      </Card>
    </AppShell>
  )
}
