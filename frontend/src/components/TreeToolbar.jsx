import { useEffect, useState } from 'react'
import { listPeople } from '../api/people'
import { Button, CloseIcon, PillToggle, PlusIcon, RelationshipIcon, SearchIcon } from './ui'

/** Search: a button that expands into a field with a results list under it. */
function PersonSearch({ treeId, onPick }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  // Debounced: wait 250 ms after the last keystroke, ignore stale replies.
  useEffect(() => {
    if (!open || !query.trim()) return
    let cancelled = false
    const timer = setTimeout(() => {
      listPeople(treeId, query.trim())
        .then((people) => !cancelled && setResults(people))
        .catch(() => !cancelled && setResults([]))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [treeId, open, query])

  function close() {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  if (!open) {
    return (
      <Button
        variant="soft"
        aria-label="Search for a person"
        onClick={() => setOpen(true)}
        className="max-lg:size-9 max-lg:px-0"
      >
        <SearchIcon size={16} strokeWidth={1.8} className="text-accent" />
        <span className="max-lg:sr-only">Search</span>
      </Button>
    )
  }

  const shown = query.trim() ? results : []
  return (
    <div className="relative">
      <div className="flex min-h-9 w-60 items-center gap-2 rounded-lg border border-accent bg-card pr-[3px] pl-2.5">
        <SearchIcon size={16} strokeWidth={1.8} className="shrink-0 text-muted" />
        <input
          autoFocus
          aria-label="Search for a person"
          placeholder="Find a person"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-0 placeholder:text-muted"
        />
        <button
          type="button"
          aria-label="Close search"
          onClick={close}
          className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-muted hover:bg-hover"
        >
          <CloseIcon size={13} strokeWidth={2.2} />
        </button>
      </div>
      {query.trim() && (
        <div className="absolute top-full left-0 z-30 mt-1.5 flex max-h-72 w-60 flex-col overflow-y-auto rounded-xl border border-rule bg-card p-1">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p.id)
                close()
              }}
              className="min-h-[34px] cursor-pointer rounded-lg bg-transparent px-2.5 text-left text-sm text-ink hover:bg-hover"
            >
              {p.name}
            </button>
          ))}
          {shown.length === 0 && <p className="px-2.5 py-2 text-sm text-muted">No matches</p>}
        </div>
      )}
    </div>
  )
}

/**
 * The tree page's controls, shown in the top bar: tree name, search, the
 * Graph/Tree switch, the relationship calculator, and Add member.
 */
export default function TreeToolbar({ treeId, treeName, view, onViewChange, onPick, onAddMember }) {
  return (
    <>
      <span
        className="hidden max-w-44 truncate font-display text-xl font-medium xl:inline"
        title={treeName}
      >
        {treeName}
      </span>
      <PersonSearch treeId={treeId} onPick={onPick} />
      <PillToggle
        compact
        label="Tree layout"
        value={view}
        onChange={onViewChange}
        options={[
          { value: 'graph', label: 'Graph' },
          { value: 'tree', label: 'Tree' },
        ]}
      />
      {/* Inert until Task 4.3 */}
      <button
        type="button"
        aria-disabled="true"
        title="Relationship calculator (coming soon)"
        className="inline-flex size-9 cursor-default items-center justify-center gap-2 rounded-lg border border-rule text-sm font-medium text-muted xl:w-auto xl:px-3.5"
      >
        <RelationshipIcon size={16} strokeWidth={1.7} className="text-accent" />
        <span className="hidden xl:inline">Relationship calculator</span>
      </button>
      <Button
        aria-label="Add member"
        title="Add member"
        onClick={onAddMember}
        className="max-lg:size-9 max-lg:px-0"
      >
        <PlusIcon size={14} strokeWidth={2.2} />
        <span className="max-lg:sr-only">Add member</span>
      </Button>
    </>
  )
}
