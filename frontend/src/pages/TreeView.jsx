import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { errorMessage } from '../api/auth'
import { getPerson, getRelatives } from '../api/people'
import { getTree } from '../api/trees'
import MemberCard from '../components/MemberCard'
import TreeSidebar from '../components/TreeSidebar'
import { AppShell } from '../components/ui'

export default function TreeView() {
  const { id: treeId } = useParams()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState('graph') // 'graph' | 'tree' (drawn in Task 2.7)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)

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
  }, [treeId, selectedId])

  const card = selectedId && detail?.person.id === selectedId ? detail : null

  function changeView(next) {
    setView(next)
    setSelectedId(null)
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
        onPick={setSelectedId}
      />
      {/* Clicking empty canvas clears the selection */}
      <main
        onClick={() => setSelectedId(null)}
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
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
    </AppShell>
  )
}
