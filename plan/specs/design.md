# Technical Design

Consolidated technical decisions. See `steering/tech.md` for the full stack and `steering/structure.md` for the directory layout.

---

## Data Model

Neo4j has no fixed schema: labels, properties and relationship types exist by convention. Only constraints and indexes are enforced by the database (created by `core/schema.py`). Everything lives in Neo4j, including users (one datastore, nothing lost on redeploys). No `Family` node: pure person-to-person edges.

### Person
- Properties: `id` (UUID), `tree_id`, `name`, `gender` (optional: `"male"` or `"female"`, added 2026-11-12; anything else is a 422), `birth_year` (optional), `death_year` (optional), `birth_place` (optional), `notes` (optional)
- Constraints: `id` unique; index on `tree_id`
- Belongs to exactly one tree (via `tree_id`); no edge ever crosses trees
- Extra fields (gender, full dates, Hebrew birthday, yahrzeit, places lived) are deferred (Task 6.3)

### Tree
- Properties: `id` (UUID), `name`, `owner_id`
- Constraints: `id` unique

### User
- Properties: `id` (UUID), `name`, `email`, `password_hash` (Argon2id), `created_at`
- `name`: display name; not unique; not used for login; visible to other users (trees are shared among family, so it is not private)
- `email`: used for login; unique; stored lowercased; private (not shown to other users, except the tree owner when inviting)
- No separate username
- Constraints: `id` unique; `email` unique

### PARENT_OF (relationship)
- `(Person)-[:PARENT_OF {id}]->(Person)`, direction parent → child
- `id` (UUID, generated in Python at creation, same pattern as `Person.id`/`Tree.id`) — NOT `elementId(r)`. Neo4j's own docs warn element IDs aren't guaranteed stable outside a single transaction, can be reused after deletion, and can change across a restore, dump/load, or database copy. Relationships need an explicit application-level `id` property for the same reason nodes have one.
- One edge per parent-child pair; both people must be in the same tree
- No count limit (a child may have >2 parents; a person may parent any number of children) — `PARENT_OF` represents biological parentage only (per scope boundaries). Step/adoptive relationships are deferred: future relationship types (e.g. `STEP_PARENT_OF`, `ADOPTED_PARENT_OF`) once the core app works, not folded into `PARENT_OF` now.
- Enforced in `relationships/repository.py` at creation, via `MERGE` on the exact directed pattern (not `CREATE`) — Neo4j has no constraint type for "at most one edge between these two nodes," so this must be checked/handled in code, not the database
- No self-relationship (`person_a_id != person_b_id`), checked before any Cypher runs
- Cycle prevention (a person cannot become their own ancestor) is deferred to Phase 3, once Task 3.1's ancestor-walk exists — reusing that logic rather than writing a second version early. Until then, this is not checked; avoid creating cyclic data by hand.

### MARRIED_TO (relationship)
- `(Person)-[:MARRIED_TO {id}]->(Person)`
- `id` (UUID, generated in Python at creation) — same reasoning as `PARENT_OF` above
- `marriage_year` (optional integer): shown as "Married" in the UI. Set at creation, editable later with `PATCH /trees/{tree_id}/relationships/{relationship_id}` (the only editable field; to change who is married, delete and recreate). Existing edges have none (null). A person can have several marriages, so "Married" can show several years. `PARENT_OF` edges have no such property.
- One edge per couple; direction is arbitrary and never semantically meaningful — always query with `-[:MARRIED_TO]-` (no arrow)
- No count limit on number of partners (supports polygamous families) — the only rule is no duplicate edge for the *same* pair
- Enforced in `relationships/repository.py` at creation: check both directions for an existing edge before creating (`MERGE` alone only checks one direction, so this needs an explicit check)
- No self-relationship, checked before any Cypher runs

### HAS_ACCESS (relationship)
- `(User)-[:HAS_ACCESS {role}]->(Tree)`
- `role`: `owner` | `editor` | `viewer`
- The owner edge is created with the tree; editor/viewer sharing and enforcement are deferrable

---

## Backend Layering

Organized by feature, **one file per feature**: `auth.py`, `trees.py`, `access.py`, `people.py`, `relationships.py`, `analysis.py` — each holds its own Pydantic schemas, FastAPI routes, and Cypher together. No router/service/repository split: considered, then deliberately dropped as unnecessary ceremony for a solo project at this scale. Shared pieces live in `core/` (config, Neo4j driver, security, dependencies).
- All Cypher is fully parameterized, with `tree_id` on every tree-scoped query.
- The relationship-classification functions in `analysis.py` (`find_common_ancestors`, `classify_relationship`) are written as plain functions with no database calls inside them, so they're still unit tested with plain dicts, even though they live in the same file as routes that do touch the database.
- Tree isolation and Cypher-injection audits mean reading these feature files — there's nowhere else Cypher could be. See `steering/structure.md` for the full layout.
- If Phase 3's access-control logic ends up needing a shared place to live across many routes, reconsider pulling that specific logic into `core/dependencies.py` (already planned) rather than reintroducing a full layered split.

## Authentication & Authorization

### Auth flow (JWT)
1. `POST /auth/register` — hash password (Argon2id via pwdlib), create `User` node in Neo4j, return user info
2. `POST /auth/login` — verify password, issue signed JWT (access token + refresh token)
3. All protected endpoints verify JWT via `get_current_user` FastAPI dependency
4. `POST /auth/refresh` — issue new access token from valid refresh token
5. `POST /auth/logout` — client-side token discard (stateless); no server-side blacklist for MVP

### Tree isolation (privacy invariant)
Every person belongs to exactly one tree, and no edge ever crosses trees. `tree_id` is a property, so isolation is by convention and must be enforced in code:
1. **Same-tree relationships only.** Creating a relationship validates both people exist and share the same `tree_id`; otherwise reject (400/404).
2. **Lookups match on both IDs.** Any person (or relationship) lookup uses both identifiers, e.g. `MATCH (p:Person {id: $pid, tree_id: $tid})`. Never look up by person ID alone, or a guessed UUID could expose another tree's data.
3. **`tree_id` comes from the authorized path.** Use the route's `tree_id` only after the access check passes; never trust a `tree_id` from the request body.
4. **Index on `Person.tree_id`** (alongside `Person.id`) so tree-scoped queries stay fast at 2,500+ people.
5. **Cross-tree test.** A user without access to tree B gets 403/404 on every tree B endpoint, including when they put a valid tree B person ID in a URL under their own tree.

### Authorization enforcement
- `get_accessible_trees(current_user)` dependency — returns IDs of trees the user owns or has been granted access to
- Injected into all `/trees/**` endpoints
- Write operations (add/edit/delete people and relationships) additionally require `role = "editor"` or ownership
- Tree owners have full control (equivalent to editor + can manage access)

---

## Relationship-Path Algorithm

### Approach: ancestor intersection
1. **BFS upward** from each of the two target people via `PARENT_OF` edges (Cypher), bounded to 22 generations. Returns `{ancestor_id: generation_distance}` for each person.
2. **Intersect** the two ancestor sets in Python — each match is a distinct common ancestor / relationship path.
3. **Classify** each path from `(depth_a, depth_b)` using the cousin formula in Python.
4. **Return** all distinct paths with full labels.

### Direct-line rule (found in the Cypher spike)
The BFS must include the person themself at distance 0 (`*0..22`, not `*1..22`). If any common ancestor has distance 0 for either person, one is the other's ancestor: the relationship is a direct line. Report only that, and ignore the other common ancestors, which are just further up the same line. Otherwise, e.g. Eli vs. his mother Cora would also return Ada and Bram at (2, 1) and be misread as "uncle".

### Classification rules (Python)
- `depth_a=1, depth_b=0` (or reverse) → direct line (parent/child)
- `depth_a=0, depth_b=0` → same person (degenerate case, skip)
- `depth_a=1, depth_b=1` → siblings
- `depth_a=2, depth_b=1` (or reverse) → aunt/uncle / niece/nephew
- `depth_a=n, depth_b=n` where n≥2 → nth cousin (degree = n-1)
- `depth_a=n, depth_b=m` where n≠m and both≥2 → cousin with removal (degree = min(n,m)-1, removed = |n-m|)

### Depth bound
22 generations — invisible safety rail, not user-configurable.

### Cypher BFS query (sketch)
```cypher
MATCH path = (start:Person {id: $person_id})-[:PARENT_OF*0..22]->(ancestor:Person)
WHERE ancestor.tree_id = $tree_id
RETURN ancestor.id AS ancestor_id, length(path) AS depth
```

**Caution:** the sketch above enumerates every route to each ancestor. With pedigree collapse the route count grows exponentially while the number of distinct people stays small, and `min()`/`DISTINCT` after the match does not reduce the work. The implementation should instead climb one generation at a time, using a set of people per generation (one parameterized Cypher query per generation, ≤22 rounds), recording all distinct distances per ancestor. See Task 3.1.

### Split of responsibility
- Traversal → Cypher (Neo4j-native, efficient)
- Classification/labeling → Python (testable, readable)

---

## API Design

### URL structure
Every data route is served under the `/api` prefix (e.g. `/api/trees`, `/api/auth/login`, `/api/me`), and so are the generated docs (`/api/docs`). The frontend's dev proxy and any production reverse proxy forward `/api/*` unchanged. `GET /` (health check) and `/demo` stay unprefixed. The prefix also keeps API calls separate from React page URLs like `/trees`.

All tree-scoped resources live under `/api/trees/{tree_id}/`.
Authorization is enforced at the tree level via the `get_accessible_trees` dependency.

### Key endpoint decisions
- `GET /trees/{tree_id}/graph` accepts optional `root_person_id` and `depth` query params — avoids pulling all 2,500 people for visualization by default
- `GET /trees/{tree_id}/relationship-path?person_a={id}&person_b={id}` returns an array of path objects (multiple paths possible)
- Relationship IDs are the Neo4j internal relationship ID (or a generated UUID on the edge) — needed for DELETE

### Full endpoint list
See `plan/original-spec.md` → "API Endpoint List" section.

---

## Frontend Architecture

### Routing
```
/                          → LandingPage (public)
/login                     → LoginPage
/register                  → RegisterPage
/trees                     → TreesPage (card grid + New tree)
/trees/:id                 → TreeView (left pane + graph/tree canvas + details card)
/trees/:id/members         → MembersPage (table of the current tree's people only)
/trees/:id/members/:personId → MemberPage (details + family links)
```
Everything under `/trees` requires login (`ProtectedRoute`). Members pages belong to one tree, so the top-bar "Members" link only appears while a tree is open. These are React page URLs; the data API lives under `/api`.

### State management
No Redux/Zustand for MVP — React component state + prop passing is sufficient at this scale.
If it gets unwieldy in Phase 4, add Zustand (lightweight).

### Graph rendering: Sigma.js + graphology
**Decision (changed from Cytoscape.js):** the graph is rendered with Sigma.js (WebGL) on top of a graphology graph. Reason: trees larger than 2,500 people are an explicit goal and a differentiator for the app, and Sigma is built for large graphs. Switching was cheapest before any React graph code existed.

- Wrapped in a `TreeGraph` React component; Sigma is created/destroyed in `useEffect` because it owns its own canvas.
- Graph data passed as props: `{ nodes: [...], edges: [...] }`, loaded into a graphology graph; later changes add only new nodes/edges.
- Sigma is a **renderer only** — layouts come from separate packages: ForceAtlas2 (`graphology-layout-forceatlas2`, run in a web worker) for the force view, and `dagre` positions written onto the nodes for the hierarchical "traditional tree" view. Layout toggled via a prop: `"force"` or `"tree"`.
- `MARRIED_TO` edges are dashed via Sigma 4's `layerDashed`/`createEdgeProgram`; `PARENT_OF` edges stay solid.
- Collapse/expand is done by toggling the `hidden` attribute on graphology nodes/edges.
- Node click fires a callback (Sigma's `clickNode` event) → updates selected person in parent state → opens `PersonPanel`.
- Trade-off accepted: more assembly than Cytoscape (renderer + layout packages + hand-built collapse/expand), in exchange for headroom at scale.
- Rendering speed is only one limit on large trees. Fetching, laying out and drawing the whole tree at 10,000+ people will also need loading a part of the tree at a time (the `/graph` endpoint's planned root-person/depth options) and clustering when zoomed out.
- **Measured 2026-11-11 (10,000 people, 14,000 links):** the dominant costs were the database round trips and the layout, not the drawing. `GET /graph` went from ~5 s to ~2 s by (a) fetching whole results in one round trip in `run_query` (`fetch_size=-1`; the default pages 1,000 rows per round trip), (b) returning nodes and edges as two lists in one row, and (c) returning `JSONResponse` so FastAPI does not run `jsonable_encoder` over 24,000 items (~0.6 s). The Tree view layout is the other scaling limit: dagre took 25 s for 2,500 people (3 s with its `longest-path` ranker, still ~45 s extrapolated to 10,000), so trees above 1,500 couples use a simple linear-time layered layout (0.2 s for 10,000) with a barycenter ordering. The Graph view (ForceAtlas2 in a worker) never blocks the page.
- The `/demo` page is separate throwaway code and still uses Cytoscape from a CDN; it is not part of this decision.

---

## Visual Design

**Source:** the "Grapht Design System" canvas on claude.ai (https://claude.ai/artifact/Cfqd3pr4Tt38gA87VC1DTx), 7 artboards: tree view, Trees, Members, Member, Landing, Foundations, Components. It fixes the structure and feel; many more screens will follow in the same style.

### Principles
- Light, airy, friendly. White pages, a pale-blue graph canvas, one confident blue accent. Dark mode mirrors every token.
- Flat and outlined: no shadows, nothing floats. 2px dividers and borders in the `rule` color. Pill-shaped buttons and toggles.
- Controls are at least 44px tall (48px in the tree view's left pane). Icons are inline stroke SVG (2px stroke, round caps), never emoji.
- Minimal motion: hover tints and instant open/close.

### Tokens (semantic names; each has a light and a dark value)
| Token | Light | Dark | Use |
|---|---|---|---|
| `page` | #FFFFFF | #0F1724 | pages, header, left pane |
| `canvas` | #F2F8FC | #0B121E | graph panel, tree thumbnails |
| `chrome` | #DCECF8 | #1C2940 | logo pill, toggles, soft buttons |
| `hover` | #E8F3FB | #1A2638 | row and button hover |
| `rule` | #D3E6F5 | #22314A | dividers, card borders |
| `ink` | #0F2A43 | #E6ECF5 | text, selected-node ring |
| `muted` | #4A627A | #9FB0C8 | labels, captions |
| `accent` | #0F6CBD | #6EA8FE | actions, active nav |
| `on-accent` | #FFFFFF | #0B1220 | text on accent |
| `node-a` | #1E88E5 | #4D9CF0 | person, deep blue |
| `node-b` | #7CC0F2 | #9BCBF7 | person, sky blue |
| `edge` | #A9BCCD | #3A4961 | graph lines |
| `card` | #FFFFFF | #142033 | member card, menus |
| `off` | #8591A3 | #5D6B82 | disabled |

### Type
- **Fraunces 600:** logo (22px), page titles (36px), member name (56px).
- **Cormorant Garamond 500:** landing headline only (up to 136px, tight tracking).
- **DM Sans 400/500/700:** everything else. Body and controls 15–16px, nav 17px, field labels and captions 13px muted, member-page values 26px, small uppercase section headings 15px.

### Shape and space
Radii: 12 (rows), 16 (logo pill, graph panel), 20 (cards), 24 (tree cards), 48 (landing band), pill (999). Spacing in steps of 4 and 8px.

### Screens and behavior
- **Logo (decided 2026-11-11):** the supplied "GRAPHT" lettering in Fraunces with roots beneath, stored as `frontend/public/logo.png` (navy on a transparent background, trimmed). It replaces the text "grapht" pill in the app header (links to `/trees`) and the text wordmark on the landing page, through the `Logo` component; in dark mode a CSS filter in `index.css` draws it light. The source image was white-backed; the cleanup script is not kept in the repo (ink coverage became alpha). A vector (SVG) version would be crisper at large sizes if one exists.
- **App shell:** top bar with the logo, nav tabs (Trees, Members; the active tab has a 3px accent underline), a light/dark toggle and a user button.
- **Tree view:** left pane (220px) with a Graph/Tree pill toggle, search that expands inline with a results list, Add member, Edit and Delete (disabled until a person is selected, tooltip "Select a person first"), and a "Relationship calculator" link at the bottom. Click a person to select (ink ring). Two small round buttons appear beside them: "/" opens a details card (top right: Born, Birthplace, Married) and "+" opens an "Add to X: Parent, Spouse, Child" bar at the bottom. Clicking empty canvas clears the selection.
- **Trees:** card grid with a decorative graph thumbnail, the tree name and "N members", plus a dashed "New tree" card.
- **Members:** search field and a table (Name, Born, Birthplace, Married); each row opens the member.
- **Member:** large name, tree name, "Show in tree" link, edit pencil; a Details column (Born, Birthplace, Married) and a Family column (Parents, Spouse, Children as links).
- **Landing:** header (logo, How it works, Contact, Get started), a very large "See your whole family." headline and a band with a graph illustration. **Decision: it uses the same tokens as the app, with no separate palette.** `page` background, `ink` text, an `accent` "Get started" button, and the graph band uses `chrome` with `node-a`/`node-b` nodes and `edge` lines. Only the headline typeface (Cormorant Garamond) is specific to this page. The Landing artboard's own navy palette (#1F3A5A and friends) is superseded.

### Graph styling
- Nodes alternate `node-a` and `node-b` purely for visual variety; the colors carry no meaning. Assign by a hash of the person's id so a person keeps the same color between loads.
- Selected node: ink ring (2.5px) and slightly larger. Edges use `edge`, 1.4px; `MARRIED_TO` is dashed, `PARENT_OF` solid. **Labels (decided 2026-11-11):** the Graph view shows a person's name only when zoomed in close enough to read it; the Tree view shows the name under each node.
- **Click behavior (changed 2026-11-12, replaces the mock-up's "/" and "+" buttons):** clicking a person selects them (ink ring) and a card pops up right beside them, above any nearby nodes, showing Born, Birthplace and Married with a small pencil in its top-right corner; the pencil opens the edit form. Clicking empty canvas dismisses it. **Add parent / spouse / child and Delete live inside the edit form.** There is no left panel any more: search, the Graph/Tree switch, the relationship calculator and "Add member" are in the top bar on the tree page. The theme toggle in the top bar became a settings (gear) icon that opens a Settings page; the theme (Light / Dark) is a field there. The landing page keeps its own light/dark toggle because logged-out visitors have no settings page.
- **Start view (decided 2026-11-11):** a tree opens as the whole tree in Graph view. Loading by neighborhood (a few generations around a person) is Phase 4 work for very large trees.
- **Multiple marriages in the Tree view (decided 2026-11-11):** a person with several marriages sits in the middle of a row with their spouses beside them. The **current** spouse is the one right next to the person; **past** (divorced) marriages sit further out and their marriage lines are faded grey. A marriage is past when its `divorced` flag is true (a boolean on `MARRIED_TO` with an optional `divorce_year`, Task 2.z, both editable in the Edit dialog).
- The selection ring and the pop-up card are ordinary HTML elements positioned over the canvas next to the selected node (using Sigma's graph-to-screen coordinate conversion), not canvas drawing. The card flips to the left of the node near the right edge and is kept inside the canvas.
- Sigma draws on a canvas, so it cannot use CSS classes. Read the token values from the CSS variables (`getComputedStyle(document.documentElement)`) on mount and whenever the theme changes, so the graph follows the same single source.

### Styling approach: Tailwind CSS v4 with semantic tokens and a component layer
Chosen over plain CSS because many more screens are coming and the goal is the least verbose, most maintainable styling that repeats cleanly across pages. (shadcn/ui was dropped: it ships its own look.)
1. **Tokens live once**, in `frontend/src/index.css`: raw values as CSS variables on `:root` (light) and `[data-theme="dark"]`, exposed to Tailwind as semantic utilities (`bg-page`, `text-ink`, `border-rule`, `text-accent`) through `@theme inline`. Components never write `dark:` variants: switching `data-theme` recolors everything, which keeps class lists short. To rebrand or fix a color, change one line.
2. **Fonts, radii and sizes are theme entries too** (`font-display`, `font-hero`, `rounded-card`), so markup reads `font-display text-4xl`, not raw values. Fonts are self-hosted (fontsource), not loaded from a CDN.
3. **Component layer:** pages compose, components style. The long class strings live only in `frontend/src/components/ui/` (Button, PillToggle, Card, TextField, NavTab, AppShell/AppHeader, icons, table rows). A page should read like `<Page><h1>…</h1><CardGrid>…</CardGrid></Page>`.
4. **Rules for every new screen:** reuse `ui/` components; need a new color or size, add a token and never hard-code a hex; if a class combination repeats three or more times, extract a component; check both themes.
5. **Theme:** `data-theme` on `<html>`, toggle in the top bar, saved in `localStorage`, defaulting to the OS setting (`prefers-color-scheme`).
6. A dev-only `/styleguide` page renders every `ui/` component in both themes (it mirrors the Components artboard) so new screens have a reference.

### Open items
- Login, register, empty states, modals (new tree, delete confirmation), the relationship-calculator results, collapse/expand controls and sharing screens are not mocked yet.
- Decided: every screen uses the one token set above. The Member artboard's light divider (#E3E8EE) is a typo; use `rule` (#D3E6F5) there like everywhere else. The mock-up canvas itself still shows the old Landing and Member values; `design.md` is the source of truth.

---

## Security Checklist (Phase 3)
- [ ] All Cypher queries parameterized — no string interpolation
- [ ] Tree isolation invariant enforced (see "Tree isolation" above), with cross-tree test
- [ ] Passwords hashed with Argon2id (per OWASP; never stored plain, never returned in responses)
- [ ] JWT secret in `.env` — never committed
- [ ] CORS configured to allow only the frontend origin
- [ ] Auth endpoints rate-limited
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` committed with placeholder values

---

## Cuttable Scope (under time pressure, in priority order)
1. E2E tests
2. Branch collapse/expand
3. Second view mode (traditional layout) — keep only graph layout
4. Editor/viewer roles — simplify to owner-only access (no sharing)
