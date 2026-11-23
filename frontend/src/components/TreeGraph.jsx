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

// People are big circles with their name inside. A name is drawn once its
// circle is at least this big (rendered radius in pixels); zoom in to read
// the names of a very large tree.
const LABEL_MIN_RADIUS = 18
const SELECTED_GROWTH = 3 // a selected node is drawn this much bigger

// Circle size (radius, px): as big as fits, down to a dot for huge trees.
const MAX_SIZE = 34
const MIN_SIZE = 4
// Connected people sit about this many radii apart (centers): close together,
// with room for the link between them.
const SPACING = 4

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

/**
 * Put the selection ring on the selected node, and show the member card. The
 * ring is plain HTML on top of the canvas, repositioned after every render so
 * it follows panning, zooming and layout movement. The card does not follow
 * the node: it sits in a fixed spot at the right of the canvas, under the
 * add-member button (see the card container in the JSX below).
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
  card.style.display = card.firstElementChild ? 'flex' : 'none'
}

const CIRCLE_GAP = 24 // free space wanted between two circles, px
const TOUCH_GAP = 10 // the least free space allowed (circles shrink before they touch), px
const SEPARATE_LIMIT = 400 // bigger trees just get smaller circles instead

/** Size of one layout unit on screen (px), read from the two furthest-apart corners. */
function pixelsPerUnit(sigma, points) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const a = sigma.graphToViewport({ x: minX, y: minY })
  const b = sigma.graphToViewport({ x: maxX, y: maxY })
  const units = Math.hypot(maxX - minX, maxY - minY)
  return units ? Math.hypot(a.x - b.x, a.y - b.y) / units : 1
}

/**
 * Push overlapping people apart. The force layout treats people as points, so
 * with big circles some would sit on top of each other. Circle sizes are in
 * pixels but positions are in layout units, so the pixel size of one unit is
 * measured again after every round, because the drawing grows as people move.
 */
function separate(sigma, graph, radius) {
  if (graph.order < 2 || graph.order > SEPARATE_LIMIT) return
  const camera = sigma.getCamera()
  camera.setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 })
  const pts = graph.mapNodes((id, a) => ({ id, x: a.x, y: a.y }))
  for (let round = 0; round < 30; round++) {
    pts.forEach((p) => graph.mergeNodeAttributes(p.id, { x: p.x, y: p.y }))
    sigma.refresh()
    const wanted = (2 * radius + CIRCLE_GAP) / pixelsPerUnit(sigma, pts)
    let moved = false
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]
          const b = pts[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let d = Math.hypot(dx, dy)
          if (d >= wanted) continue
          if (d === 0) {
            dx = Math.random() - 0.5
            dy = Math.random() - 0.5
            d = Math.hypot(dx, dy)
          }
          const push = (wanted - d) / 2 / d
          a.x -= dx * push
          a.y -= dy * push
          b.x += dx * push
          b.y += dy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  pts.forEach((p) => graph.mergeNodeAttributes(p.id, { x: p.x, y: p.y }))
  sigma.refresh()
}

/**
 * Make the picture compact. At the default zoom the graph is stretched to
 * fill the canvas, which for a small family leaves people far apart. Here the
 * circle size and the drawing area are chosen so connected people are about
 * SPACING radii apart: a small tree keeps full-size circles and is padded so
 * it does not spread out; a big tree gets smaller circles that still just fit.
 * Returns the circle size and the padded drawing area used.
 */
function tightenView(sigma, graph) {
  if (graph.order < 2 || graph.size === 0) return null
  const camera = sigma.getCamera()
  sigma.setCustomBBox(null)
  camera.setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 })

  // average length of a link on screen, before any padding
  let total = 0
  let links = 0
  graph.forEachEdge((edge, attrs, source, target) => {
    const a = graph.getNodeAttributes(source)
    const b = graph.getNodeAttributes(target)
    const p = sigma.graphToViewport({ x: a.x, y: a.y })
    const q = sigma.graphToViewport({ x: b.x, y: b.y })
    total += Math.hypot(p.x - q.x, p.y - q.y)
    links += 1
  })
  if (!links || total === 0) return null
  const average = total / links

  // The closest two people on screen right now: circles must never overlap them.
  let closest = Infinity
  if (graph.order <= SEPARATE_LIMIT) {
    const pts = graph.mapNodes((id, a) => sigma.graphToViewport({ x: a.x, y: a.y }))
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        closest = Math.min(closest, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y))
      }
    }
  }
  const bySpacing = average / SPACING
  const byCloseness = (closest - TOUCH_GAP) / 2 // Infinity for very large trees
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.min(bySpacing, byCloseness)))
  graph.updateEachNodeAttributes((id, attrs) => ({ ...attrs, size }))
  const roomToShrink = closest / (2 * size + CIRCLE_GAP) // 1 = circles already almost touching

  // padding: only when even full-size circles would still be far apart
  let bbox = null
  const wanted = SPACING * size
  if (average > wanted && roomToShrink > 1) {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    graph.forEachNode((id, a) => {
      minX = Math.min(minX, a.x)
      maxX = Math.max(maxX, a.x)
      minY = Math.min(minY, a.y)
      maxY = Math.max(maxY, a.y)
    })
    const grow = Math.min(average / wanted, roomToShrink)
    const span = Math.max(maxX - minX, maxY - minY, 1) * grow
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    bbox = { x: [cx - span / 2, cx + span / 2], y: [cy - span / 2, cy + span / 2] }
    sigma.setCustomBBox(bbox)
  }
  sigma.refresh()
  return { size, bbox }
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
  const viewRef = useRef({ size: MAX_SIZE, bbox: null }) // size and padding from the last fit
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
            // the name sits inside the circle, in a dark color that reads on both node fills
            labelPosition: 'over',
            labelColor: () => tokensNow().onNode,
            // the name shrinks a little in tight spots so it stays inside its circle
            labelSize: (a) => Math.min(12, Math.max(8, a.size * 0.45)),
            labelVisibility: 'auto',
            backdropVisibility: 'hidden',
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
        labelRenderedSizeThreshold: LABEL_MIN_RADIUS,
        // circles are big and close: allow a name on every one of them
        labelGridCellSize: 30,
        labelDensity: 5,
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
    // Re-fit the camera on first load and when switching views, not after edits.
    const refit = previous.size === 0 || lastViewRef.current !== view
    const graph = buildGraph(data, previous, viewRef.current.size)
    // names are drawn inside the circles, in both views
    graph.forEachNode((id) => graph.setNodeAttribute(id, 'labelPos', 'over'))
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
    // A graph of one person has a zero-size bounding box, which Sigma cannot map
    // to the screen: the node is drawn but cannot be clicked. Give it some room.
    if (graph.order === 1) {
      const { x, y } = graph.getNodeAttributes(graph.nodes()[0])
      sigma.setCustomBBox({ x: [x - 50, x + 50], y: [y - 50, y + 50] })
    } else if (refit) {
      sigma.setCustomBBox(null)
    } else {
      // after an edit keep the same padding, so the picture doesn't jump
      sigma.setCustomBBox(viewRef.current.bbox)
    }
    sigma.setSetting('labelRenderedSizeThreshold', LABEL_MIN_RADIUS)
    highlightedRef.current = null

    lastViewRef.current = view
    // Pick circle size and padding for this layout, then fit the camera.
    const fit = () => {
      // the force layout needs help keeping big circles from overlapping
      if (view === 'graph') separate(sigma, sigma.getGraph(), MAX_SIZE)
      const result = tightenView(sigma, sigma.getGraph())
      if (result) viewRef.current = result
      sigma.getCamera().reset({ duration: 300 })
    }

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
      {/* the card for the selected person (passed in as children). It stays at the
          right of the canvas, under the add-member button, whichever person is selected. */}
      <div
        ref={cardRef}
        style={{ display: 'none' }}
        className="absolute top-[76px] right-6 z-10 max-h-[calc(100%-92px)]"
      >
        {children}
      </div>
    </div>
  )
}
