# Technical Design

Consolidated technical decisions. See `steering/tech.md` for the full stack and `steering/structure.md` for the directory layout.

---

## Data Model

### Neo4j (family tree data)

**Nodes**
- `Person` — properties: `id` (UUID), `tree_id`, `name`, `birth_year` (optional), `death_year` (optional), `birth_place` (optional), `notes` (optional)
- `Tree` — properties: `id` (UUID), `name`, `owner_id`
- `User` — properties: `id` (UUID), `name` (required display name), `email` (unique, lowercased), `password_hash` (Argon2id), `created_at`

**Edges**
- `(Person)-[:PARENT_OF]->(Person)` — directed, parent → child
- `(Person)-[:MARRIED_TO]->(Person)` — undirected (store one direction, query both)
- `(User)-[:HAS_ACCESS {role: "editor"|"viewer"}]->(Tree)` — access control

No `Family` node. Pure person-to-person edges.

### User/account data
Stored in Neo4j as `User` nodes (see above), not a separate relational database. Chosen for simplicity: one datastore, no sync, nothing to lose on container redeploys, and users connect to trees via `HAS_ACCESS`. Unique constraints on `User.email` and `User.id` are enforced in the database. Revisit if a real need for a relational store appears (e.g., backups, since AuraDB Free has none).

---

## Backend Layering

Organized by feature (`auth`, `trees`, `access`, `people`, `relationships`, `analysis`), each with `router.py` → `service.py` → `repository.py` plus `schemas.py`. Shared pieces live in `core/` (config, Neo4j driver, security, dependencies).
- Router: HTTP only. Service: rules and orchestration. Repository: all Cypher, fully parameterized, `tree_id` on every tree-scoped function.
- Only repositories import the database driver. The relationship algorithm (`analysis/algorithm.py`) is pure Python and has no database access, so it is unit tested with plain dicts.
- Benefit: tree isolation and Cypher-injection audits only need to read the `repository.py` files. See `steering/structure.md` for the full layout.

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
All tree-scoped resources live under `/trees/{tree_id}/`.
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

### Cytoscape.js integration
- Wrapped in a `TreeGraph` React component
- Graph data passed as props: `{ nodes: [...], edges: [...] }`
- Layout toggled via a prop: `"force"` or `"hierarchical"`
- Node click fires a callback → updates selected person in parent state → opens `PersonPanel`

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
