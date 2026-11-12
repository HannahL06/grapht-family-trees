import { useState } from 'react'
import { errorMessage } from '../api/auth'
import { Button, Dialog } from './ui'

export default function ConfirmDeleteDialog({ name, onConfirm, onClose }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog title={`Delete ${name}?`} onClose={onClose}>
      <p className="mb-5 text-muted">
        This also removes all of {name}&apos;s relationships (parents, spouses and children links).
        The other people stay. This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mb-4">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="soft" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Dialog>
  )
}
