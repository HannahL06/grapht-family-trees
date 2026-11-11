import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import { createTree, getTrees } from '../api/trees'
import { AppShell, Button, PlusIcon, TextField } from '../components/ui'

// Decorative thumbnail: same little graph on every card, rotated by a
// number derived from the tree id so cards look different but stay stable.
function hash(str) {
  let h = 0
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function Thumbnail({ id }) {
  const h = hash(id)
  const rotation = h % 360
  const alt = h % 2 === 1 // alternate node colors, purely for variety
  const fill = alt ? 'var(--node-b)' : 'var(--node-a)'
  const stroke = alt ? 'var(--line-b)' : 'var(--line-a)'
  return (
    <div className="h-[150px] rounded-3xl bg-canvas">
      <svg width="100%" height="150" viewBox="0 0 260 150" aria-hidden="true">
        <g transform={`rotate(${rotation} 130 75)`}>
          <g stroke="var(--edge)" strokeWidth="1.3">
            <line x1="130" y1="75" x2="70" y2="40" />
            <line x1="130" y1="75" x2="95" y2="120" />
            <line x1="130" y1="75" x2="190" y2="35" />
            <line x1="130" y1="75" x2="200" y2="105" />
            <line x1="130" y1="75" x2="130" y2="20" />
            <line x1="70" y1="40" x2="40" y2="70" />
            <line x1="200" y1="105" x2="225" y2="75" />
          </g>
          <g fill={fill} stroke={stroke} strokeWidth="1.2">
            <circle cx="130" cy="75" r="9" />
            <circle cx="70" cy="40" r="7" />
            <circle cx="95" cy="120" r="7" />
            <circle cx="190" cy="35" r="7" />
            <circle cx="200" cy="105" r="7" />
            <circle cx="130" cy="20" r="7" />
            <circle cx="40" cy="70" r="6" />
            <circle cx="225" cy="75" r="6" />
          </g>
        </g>
      </svg>
    </div>
  )
}

function TreeCard({ tree }) {
  return (
    <Link
      to={`/trees/${tree.id}`}
      className="block overflow-hidden rounded-3xl bg-card text-ink no-underline hover:opacity-90"
    >
      <Thumbnail id={tree.id} />
      <div className="px-5 pt-4 pb-4.5">
        <div className="text-[19px] font-bold">{tree.name}</div>
        <div className="mt-1 text-sm text-muted">
          {tree.member_count} {tree.member_count === 1 ? 'member' : 'members'}
        </div>
      </div>
    </Link>
  )
}

function NewTreeCard({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box =
    'flex min-h-[228px] items-center justify-center rounded-3xl border-2 border-dashed border-rule'

  async function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      await onCreated(name.trim())
      setName('')
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${box} cursor-pointer gap-2.5 bg-transparent text-[17px] font-bold text-accent`}
      >
        <PlusIcon size={22} /> New tree
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`${box} flex-col gap-3 p-5`}>
      <TextField
        label="Tree name"
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full"
      />
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create'}
        </Button>
        <Button variant="soft" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function TreesPage() {
  const [trees, setTrees] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getTrees()
      .then(setTrees)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function handleCreate(name) {
    await createTree(name)
    setTrees(await getTrees()) // refresh so counts and order come from the server
  }

  return (
    <AppShell>
      <h1 className="mb-7 font-display text-4xl font-semibold">Trees</h1>
      {error && <p role="alert">{error}</p>}
      {trees && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {trees.map((t) => (
            <TreeCard key={t.id} tree={t} />
          ))}
          <NewTreeCard onCreated={handleCreate} />
        </div>
      )}
    </AppShell>
  )
}
