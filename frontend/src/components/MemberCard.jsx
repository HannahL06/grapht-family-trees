import { PencilIcon } from './ui'

/**
 * The card that pops up beside a person on the graph (TreeGraph positions it).
 * Shows their details; the pencil in the corner opens the edit form.
 */
export default function MemberCard({ person, relatives, onEdit }) {
  const years = relatives.spouses
    .map((s) => s.marriage_year)
    .filter((y) => y != null)
    .sort((a, b) => a - b)
  const facts = [
    ...(person.gender ? [['Gender', person.gender === 'male' ? 'Male' : 'Female']] : []),
    ['Born', person.birth_year ?? '—'],
    ...(person.death_year != null ? [['Died', person.death_year]] : []),
    ['Birthplace', person.birth_place || '—'],
    ['Married', years.length ? years.join(', ') : '—'],
  ]
  return (
    <div className="w-60 rounded-xl border border-rule bg-card py-3 pr-2 pl-[18px] text-ink">
      <div className="mb-2.5 flex items-start gap-1.5 border-b border-rule pb-2">
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
      <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 pr-2.5 pb-1 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <span className="text-muted">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
