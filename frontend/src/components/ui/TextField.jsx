import { useId } from 'react'
import { SearchIcon } from './icons'

const input =
  'min-h-9 w-full rounded-lg border border-rule bg-page px-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'
const label = 'mb-1 block text-[13px] font-medium'

export function TextField({ label: text, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {text && (
        <label htmlFor={id} className={label}>
          {text}
        </label>
      )}
      <input id={id} className={input} {...props} />
    </div>
  )
}

export function TextArea({ label: text, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {text && (
        <label htmlFor={id} className={label}>
          {text}
        </label>
      )}
      <textarea id={id} rows={3} className={`${input} py-2`} {...props} />
    </div>
  )
}

/** A hairline field with a magnifier inside; the wrapper takes the border. */
export function SearchField({ className = '', ...props }) {
  return (
    <label
      className={`flex min-h-9 items-center gap-2 rounded-lg border border-rule bg-card px-3 focus-within:border-accent ${className}`}
    >
      <SearchIcon size={16} className="shrink-0 text-muted" />
      <input
        type="search"
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-0 placeholder:text-muted"
        {...props}
      />
    </label>
  )
}
