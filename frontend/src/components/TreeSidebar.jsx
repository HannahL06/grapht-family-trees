import { useEffect, useState } from 'react'
import { listPeople } from '../api/people'
import {
  CloseIcon,
  PencilIcon,
  PillToggle,
  PlusIcon,
  RelationshipIcon,
  SearchIcon,
  TrashIcon,
} from './ui'

const row =
  'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base bg-transparent'

/** Search: a button that expands into a field with a live results list. */
function PersonSearch({ treeId, onPick }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  // Debounced search: wait 250ms after the last keystroke, ignore stale replies.
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
      <button
        type="button"
        aria-label="Search for a person"
        onClick={() => setOpen(true)}
        className={`${row} cursor-pointer text-ink hover:bg-hover`}
      >
        <SearchIcon size={22} className="text-accent" /> Search
      </button>
    )
  }

  const shown = query.trim() ? results : []
  return (
    <div>
      <div className="flex min-h-11 items-center gap-2 rounded-full border-2 border-accent bg-card pr-1 pl-3.5">
        <SearchIcon size={18} className="shrink-0 text-muted" />
        <input
          autoFocus
          aria-label="Search for a person"
          placeholder="Find a person"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-0 placeholder:text-muted"
        />
        <button
          type="button"
          aria-label="Close search"
          onClick={close}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted hover:bg-hover"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <div className="mt-1.5 flex flex-col">
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onPick(p.id)
              close()
            }}
            className="min-h-11 cursor-pointer rounded-xl bg-transparent px-3.5 text-left text-[15px] text-ink hover:bg-hover"
          >
            {p.name}
          </button>
        ))}
        {query.trim() && shown.length === 0 && (
          <p className="px-3.5 py-2 text-[15px] text-muted">No matches</p>
        )}
      </div>
    </div>
  )
}

export default function TreeSidebar({ treeId, treeName, view, onViewChange, hasSelection, onPick }) {
  const tip = hasSelection ? undefined : 'Select a person first'
  const action = (enabled) =>
    `${row} ${enabled ? 'cursor-pointer text-ink hover:bg-hover' : 'cursor-default text-off'}`

  return (
    <aside className="flex w-[220px] flex-none flex-col gap-5 border-r-2 border-rule px-4 py-6">
      <h1 className="truncate px-3 font-display text-xl font-semibold" title={treeName}>
        {treeName}
      </h1>
      <div className="ml-3 self-start">
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
      </div>
      <PersonSearch treeId={treeId} onPick={onPick} />
      <div className="flex flex-col gap-1">
        {/* Add / Edit / Delete are wired up in Task 2.6 */}
        <button type="button" className={`${row} cursor-pointer font-bold text-accent hover:bg-hover`}>
          <PlusIcon size={22} /> Add member
        </button>
        <button type="button" disabled={!hasSelection} title={tip} className={action(hasSelection)}>
          <PencilIcon size={22} className={hasSelection ? 'text-muted' : 'opacity-60'} /> Edit
        </button>
        <button type="button" disabled={!hasSelection} title={tip} className={action(hasSelection)}>
          <TrashIcon size={22} className={hasSelection ? 'text-muted' : 'opacity-60'} /> Delete
        </button>
      </div>
      {/* Inert until Task 4.3 */}
      <span className={`${row} mt-auto font-medium text-accent`}>
        <RelationshipIcon size={22} /> Relationship calculator
      </span>
    </aside>
  )
}
