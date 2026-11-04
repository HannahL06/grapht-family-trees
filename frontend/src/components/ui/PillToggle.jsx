/** Segmented pill switch, e.g. Tree / Force layout. options: [{value, label}] */
export default function PillToggle({ options, value, onChange }) {
  return (
    <div role="group" className="inline-flex rounded-full bg-chrome p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 cursor-pointer rounded-full px-5 font-medium ${
            o.value === value ? 'bg-accent text-on-accent' : 'text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
