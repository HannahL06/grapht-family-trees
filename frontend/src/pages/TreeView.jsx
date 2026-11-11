import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import {
  createPerson,
  deletePerson,
  getPerson,
  getRelatives,
  updatePerson,
} from '../api/people'
import { createRelationship, updateMarriage } from '../api/relationships'
import { getTree } from '../api/trees'
import AddRelativeBar from '../components/AddRelativeBar'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import MemberCard from '../components/MemberCard'
import MemberFormDialog from '../components/MemberFormDialog'
import TreeSidebar from '../components/TreeSidebar'
import { AppShell } from '../components/ui'

const RELATIVE_LABEL = { parent: 'parent', spouse: 'spouse', child: 'child' }

export default function TreeView() {
  const { id: treeId } = useParams()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState('graph') // 'graph' | 'tree' (drawn in Task 2.7)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [version, setVersion] = useState(0) // bump to reload the selected person
  const [adding, setAdding] = useState(false) // "Add to X" bar open
  // Which dialog is open: null | {type:'add'} | {type:'edit'} | {type:'delete'}
  // | {type:'relative', kind:'parent'|'spouse'|'child'}
  const [dialog, setDialog] = useState(null)
  // Set once the new person of an add-relative flow exists, so a retry after a
  // failed link doesn't create a second person.
  const createdRef = useRef(null)

  useEffect(() => {
    getTree(treeId)
      .then(setTree)
      .catch((err) => setError(errorMessage(err)))
  }, [treeId])

  // Load the selected person + relatives; ignore replies for an old selection.
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    Promise.all([getPerson(treeId, selectedId), getRelatives(treeId, selectedId)])
      .then(([person, relatives]) => !cancelled && setDetail({ person, relatives }))
      .catch(() => !cancelled && setDetail(null))
    return () => {
      cancelled = true
    }
  }, [treeId, selectedId, version])

  const card = selectedId && detail?.person.id === selectedId ? detail : null

  function select(id) {
    setSelectedId(id)
    setAdding(false)
  }

  function changeView(next) {
    setView(next)
    select(null)
  }

  function closeDialog() {
    createdRef.current = null
    setDialog(null)
  }

  async function submitAdd(values) {
    const person = await createPerson(treeId, values.person)
    select(person.id)
    setVersion((v) => v + 1)
  }

  async function submitEdit(values) {
    await updatePerson(treeId, selectedId, values.person)
    for (const s of card.relatives.spouses) {
      const now = values.marriages[s.relationship_id]
      if (!now) continue
      // send only what changed
      const changes = {}
      if (now.marriage_year !== (s.marriage_year ?? null)) changes.marriage_year = now.marriage_year
      if (now.divorced !== Boolean(s.divorced)) changes.divorced = now.divorced
      if (now.divorce_year !== (s.divorce_year ?? null)) changes.divorce_year = now.divorce_year
      if (Object.keys(changes).length) await updateMarriage(treeId, s.relationship_id, changes)
    }
    setVersion((v) => v + 1)
  }

  async function submitRelative(kind, values) {
    if (!createdRef.current) {
      createdRef.current = (await createPerson(treeId, values.person)).id
    }
    const newId = createdRef.current
    try {
      if (kind === 'parent') await createRelationship(treeId, newId, selectedId, 'PARENT_OF')
      else if (kind === 'child') await createRelationship(treeId, selectedId, newId, 'PARENT_OF')
      else await createRelationship(treeId, selectedId, newId, 'MARRIED_TO', values.marriage)
    } catch {
      const msg = `${values.person.name} was added, but linking them as ${RELATIVE_LABEL[kind]} failed. Press the button again to retry the link.`
      const err = new Error(msg)
      err.userMessage = msg
      throw err
    }
    createdRef.current = null
    setAdding(false)
    setVersion((v) => v + 1)
  }

  async function confirmDelete() {
    await deletePerson(treeId, selectedId)
    select(null)
    setDetail(null)
  }

  if (error) {
    return (
      <AppShell>
        <p role="alert">{error}</p>
      </AppShell>
    )
  }

  return (
    <AppShell fill>
      <TreeSidebar
        treeId={treeId}
        treeName={tree?.name ?? ''}
        view={view}
        onViewChange={changeView}
        hasSelection={Boolean(selectedId)}
        onPick={select}
        onAdd={() => setDialog({ type: 'add' })}
        onEdit={() => card && setDialog({ type: 'edit' })}
        onDelete={() => card && setDialog({ type: 'delete' })}
      />
      {/* Clicking empty canvas clears the selection */}
      <main
        onClick={() => select(null)}
        className="relative min-h-[520px] min-w-0 flex-[999_1_560px] overflow-hidden bg-canvas"
      >
        {/* The Sigma graph replaces this placeholder in Task 2.7 */}
        <div className="absolute inset-0 flex items-center justify-center text-muted">
          The {view === 'graph' ? 'graph' : 'tree'} will be drawn here.
        </div>
        {card && (
          <MemberCard
            person={card.person}
            relatives={card.relatives}
            onClose={() => select(null)}
            onAddRelative={() => setAdding(true)}
          />
        )}
        {card && adding && (
          <AddRelativeBar
            name={card.person.name}
            onChoose={(kind) => setDialog({ type: 'relative', kind })}
            onClose={() => setAdding(false)}
          />
        )}
      </main>

      {dialog?.type === 'add' && (
        <MemberFormDialog
          title="Add member"
          submitLabel="Add"
          onSubmit={submitAdd}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'edit' && card && (
        <MemberFormDialog
          title={`Edit ${card.person.name}`}
          person={card.person}
          spouses={card.relatives.spouses}
          onSubmit={submitEdit}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'relative' && card && (
        <MemberFormDialog
          title={`Add ${dialog.kind} of ${card.person.name}`}
          submitLabel="Add"
          askMarriageYear={dialog.kind === 'spouse'}
          onSubmit={(values) => submitRelative(dialog.kind, values)}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'delete' && card && (
        <ConfirmDeleteDialog
          name={card.person.name}
          onConfirm={confirmDelete}
          onClose={closeDialog}
        />
      )}
    </AppShell>
  )
}
