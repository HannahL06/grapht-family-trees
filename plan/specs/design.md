# Technical Design

Consolidated technical decisions. See `steering/tech.md` for the full stack and `steering/structure.md` for the directory layout.

---

## Data Model

Neo4j has no fixed schema: labels, properties and relationship types exist by convention. Only constraints and indexes are enforced by the database (created by `core/schema.py`). Everything lives in Neo4j, including users (one datastore, nothing lost on redeploys). No `Family` node: pure person-to-person edges.

### Person
- Properties: `id` (UUID), `tree_id`, `name`, `birth_year` (optional), `death_year` (optional), `birth_place` (optional), `notes` (optional)
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
/                → redirect to /login or /trees
/login           → LoginPage
/register        → RegisterPage
/trees           → TreesPage (list + create)
/trees/:id       → TreeView (main visualization + controls)
```

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
- The `/demo` page is separate throwaway code and still uses Cytoscape from a CDN; it is not part of this decision.

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
