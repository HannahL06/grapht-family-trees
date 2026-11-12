import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import { getGraph } from '../api/graph'
import {
  createPerson,
  deletePerson,
  getPerson,
  getRelatives,
  saveMemberEdit,
} from '../api/people'
import { createRelationship } from '../api/relationships'
import { getTree } from '../api/trees'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import MemberCard from '../components/MemberCard'
import MemberFormDialog from '../components/MemberFormDialog'
import TreeGraph from '../components/TreeGraph'
import TreeToolbar from '../components/TreeToolbar'
import { AppShell } from '../components/ui'

const RELATIVE_LABEL = { parent: 'parent', spouse: 'spouse', child: 'child' }

export default function TreeView() {
  const { id: treeId } = useParams()
  // /trees/:id?selected=<personId> opens the tree with that person selected
  // (the Member page's "Show in tree" link)
  const [searchParams] = useSearchParams()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState('graph') // 'graph' | 'tree'
  const [graphData, setGraphData] = useState(null)
  const [selectedId, setSelectedId] = useState(() => searchParams.get('selected'))
  const [detail, setDetail] = useState(null)
  const [version, setVersion] = useState(0) // bump to reload the tree and the selected person
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

  // The whole tree's people and links; reloaded after every change.
  useEffect(() => {
    let cancelled = false
    getGraph(treeId)
      .then((data) => !cancelled && setGraphData(data))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [treeId, version])

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

  // The selected person's data, once loaded (the card and the dialogs use it)
  const loaded = selectedId && detail?.person.id === selectedId ? detail : null

  function changeView(next) {
    setView(next)
    setSelectedId(null)
  }

  function closeDialog() {
    createdRef.current = null
    setDialog(null)
  }

  async function submitAdd(values) {
    const person = await createPerson(treeId, values.person)
    setSelectedId(person.id)
    setVersion((v) => v + 1)
  }

  async function submitEdit(values) {
    await saveMemberEdit(treeId, selectedId, loaded.relatives.spouses, values)
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
    setVersion((v) => v + 1)
  }

  async function confirmDelete() {
    await deletePerson(treeId, selectedId)
    setSelectedId(null)
    setDetail(null)
    setVersion((v) => v + 1)
  }

  if (error) {
    return (
      <AppShell>
        <p role="alert">{error}</p>
      </AppShell>
    )
  }

  const toolbar = (
    <TreeToolbar
      treeId={treeId}
      treeName={tree?.name ?? ''}
      view={view}
      onViewChange={changeView}
      onPick={setSelectedId}
      onAddMember={() => setDialog({ type: 'add' })}
    />
  )

  return (
    <AppShell fill toolbar={toolbar}>
      {/* Clicking a person selects them and pops their card up beside them;
          clicking empty canvas clears the selection (handled in TreeGraph). */}
      <main className="relative min-h-[300px] min-w-0 flex-[999_1_560px] overflow-hidden bg-canvas">
        <TreeGraph data={graphData} view={view} selectedId={selectedId} onSelect={setSelectedId}>
          {loaded && (
            <MemberCard
              person={loaded.person}
              relatives={loaded.relatives}
              onEdit={() => setDialog({ type: 'edit' })}
            />
          )}
        </TreeGraph>
        {graphData && graphData.nodes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-lg text-muted">
            This tree is empty. Use “Add member” in the top bar to add the first person.
          </p>
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
      {dialog?.type === 'edit' && loaded && (
        <MemberFormDialog
          title={`Edit ${loaded.person.name}`}
          person={loaded.person}
          spouses={loaded.relatives.spouses}
          onSubmit={submitEdit}
          onAddRelative={(kind) => setDialog({ type: 'relative', kind })}
          onDelete={() => setDialog({ type: 'delete' })}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'relative' && loaded && (
        <MemberFormDialog
          title={`Add ${dialog.kind} of ${loaded.person.name}`}
          submitLabel="Add"
          askMarriageYear={dialog.kind === 'spouse'}
          onSubmit={(values) => submitRelative(dialog.kind, values)}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'delete' && loaded && (
        <ConfirmDeleteDialog
          name={loaded.person.name}
          onConfirm={confirmDelete}
          onClose={closeDialog}
        />
      )}
    </AppShell>
  )
}
