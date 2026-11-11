/** Segmented pill switch, e.g. Graph / Tree layout. options: [{value, label}] */
export default function PillToggle({ options, value, onChange, compact = false, label }) {
  const size = compact ? 'min-h-[30px] px-3 text-[13px]' : 'min-h-11 px-5'
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-chrome p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${size} cursor-pointer rounded-full font-medium ${
            o.value === value ? 'bg-accent font-bold text-on-accent' : 'text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
