import { useId } from 'react'

const input =
  'min-h-11 w-full rounded-xl border-2 border-rule bg-page px-4 text-ink placeholder:text-muted focus:border-accent focus:outline-none'

export function TextField({ label, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block font-medium">
          {label}
        </label>
      )}
      <input id={id} className={input} {...props} />
    </div>
  )
}

export function TextArea({ label, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block font-medium">
          {label}
        </label>
      )}
      <textarea id={id} rows={3} className={`${input} py-2`} {...props} />
    </div>
  )
}

export function SearchField({ className = '', ...props }) {
  return <input type="search" className={`${input} rounded-full px-5 ${className}`} {...props} />
}
