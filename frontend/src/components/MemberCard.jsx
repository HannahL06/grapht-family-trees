import { PencilIcon } from './ui'

const GENDER = { male: 'Male', female: 'Female' }

/** One "label ... value" line. */
function Row({ label, children }) {
  return (
    <div className="contents">
      <span className="text-muted">{label}</span>
      <span className="break-words">{children}</span>
    </div>
  )
}

const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v)

/**
 * The card shown at the right of the tree page for the selected person. It
 * lists every field of the edit form (name, gender, born, died, birthplace,
 * notes, and each marriage); the pencil opens the edit form with these
 * values filled in.
 */
export default function MemberCard({ person, relatives, onEdit }) {
  const spouses = [...relatives.spouses].sort(
    (a, b) =>
      Number(a.divorced) - Number(b.divorced) || (a.marriage_year ?? 0) - (b.marriage_year ?? 0),
  )
  return (
    <div className="flex max-h-full w-72 min-h-0 flex-col rounded-xl border border-rule bg-card text-ink">
      <div className="flex shrink-0 items-start gap-1.5 border-b border-rule py-3 pr-2 pl-[18px]">
        <div className="min-w-0 flex-1 pt-0.5 font-display text-xl leading-[1.2] font-medium break-words">
          {person.name}
        </div>
        <button
          type="button"
          aria-label={`Edit ${person.name}`}
          title="Edit"
          onClick={onEdit}
          className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-accent hover:bg-hover"
        >
          <PencilIcon size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3 pr-[18px] pl-[18px]">
        <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-sm">
          <Row label="Gender">{dash(GENDER[person.gender])}</Row>
          <Row label="Born">{dash(person.birth_year)}</Row>
          <Row label="Died">{dash(person.death_year)}</Row>
          <Row label="Birthplace">{dash(person.birth_place)}</Row>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-[13px] text-muted">Notes</div>
          <div className="text-sm break-words whitespace-pre-wrap">{dash(person.notes)}</div>
        </div>

        {spouses.length === 0 && (
          <div className="mt-4 border-t border-rule pt-3">
            <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-sm">
              <Row label="Married">—</Row>
            </div>
          </div>
        )}
        {spouses.map((s) => (
          <div key={s.relationship_id ?? s.id} className="mt-4 border-t border-rule pt-3">
            <div className="mb-2 text-[13px] font-bold text-muted">Marriage with {s.name}</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-sm">
              <Row label="Married">{dash(s.marriage_year)}</Row>
              <Row label="Divorced">{s.divorced ? 'Yes' : 'No'}</Row>
              {s.divorced && <Row label="Divorce year">{dash(s.divorce_year)}</Row>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
