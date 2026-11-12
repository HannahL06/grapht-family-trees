import Graph from 'graphology'

const CLEAR = 'rgba(0,0,0,0)'

/** Stable per-person color group: a person keeps the same color between loads. */
function shadeOf(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 2 ? 'b' : 'a'
}

/**
 * API data -> graphology graph.
 * `previous` (id -> {x, y}) keeps people where they were across reloads, so
 * adding someone doesn't scramble a layout you were looking at; new people
 * start next to a relative.
 */
export function buildGraph(data, previous = new Map()) {
  // multi: a person pair can in theory have more than one edge
  const graph = new Graph({ multi: true })
  const size = data.nodes.length > 2000 ? 4 : 9

  for (const n of data.nodes) {
    const was = previous.get(n.id)
    graph.addNode(n.id, {
      label: n.name,
      size,
      shade: shadeOf(n.id),
      x: was?.x ?? Math.random() * 100,
      y: was?.y ?? Math.random() * 100,
    })
  }

  data.edges.forEach((e, i) => {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return
    graph.addEdgeWithKey(`e${i}`, e.source, e.target, {
      relation: e.type, // 'PARENT_OF' | 'MARRIED_TO'
      divorced: Boolean(e.divorced),
      marriageYear: e.marriage_year ?? null,
      divorceYear: e.divorce_year ?? null,
      size: 1.4,
    })
  })

  if (previous.size) {
    for (const n of data.nodes) {
      if (previous.has(n.id)) continue
      const relative = graph.neighbors(n.id).find((id) => previous.has(id))
      if (relative) {
        const p = previous.get(relative)
        graph.mergeNodeAttributes(n.id, {
          x: p.x + (Math.random() - 0.5) * 5,
          y: p.y + (Math.random() - 0.5) * 5,
        })
      }
    }
  }
  return graph
}

/** Remember where everyone is, to pass back into buildGraph. */
export function readPositions(graph) {
  const positions = new Map()
  graph.forEachNode((id, a) => positions.set(id, { x: a.x, y: a.y }))
  return positions
}

/**
 * Paint the graph with the current design tokens. Sigma draws on a canvas
 * and can't use CSS, so colors are written onto the nodes/edges themselves.
 * Parent edges are solid. Marriages are dashed (the plain layer is hidden,
 * the dashed layer shown); a divorced marriage is also faded.
 */
export function applyTheme(graph, tokens) {
  graph.forEachNode((id, a) => {
    const b = a.shade === 'b'
    graph.mergeNodeAttributes(id, {
      color: b ? tokens.nodeB : tokens.nodeA,
      borderColor: b ? tokens.lineB : tokens.lineA, // the darker outline
    })
  })
  graph.forEachEdge((id, a) => {
    const married = a.relation === 'MARRIED_TO'
    graph.mergeEdgeAttributes(id, {
      color: married ? CLEAR : tokens.edge,
      dashColor: married ? tokens.edge : CLEAR,
      opacity: a.divorced ? 0.4 : 1,
    })
  })
}
