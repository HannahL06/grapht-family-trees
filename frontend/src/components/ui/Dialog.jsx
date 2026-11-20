import { useEffect, useRef } from 'react'

/**
 * Modal built on the native <dialog>: the browser handles focus trapping,
 * Escape and the backdrop. Mount it to open; `onClose` runs on Escape,
 * a backdrop click, or when the caller unmounts it.
 */
export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-auto max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-xl border border-rule bg-card p-0 text-ink backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2 className="mb-[18px] font-display text-2xl leading-[1.2] font-medium">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
