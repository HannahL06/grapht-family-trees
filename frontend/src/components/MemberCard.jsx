import { CloseIcon } from './ui'

/** Details card shown on the canvas for the selected person. */
export default function MemberCard({ person, relatives, onClose }) {
  const years = relatives.spouses
    .map((s) => s.marriage_year)
    .filter((y) => y != null)
    .sort((a, b) => a - b)
  const facts = [
    ['Born', person.birth_year ?? '—'],
    ['Birthplace', person.birth_place || '—'],
    ['Married', years.length ? years.join(', ') : '—'],
  ]
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-5 right-5 box-border w-62 rounded-[20px] border-2 border-rule bg-card py-4 pr-4 pl-5"
    >
      <div className="mb-3 flex items-center gap-2 border-b-2 border-rule pb-2">
        <div className="flex-1 text-[19px] font-bold">{person.name}</div>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted hover:bg-hover"
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
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
