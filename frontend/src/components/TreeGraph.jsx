import Graph from 'graphology'
import Sigma, { DEFAULT_STYLES } from 'sigma'
import { layerBorder } from '@sigma/node-border'
import { layerDashed, layerPlain, pathLine, pathStep, sdfCircle } from 'sigma/rendering'
import { useEffect, useRef } from 'react'
import { applyTheme, buildGraph, readPositions } from '../graph/build'
import { applyTreeLayout, startForceLayout } from '../graph/layouts'
import { useTokens } from '../theme'

const CLEAR = 'rgba(0,0,0,0)'

// Edge shapes: straight lines, or elbow lines (down, across, down) for the
// parent -> child links of the Tree view.
const LINE_PATH = pathLine()
const ELBOW_PATH = pathStep({ orientation: 'vertical' })
// Graph view: names sit centered on the node, so show them only once zoom has
// made the node big enough to hold a name (rendered node radius in pixels).
const GRAPH_LABEL_THRESHOLD = 20
const SELECTED_GROWTH = 3 // a selected node is drawn this much bigger

/** Mark one person as selected (Sigma's "highlighted" state draws the ring). */
function applyHighlight(sigma, id, highlightedRef) {
  const graph = sigma.getGraph()
  const prev = highlightedRef.current
  if (prev && graph.hasNode(prev)) sigma.setNodeState(prev, { isHighlighted: false })
  if (id && graph.hasNode(id)) {
    sigma.setNodeState(id, { isHighlighted: true })
    highlightedRef.current = id
  } else {
    highlightedRef.current = null
  }
}

const CARD_GAP = 14 // space between the node's ring and the card
const EDGE_MARGIN = 8 // the card never gets closer than this to the canvas edge

/**
 * Put the selection ring on the selected node, and the pop-up card right
 * beside it. Both are plain HTML on top of the canvas, repositioned after
 * every render so they follow panning, zooming and layout movement. The card
 * goes to the right of the node, flips to the left near the right edge, and
 * is kept inside the canvas.
 */
function placeOverlay(sigma, { card, ring }, id) {
  if (!sigma || !card || !ring) return
  const graph = sigma.getGraph()
  if (!id || !graph.hasNode(id)) {
    card.style.display = 'none'
    ring.style.display = 'none'
    return
  }
  const a = graph.getNodeAttributes(id)
  const p = sigma.graphToViewport({ x: a.x, y: a.y })
  const radius = a.size + SELECTED_GROWTH + 3 // node radius + ring gap
  ring.style.display = 'block'
  ring.style.width = ring.style.height = `${radius * 2}px`
  ring.style.transform = `translate(${p.x - radius}px, ${p.y - radius}px)`

  // the card exists only once the person's data has loaded
  if (!card.firstElementChild) {
    card.style.display = 'none'
    return
  }
  card.style.display = 'block'
  const { width, height } = sigma.getDimensions()
  const w = card.offsetWidth
  const h = card.offsetHeight
  let x = p.x + radius + CARD_GAP
  if (x + w > width - EDGE_MARGIN) x = p.x - radius - CARD_GAP - w // flip to the left
  x = Math.max(EDGE_MARGIN, Math.min(x, width - w - EDGE_MARGIN))
  const y = Math.max(EDGE_MARGIN, Math.min(p.y - 28, height - h - EDGE_MARGIN))
  card.style.transform = `translate(${x}px, ${y}px)`
}

/**
 * The family graph. Sigma owns a WebGL canvas, so it is created once in an
 * effect and destroyed on unmount; React only feeds it data.
 *  - data: { nodes, edges } from GET /trees/{id}/graph
 *  - view: 'graph' (force layout) | 'tree' (generations)
 */
export default function TreeGraph({ data, view, selectedId, onSelect, children }) {
  const containerRef = useRef(null)
  const cardRef = useRef(null)
  const ringRef = useRef(null)
  const sigmaRef = useRef(null)
  const highlightedRef = useRef(null)
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  const lastViewRef = useRef(null)
  const tokens = useTokens()
  const tokensRef = useRef(tokens)

  // Keep the latest values where Sigma's long-lived callbacks can read them.
  useEffect(() => {
    tokensRef.current = tokens
    onSelectRef.current = onSelect
  })

  // Create Sigma once.
  useEffect(() => {
    const tokensNow = () => tokensRef.current
    const overlayRefs = () => ({ card: cardRef.current, ring: ringRef.current })
    const sigma = new Sigma(new Graph(), containerRef.current, {
      primitives: {
        nodes: {
          shapes: [sdfCircle()],
          // a style variable for the outline color (set per node)
          variables: { borderColor: { type: 'color', default: CLEAR } },
          // darker outline around the fill, 1.5px
          layers: [
            layerBorder({
              borders: [
                { size: 1.5, mode: 'pixels', color: { attribute: 'borderColor' } },
                { size: 0, color: { attribute: 'color' }, fill: true },
              ],
            }),
          ],
        },
        edges: {
          paths: [LINE_PATH, ELBOW_PATH],
          // a style variable the dashed layer reads (set per edge below)
          variables: { dashColor: { type: 'color', default: CLEAR } },
          layers: [
            // body: solid for parent edges (invisible for marriages)
            layerPlain({ color: { attribute: 'color', default: CLEAR } }),
            // overlay: dashes for marriages (invisible for parent edges)
            layerDashed({
              dashColor: { attribute: 'dashColor', default: CLEAR },
              dashSize: { value: 7, mode: 'pixels' },
              gapSize: { value: 5, mode: 'pixels' },
            }),
          ],
        },
      },
      styles: {
        nodes: [
          DEFAULT_STYLES.nodes,
          {
            borderColor: { attribute: 'borderColor', defaultValue: CLEAR },
            size: (a, s) => a.size + (s.isHighlighted ? SELECTED_GROWTH : s.isHovered ? 2 : 0),
            labelPosition: { attribute: 'labelPos', defaultValue: 'right' },
            labelColor: () => tokensNow().ink,
            labelSize: 11,
            // a hovered or selected person always shows their name
            labelVisibility: (a, s) => (s.isHovered || s.isHighlighted ? 'visible' : 'auto'),
            // hovered: a small card behind the name (the selection ring is HTML, see placeOverlay)
            backdropVisibility: (a, s) => (s.isHovered && !s.isHighlighted ? 'visible' : 'hidden'),
            backdropColor: () => tokensNow().card,
            backdropShadowColor: 'rgba(0,0,0,0.15)',
            backdropShadowBlur: 8,
            backdropPadding: 5,
          },
        ],
        edges: [
          DEFAULT_STYLES.edges,
          {
            size: { attribute: 'size', defaultValue: 1.4 },
            opacity: { attribute: 'opacity', defaultValue: 1 },
            dashColor: { attribute: 'dashColor', defaultValue: CLEAR },
            path: { attribute: 'path', defaultValue: LINE_PATH.name },
          },
        ],
      },
      settings: {
        labelRenderedSizeThreshold: GRAPH_LABEL_THRESHOLD,
        stagePadding: 60,
        // node sizes in screen pixels, so they don't balloon when the graph is small
        // (they still grow as you zoom in, which is what reveals the names)
        itemSizesReference: 'screen',
      },
    })
    sigma.on('clickNode', ({ node }) => onSelectRef.current(node))
    sigma.on('clickStage', () => onSelectRef.current(null))
    sigma.on('afterRender', () => placeOverlay(sigma, overlayRefs(), selectedRef.current))
    // (selection is cleared by clicking empty canvas; clicks on the card never reach Sigma)
    sigmaRef.current = sigma
    if (import.meta.env.DEV) window.__sigma = sigma // for debugging in the browser console

    // Sigma only re-measures its container on a window resize. The container
    // also changes size when the page layout changes (sidebar, wrapping, panes),
    // which would leave the drawing and the click targets out of sync.
    const resizeObserver = new ResizeObserver(() => {
      sigma.resize()
      sigma.refresh()
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      sigma.kill()
      sigmaRef.current = null
    }
  }, [])

  // New data or a different view: rebuild the graph and lay it out.
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma || !data) return
    const oldGraph = sigma.getGraph()
    const previous = oldGraph.order ? readPositions(oldGraph) : new Map()
    const graph = buildGraph(data, previous)
    // names: centered on the node in the Graph view, under it in the Tree view
    graph.forEachNode((id) =>
      graph.setNodeAttribute(id, 'labelPos', view === 'tree' ? 'below' : 'over'),
    )
    // parent links are elbow lines in the Tree view, straight in the Graph view
    graph.forEachEdge((id, a) =>
      graph.setEdgeAttribute(
        id,
        'path',
        view === 'tree' && a.relation === 'PARENT_OF' ? ELBOW_PATH.name : LINE_PATH.name,
      ),
    )
    applyTheme(graph, tokensRef.current)
    sigma.setGraph(graph)
    sigma.setSetting('labelRenderedSizeThreshold', view === 'tree' ? 0 : GRAPH_LABEL_THRESHOLD)
    // tree view names everyone, so allow more labels (one per small grid cell)
    sigma.setSetting('labelGridCellSize', view === 'tree' ? 40 : 100)
    sigma.setSetting('labelDensity', view === 'tree' ? 3 : 1)
    highlightedRef.current = null

    // Re-fit the camera on first load and when switching views, not after edits.
    const refit = previous.size === 0 || lastViewRef.current !== view
    lastViewRef.current = view
    const fit = () => sigma.getCamera().reset({ duration: 300 })

    let stop = () => {}
    if (view === 'tree') {
      applyTreeLayout(graph)
      sigma.refresh()
      if (refit) fit()
    } else {
      stop = startForceLayout(graph, refit ? fit : undefined)
    }
    applyHighlight(sigma, selectedRef.current, highlightedRef)
    return stop
  }, [data, view])

  // Theme changed: repaint.
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return
    applyTheme(sigma.getGraph(), tokens)
    sigma.refresh()
  }, [tokens])

  // The card's size changes when its content loads, so re-place it after every render.
  useEffect(() => {
    placeOverlay(
      sigmaRef.current,
      { card: cardRef.current, ring: ringRef.current },
      selectedRef.current,
    )
  })

  // Selection changed: ring, card, and scroll into view if needed.
  useEffect(() => {
    selectedRef.current = selectedId
    const sigma = sigmaRef.current
    if (!sigma) return
    applyHighlight(sigma, selectedId, highlightedRef)

    const graph = sigma.getGraph()
    if (selectedId && graph.hasNode(selectedId)) {
      const a = graph.getNodeAttributes(selectedId)
      const p = sigma.graphToViewport({ x: a.x, y: a.y })
      const { width, height } = sigma.getDimensions()
      if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) {
        const d = sigma.getNodeDisplayData(selectedId)
        if (d) sigma.getCamera().animate({ x: d.x, y: d.y }, { duration: 300 })
      }
    }
  }, [selectedId])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {/* selection ring: ink outline around the selected person */}
      <div
        ref={ringRef}
        style={{ display: 'none' }}
        className="pointer-events-none absolute top-0 left-0 rounded-full border-[2.5px] border-ink"
      />
      {/* the pop-up card for the selected person (passed in as children); it
          sits above the canvas and any nodes under it */}
      <div
        ref={cardRef}
        style={{ display: 'none' }}
        className="absolute top-0 left-0 z-10"
      >
        {children}
      </div>
    </div>
  )
}
