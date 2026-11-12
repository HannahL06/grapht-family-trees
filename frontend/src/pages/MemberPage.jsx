import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import { getPerson, getRelatives, saveMemberEdit } from '../api/people'
import { getTree } from '../api/trees'
import MemberFormDialog from '../components/MemberFormDialog'
import { AppShell, PencilIcon } from '../components/ui'

const sectionTitle = 'mb-2 text-[15px] font-bold tracking-[0.08em] text-muted uppercase'
const row =
  'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-rule py-5'

/** A ruled "label ... value" row. */
function Fact({ label, children }) {
  return (
    <div className={row}>
      <div className="text-[19px] text-muted">{label}</div>
      <div className="text-[26px]">{children}</div>
    </div>
  )
}

/** "m. 1974 · divorced 1985" style note under a spouse's name. */
function marriageNote(s) {
  const parts = []
  if (s.marriage_year) parts.push(`married ${s.marriage_year}`)
  if (s.divorced) parts.push(s.divorce_year ? `divorced ${s.divorce_year}` : 'divorced')
  return parts.join(' · ')
}

export default function MemberPage() {
  const { id: treeId, personId } = useParams()
  const [tree, setTree] = useState(null)
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [version, setVersion] = useState(0) // bump to reload after an edit

  useEffect(() => {
    getTree(treeId)
      .then(setTree)
      .catch((err) => setError(errorMessage(err)))
  }, [treeId])

  // Reload when the person changes (family links) or after an edit.
  useEffect(() => {
    let cancelled = false
    Promise.all([getPerson(treeId, personId), getRelatives(treeId, personId)])
      .then(([p, r]) => {
        if (cancelled) return
        setPerson(p)
        setRelatives(r)
        setError('')
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [treeId, personId, version])

  // Show the new person only once their data has arrived (no flash of the old one)
  const ready = person && relatives && person.id === personId

  const years = ready
    ? relatives.spouses
        .map((s) => s.marriage_year)
        .filter((y) => y != null)
        .sort((a, b) => a - b)
    : []

  // current spouse first, then past (divorced) ones, oldest marriage first
  const spouses = ready
    ? [...relatives.spouses].sort(
        (a, b) =>
          Number(a.divorced) - Number(b.divorced) || (a.marriage_year ?? 0) - (b.marriage_year ?? 0),
      )
    : []

  const groups = ready
    ? [
        { label: 'Parents', people: relatives.parents },
        { label: spouses.length > 1 ? 'Spouses' : 'Spouse', people: spouses },
        { label: 'Children', people: relatives.children },
      ].filter((g) => g.people.length)
    : []

  return (
    <AppShell>
      <Link
        to={`/trees/${treeId}/members`}
        className="text-lg font-medium text-accent no-underline hover:underline"
      >
        ← All members
      </Link>

      {error && (
        <p role="alert" className="mt-6">
          {error}
        </p>
      )}

      {ready && (
        <>
          <div className="mt-7 mb-9 flex flex-wrap items-center gap-7 border-b-2 border-rule pb-9">
            <div className="min-w-[260px] flex-1">
              <h1 className="font-display text-[56px] leading-[1.1] font-semibold">
                {person.name}
              </h1>
              <div className="mt-2 text-[22px] text-muted">{tree?.name ?? ''}</div>
            </div>
            <div className="flex flex-wrap items-center gap-7 text-[19px]">
              <Link
                to={`/trees/${treeId}?selected=${personId}`}
                className="font-medium text-accent no-underline hover:underline"
              >
                Show in tree
              </Link>
              <button
                type="button"
                aria-label="Edit member"
                title="Edit"
                onClick={() => setEditing(true)}
                className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-transparent text-accent hover:bg-chrome"
              >
                <PencilIcon size={28} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-x-20 gap-y-12">
            <section>
              <h2 className={sectionTitle}>Details</h2>
              {person.gender && (
                <Fact label="Gender">{person.gender === 'male' ? 'Male' : 'Female'}</Fact>
              )}
              <Fact label="Born">{person.birth_year ?? '—'}</Fact>
              {person.death_year != null && <Fact label="Died">{person.death_year}</Fact>}
              <Fact label="Birthplace">{person.birth_place || '—'}</Fact>
              <Fact label="Married">{years.length ? years.join(', ') : '—'}</Fact>
              {person.notes && (
                <div className={row}>
                  <div className="text-[19px] text-muted">Notes</div>
                  <div className="max-w-md text-[19px] whitespace-pre-wrap">{person.notes}</div>
                </div>
              )}
            </section>

            <section>
              <h2 className={sectionTitle}>Family</h2>
              {groups.length === 0 && (
                <p className="py-5 text-[19px] text-muted">No family linked yet.</p>
              )}
              {groups.map((g) => (
                <div key={g.label} className={row}>
                  <div className="text-[19px] text-muted">{g.label}</div>
                  <div className="flex flex-col items-end gap-1.5 text-[26px]">
                    {g.people.map((p) => (
                      <div key={p.relationship_id ?? p.id} className="text-right">
                        <Link
                          to={`/trees/${treeId}/members/${p.id}`}
                          className="text-accent no-underline hover:underline"
                        >
                          {p.name}
                        </Link>
                        {g.label.startsWith('Spouse') && marriageNote(p) && (
                          <div className="text-[15px] text-muted">{marriageNote(p)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>

          {editing && (
            <MemberFormDialog
              title={`Edit ${person.name}`}
              person={person}
              spouses={relatives.spouses}
              onSubmit={async (values) => {
                await saveMemberEdit(treeId, personId, relatives.spouses, values)
                setVersion((v) => v + 1)
              }}
              onClose={() => setEditing(false)}
            />
          )}
        </>
      )}
    </AppShell>
  )
}
