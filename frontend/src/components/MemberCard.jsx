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
    ['Born', person.birth_year ?? '—'],
    ...(person.death_year != null ? [['Died', person.death_year]] : []),
    ['Birthplace', person.birth_place || '—'],
    ['Married', years.length ? years.join(', ') : '—'],
  ]
  return (
    <div className="w-60 rounded-[20px] border-2 border-rule bg-card py-3 pr-2.5 pl-5 text-ink">
      <div className="mb-3 flex items-center gap-2 border-b-2 border-rule pb-2">
        <div className="min-w-0 flex-1 text-[19px] font-bold break-words">{person.name}</div>
        <button
          type="button"
          aria-label={`Edit ${person.name}`}
          title="Edit"
          onClick={onEdit}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-accent hover:bg-chrome"
        >
          <PencilIcon size={18} />
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 pr-2.5 pb-1 text-[15px]">
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
