/** Segmented switch, e.g. Graph / Tree layout. options: [{value, label}] */
export default function PillToggle({ options, value, onChange, compact = false, label }) {
  const size = compact ? 'min-h-[30px] px-3' : 'min-h-[30px] px-3.5'
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg border border-rule p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${size} cursor-pointer rounded-md text-sm ${
            o.value === value ? 'bg-chrome font-bold text-ink' : 'font-medium text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
