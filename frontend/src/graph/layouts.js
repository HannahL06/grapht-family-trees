import dagre from '@dagrejs/dagre'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import FA2Layout from 'graphology-layout-forceatlas2/worker'

/**
 * Graph view: ForceAtlas2 in a web worker (the page stays responsive).
 * It runs for a few seconds, then freezes. Returns a cleanup function.
 */
export function startForceLayout(graph, onDone) {
  if (graph.order < 2) {
    onDone?.()
    return () => {}
  }
  const layout = new FA2Layout(graph, {
    settings: {
      ...forceAtlas2.inferSettings(graph),
      barnesHutOptimize: graph.order > 1000,
      slowDown: 2,
    },
  })
  layout.start()
  const timer = setTimeout(
    () => {
      layout.stop()
      onDone?.()
    },
    Math.min(10000, 2500 + graph.order),
  )
  return () => {
    clearTimeout(timer)
    layout.kill()
  }
}

const SLOT = 70 // horizontal room for one person
const RANK_GAP = 110 // vertical distance between generations

const isMarriage = (graph, edge) => graph.getEdgeAttribute(edge, 'relation') === 'MARRIED_TO'

/**
 * A person with several marriages sits in the middle of a row: past
 * (divorced) spouses on the left, oldest furthest out; the current spouse
 * right next to them on the right.
 */
function orderRow(graph, members) {
  if (members.length === 1) return members
  const marriagesOf = (n) => graph.edges(n).filter((e) => isMarriage(graph, e))
  const center = members.reduce(
    (best, m) => (marriagesOf(m).length > marriagesOf(best).length ? m : best),
    members[0],
  )
  const spouses = marriagesOf(center).map((e) => ({
    id: graph.opposite(center, e),
    divorced: graph.getEdgeAttribute(e, 'divorced'),
    year: graph.getEdgeAttribute(e, 'marriageYear') ?? 0,
  }))
  const byYear = (a, b) => a.year - b.year
  const past = spouses.filter((s) => s.divorced).sort(byYear)
  const current = spouses.filter((s) => !s.divorced).sort(byYear)
  const placed = new Set([center, ...spouses.map((s) => s.id)])
  const rest = members.filter((m) => !placed.has(m))
  return [...past.map((s) => s.id), center, ...current.map((s) => s.id), ...rest]
}

/**
 * Tree view. Each couple (people joined by MARRIED_TO) is one "unit" so
 * spouses always share a generation and sit side by side. dagre arranges
 * the units into generations (parent unit above child unit); then each unit
 * is unfolded into its row of people.
 */
export function applyTreeLayout(graph) {
  // 1. Units = connected groups of spouses (union-find)
  const root = new Map()
  graph.forEachNode((id) => root.set(id, id))
  const find = (id) => {
    while (root.get(id) !== id) {
      root.set(id, root.get(root.get(id)))
      id = root.get(id)
    }
    return id
  }
  graph.forEachEdge((edge, attrs, source, target) => {
    if (attrs.relation === 'MARRIED_TO') root.set(find(source), find(target))
  })
  const units = new Map()
  graph.forEachNode((id) => {
    const r = find(id)
    if (!units.has(r)) units.set(r, [])
    units.get(r).push(id)
  })

  // 2. Place the units. Each unit gets a width (one slot per person) and a
  //    parent -> child link to the unit of each of its children.
  const rows = new Map()
  const widths = new Map()
  for (const [unit, members] of units) {
    const row = orderRow(graph, members)
    rows.set(unit, row)
    widths.set(unit, row.length * SLOT)
  }
  const links = []
  const seen = new Set()
  graph.forEachEdge((edge, attrs, source, target) => {
    if (attrs.relation !== 'PARENT_OF') return
    const from = find(source)
    const to = find(target)
    const key = `${from}>${to}`
    if (from === to || seen.has(key)) return
    seen.add(key)
    links.push([from, to])
  })
  const place = units.size > DAGRE_UNIT_LIMIT ? placeFast : placeWithDagre
  const spots = place(rows.keys(), widths, links) // unit -> {x, y} (y grows downward)

  // 3. Unfold each unit into its row (Sigma's y axis points up)
  for (const [unit, row] of rows) {
    const { x, y } = spots.get(unit)
    const left = x - (row.length * SLOT) / 2 + SLOT / 2
    row.forEach((person, i) => {
      graph.mergeNodeAttributes(person, { x: left + i * SLOT, y: -y })
    })
  }
}

// dagre gives the nicest result but its crossing-reduction grows much faster
// than linearly (about 2.6 s for 2,500 people, ~45 s for 10,000 on the main
// thread), so bigger trees use the simple linear-time layout below.
const DAGRE_UNIT_LIMIT = 1500

function placeWithDagre(unitIds, widths, links) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ ranker: 'longest-path', rankdir: 'TB', nodesep: SLOT * 0.6, ranksep: RANK_GAP })
  g.setDefaultEdgeLabel(() => ({}))
  for (const unit of unitIds) g.setNode(unit, { width: widths.get(unit), height: 20 })
  for (const [from, to] of links) g.setEdge(from, to)
  dagre.layout(g)
  const spots = new Map()
  for (const unit of g.nodes()) {
    const { x, y } = g.node(unit)
    spots.set(unit, { x, y })
  }
  return spots
}

/**
 * Linear-time layered layout for very large trees:
 *  1. rank = generation, by longest path from the roots (parents first)
 *  2. order each generation by the average position of its parents/children
 *     (a few sweeps down and up, the classic barycenter heuristic)
 *  3. spread each generation left to right, centered on x = 0
 */
function placeFast(unitIds, widths, links) {
  const ids = [...unitIds]
  const children = new Map(ids.map((u) => [u, []]))
  const parents = new Map(ids.map((u) => [u, []]))
  const indegree = new Map(ids.map((u) => [u, 0]))
  for (const [from, to] of links) {
    children.get(from).push(to)
    parents.get(to).push(from)
    indegree.set(to, indegree.get(to) + 1)
  }

  // 1. ranks (Kahn's algorithm; anything stuck in a cycle stays at rank 0)
  const rank = new Map(ids.map((u) => [u, 0]))
  const queue = ids.filter((u) => indegree.get(u) === 0)
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head]
    for (const c of children.get(u)) {
      rank.set(c, Math.max(rank.get(c), rank.get(u) + 1))
      indegree.set(c, indegree.get(c) - 1)
      if (indegree.get(c) === 0) queue.push(c)
    }
  }
  const layers = []
  for (const u of ids) {
    const r = rank.get(u)
    while (layers.length <= r) layers.push([])
    layers[r].push(u)
  }

  // 3 (helper). x position of every unit from the current order
  const x = new Map()
  const spread = () => {
    for (const layer of layers) {
      const total = layer.reduce((sum, u) => sum + widths.get(u) + SLOT * 0.6, 0)
      let cursor = -total / 2
      for (const u of layer) {
        x.set(u, cursor + widths.get(u) / 2)
        cursor += widths.get(u) + SLOT * 0.6
      }
    }
  }
  spread()

  // 2. barycenter sweeps: down by parents, then up by children
  const mean = (list, fallback) =>
    list.length ? list.reduce((sum, u) => sum + x.get(u), 0) / list.length : fallback
  for (let sweep = 0; sweep < 4; sweep++) {
    const down = sweep % 2 === 0
    const order = down ? layers.keys() : [...layers.keys()].reverse()
    for (const r of order) {
      const layer = layers[r]
      const key = new Map(
        layer.map((u) => [u, mean(down ? parents.get(u) : children.get(u), x.get(u))]),
      )
      layer.sort((a, b) => key.get(a) - key.get(b))
      spread()
    }
  }

  const spots = new Map()
  for (const u of ids) spots.set(u, { x: x.get(u), y: rank.get(u) * RANK_GAP })
  return spots
}
