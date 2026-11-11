import { CloseIcon } from './ui'

const chip =
  'min-h-11 cursor-pointer rounded-full border-0 bg-chrome px-[18px] text-[15px] font-medium text-ink hover:opacity-90'

/** Bottom-of-canvas bar: "Add to X: Parent | Spouse | Child". */
export default function AddRelativeBar({ name, onChoose, onClose }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-6 left-1/2 flex max-w-[calc(100%-40px)] -translate-x-1/2 flex-wrap items-center gap-x-2.5 gap-y-2 rounded-[20px] border-2 border-rule bg-card py-3 pr-3 pl-5"
    >
      <span className="text-[15px] text-muted">Add to {name}:</span>
      {['parent', 'spouse', 'child'].map((kind) => (
        <button key={kind} type="button" className={chip} onClick={() => onChoose(kind)}>
          {kind[0].toUpperCase() + kind.slice(1)}
        </button>
      ))}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted hover:bg-hover"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  )
}
