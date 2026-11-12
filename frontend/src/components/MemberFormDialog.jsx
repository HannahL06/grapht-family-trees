import { useState } from 'react'
import { errorMessage } from '../api/auth'
import { Button, Dialog, TextArea, TextField } from './ui'

const toInt = (v) => (v === '' || v == null ? null : Number.parseInt(v, 10))
const toText = (v) => (v.trim() === '' ? null : v.trim())

const emptyMarriage = { year: '', divorced: false, divorceYear: '' }

/** Male / Female, optional: pressing the chosen one again clears it. */
function GenderField({ value, onChange }) {
  return (
    <div role="group" aria-labelledby="gender-label">
      <div id="gender-label" className="mb-1 font-medium">
        Gender
      </div>
      <div className="flex gap-2">
        {[
          ['male', 'Male'],
          ['female', 'Female'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(value === key ? '' : key)}
            className={`min-h-11 flex-1 cursor-pointer rounded-xl border-2 px-4 font-medium ${
              value === key
                ? 'border-accent bg-accent text-on-accent'
                : 'border-rule bg-page text-ink hover:bg-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Form state -> API shape. A divorce year only counts while divorced is ticked.
const toMarriage = (m) => ({
  marriage_year: toInt(m.year),
  divorced: m.divorced,
  divorce_year: m.divorced ? toInt(m.divorceYear) : null,
})

/** Marriage year, a Divorced checkbox, and (once ticked) a divorce year. */
function MarriageFields({ title, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  return (
    <fieldset className="grid gap-3 rounded-xl border-2 border-rule p-3">
      <legend className="px-1 font-medium">{title}</legend>
      <TextField
        label="Marriage year (optional)"
        type="number"
        value={value.year}
        onChange={(e) => set({ year: e.target.value })}
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={value.divorced}
          onChange={(e) => set({ divorced: e.target.checked })}
          className="size-5 accent-accent"
        />
        Divorced
      </label>
      {value.divorced && (
        <TextField
          label="Divorce year (optional)"
          type="number"
          value={value.divorceYear}
          onChange={(e) => set({ divorceYear: e.target.value })}
        />
      )}
    </fieldset>
  )
}

/**
 * One form for adding a member, editing one, and adding a relative.
 *  - person:          pre-fill values (edit mode)
 *  - spouses:         edit mode only; one marriage-year field per spouse
 *  - askMarriageYear: spouse mode; one optional marriage-year field
 *  - onAddRelative(kind) / onDelete: edit mode; show "Add a relative" buttons
 *    and a Delete link (the caller swaps this dialog for the next one)
 *  - onSubmit(values) must throw on failure; the form shows the message and
 *    stays open. An error with `userMessage` is shown as written.
 */
export default function MemberFormDialog({
  title,
  submitLabel = 'Save',
  person,
  spouses = [],
  askMarriageYear = false,
  onAddRelative,
  onDelete,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState({
    name: person?.name ?? '',
    gender: person?.gender ?? '', // '' | 'male' | 'female'
    birth_year: person?.birth_year ?? '',
    death_year: person?.death_year ?? '',
    birth_place: person?.birth_place ?? '',
    notes: person?.notes ?? '',
  })
  // New spouse (add-spouse mode)
  const [newMarriage, setNewMarriage] = useState(emptyMarriage)
  // Existing marriages (edit mode), keyed by relationship id
  const [marriages, setMarriages] = useState(
    Object.fromEntries(
      spouses.map((s) => [
        s.relationship_id,
        {
          year: s.marriage_year ?? '',
          divorced: Boolean(s.divorced),
          divorceYear: s.divorce_year ?? '',
        },
      ]),
    ),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        person: {
          name: form.name.trim(),
          gender: form.gender || null,
          birth_year: toInt(form.birth_year),
          death_year: toInt(form.death_year),
          birth_place: toText(String(form.birth_place)),
          notes: toText(String(form.notes)),
        },
        marriage: toMarriage(newMarriage),
        marriages: Object.fromEntries(
          Object.entries(marriages).map(([id, m]) => [id, toMarriage(m)]),
        ),
      })
      onClose()
    } catch (err) {
      setError(err.userMessage ?? errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <TextField label="Name" required autoFocus value={form.name} onChange={set('name')} />
        <GenderField
          value={form.gender}
          onChange={(gender) => setForm((f) => ({ ...f, gender }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Born (year)"
            type="number"
            value={form.birth_year}
            onChange={set('birth_year')}
          />
          <TextField
            label="Died (year)"
            type="number"
            value={form.death_year}
            onChange={set('death_year')}
          />
        </div>
        <TextField label="Birthplace" value={form.birth_place} onChange={set('birth_place')} />
        <TextArea label="Notes" value={form.notes} onChange={set('notes')} />

        {askMarriageYear && (
          <MarriageFields title="Marriage" value={newMarriage} onChange={setNewMarriage} />
        )}
        {spouses.map((s) => (
          <MarriageFields
            key={s.relationship_id}
            title={`Marriage with ${s.name}`}
            value={marriages[s.relationship_id]}
            onChange={(m) => setMarriages((all) => ({ ...all, [s.relationship_id]: m }))}
          />
        ))}

        {/* Edit mode only: add a relative, or delete this person */}
        {(onAddRelative || onDelete) && (
          <div className="grid gap-4 border-t-2 border-rule pt-4">
            {onAddRelative && (
              <div>
                <div className="mb-2 font-medium">Add a relative</div>
                <div className="flex flex-wrap gap-2">
                  {['parent', 'spouse', 'child'].map((kind) => (
                    <Button key={kind} variant="soft" onClick={() => onAddRelative(kind)}>
                      + {kind[0].toUpperCase() + kind.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer self-start bg-transparent p-0 text-accent underline-offset-4 hover:underline"
              >
                Delete {form.name.trim() || 'this person'}…
              </button>
            )}
          </div>
        )}

        {error && <p role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="soft" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
