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
      className="m-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-rule bg-card p-0 text-ink backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2 className="mb-5 font-display text-2xl font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
