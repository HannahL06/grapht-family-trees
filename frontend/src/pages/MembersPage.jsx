import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import { listPeople } from '../api/people'
import { AppShell, ChevronRightIcon, SearchField } from '../components/ui'

const MAX_ROWS = 200 // keeps the page quick on very large trees; search narrows it

// Same four columns (plus a small arrow column) for the header and every row
const COLUMNS =
  'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_20px] gap-4'

export default function MembersPage() {
  const { id: treeId } = useParams()
  const [search, setSearch] = useState('')
  const [people, setPeople] = useState(null)
  const [error, setError] = useState('')

  // Reload as you type, waiting 250 ms after the last keystroke; ignore stale replies.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(
      () => {
        listPeople(treeId, search.trim())
          .then((rows) => {
            if (cancelled) return
            setPeople(rows)
            setError('')
          })
          .catch((err) => !cancelled && setError(errorMessage(err)))
      },
      search ? 250 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [treeId, search])

  const shown = people?.slice(0, MAX_ROWS) ?? []

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl leading-none font-medium tracking-[-0.01em]">Members</h1>
        <SearchField
          aria-label="Search members"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[280px] max-w-full"
        />
      </div>

      {error && <p role="alert">{error}</p>}

      {people && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className={`${COLUMNS} min-h-9 items-center border-b border-ink px-3 text-xs tracking-[0.06em] text-muted uppercase`}
            >
              <span>Name</span>
              <span>Born</span>
              <span>Birthplace</span>
              <span>Married</span>
              <span />
            </div>
            {shown.map((p) => (
              <Link
                key={p.id}
                to={`/trees/${treeId}/members/${p.id}`}
                className={`${COLUMNS} min-h-[52px] items-center border-t border-rule px-3 text-sm text-ink no-underline hover:bg-hover`}
              >
                <span className="min-w-0 truncate font-bold">{p.name}</span>
                <span>{p.birth_year ?? '—'}</span>
                <span className="min-w-0 truncate">{p.birth_place || '—'}</span>
                <span>{p.marriage_years.length ? p.marriage_years.join(', ') : '—'}</span>
                <ChevronRightIcon size={14} strokeWidth={1.8} className="text-muted" />
              </Link>
            ))}
            {shown.length > 0 && <div className="border-t border-rule" />}
          </div>
        </div>
      )}

      {people && people.length === 0 && (
        <p className="mt-6 text-muted">
          {search ? 'No members match your search.' : 'This tree has no members yet.'}
        </p>
      )}
      {people && people.length > MAX_ROWS && (
        <p className="mt-4 text-muted">
          Showing the first {MAX_ROWS} of {people.length}. Search to narrow the list.
        </p>
      )}
    </AppShell>
  )
}
