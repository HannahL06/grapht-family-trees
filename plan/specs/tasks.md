# Task List

Each task is ~1–2 hours and written as a self-contained brief you can hand to a coding agent.
Before handing a task to an agent, paste in the relevant steering files (`product.md`, `tech.md`, `structure.md`) as context.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` skipped/cut

---

## Phase 1 — Data Model & Backend Foundations (~16 hrs, ~weeks 1–6)

### 1.1 Cypher spike — DO THIS YOURSELF, no agent [X]
**Goal:** Get hands-on with Neo4j before building anything on top of it.
**Steps:**
1. Open AuraDB Aura Console → Query tab
2. Manually create 10–15 Person nodes with `CREATE` statements
3. Add `PARENT_OF` edges between them (include at least one grandparent relationship and one cousin pair)
4. Write and run an ancestor BFS query: starting from one person, traverse `PARENT_OF` edges upward, return each ancestor and how many hops away they are
5. Write and run the intersection: do the same BFS for a second person, compare the two ancestor sets by hand

**Done when:** You can write the BFS query yourself, understand what it returns, and feel confident you could review Cypher an agent writes.
**Why first:** This is the biggest unknown-unknown. If it's harder than expected, you want to know in Week 1, not Week 6.

---

### 1.x Practice AuraDB instance (optional, do anytime) [ ]
Create a second AuraDB Free instance to use as a staging/practice environment, separate from the real instance (per discussion — same relationship as staging vs. production). Steps: (1) create a new free instance in the Aura console, (2) note its URI/username/password, (3) add them to `backend/.env` under different names, e.g. `NEO4J_PRACTICE_URI`, `NEO4J_PRACTICE_USERNAME`, `NEO4J_PRACTICE_PASSWORD` (and matching entries in `.env.example` with placeholders), (4) when practicing something risky (new Cypher, seed script changes, anything involving `DETACH DELETE`), manually point `core/config.py`/`core/db.py` at the practice credentials instead of the real ones. Not wired into the app automatically — a manual swap, not a feature. Can be done at any point, independent of task order; not blocking anything else in Phase 1.

**Done when:** A second free instance exists, its credentials are in `.env`/`.env.example`, and you've successfully run a throwaway query against it without touching the real instance.

---

### 1.2 Python project scaffold [x]
**Agent brief:** Create a Python FastAPI project in a `backend/` directory. Structure: `backend/app/main.py` (FastAPI app entry point), `backend/app/core/` (empty placeholder files `config.py`, `db.py`, `security.py`, `dependencies.py`), and one empty placeholder file per feature directly under `backend/app/`: `auth.py`, `trees.py`, `access.py`, `people.py`, `relationships.py`, `analysis.py` — each will later hold its own schemas, routes, and Cypher together, one file per feature, no further split (see `structure.md`; do not add real content to those files yet), `backend/tests/` directory with a placeholder test, `backend/seed/` directory. Create `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `neo4j`, `PyJWT`, `pwdlib[argon2]`, `python-dotenv`, `pytest`, `httpx`. In `main.py`, create the FastAPI app and add a `GET /` health check route that returns `{"status": "ok"}`. Create a `backend/.env.example` file showing the env vars that will be needed: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `JWT_SECRET`.

**Done when:** `uvicorn app.main:app --reload` starts without errors and `GET /` returns `{"status": "ok"}`.

---

### 1.3 Neo4j connection module [x]
**Agent brief:** In `backend/app/core/db.py`, create a Neo4j driver connection using the `neo4j` Python driver. Load `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` from environment variables via `python-dotenv`. Create a `get_driver()` function and a `run_query(query, params)` helper that opens a session, runs the query, and returns the results as a list of dicts. Create a `backend/.env` file (not committed) with the AuraDB credentials. Add a simple connectivity test: a function that runs `RETURN 1 AS n` and prints success/failure.

**Done when:** Running `python -c "from app.core.db import test_connection; test_connection()"` from `backend/` prints a success message and does not raise.

---

### 1.4 Seed script — small dataset [x]
**Agent brief:** Create `backend/seed/seed.py`. It should connect to Neo4j using the same `app/core/db.py` connection. Clear all existing data first (`MATCH (n) DETACH DELETE n`). Then create: 20 Person nodes with properties `id` (UUID), `tree_id` (use a fixed UUID for now), `name`, and optional `birth_year`. Create `PARENT_OF` edges to form: 2 grandparent pairs at the top, 2 sets of parents below them, 4 people in the "current generation" — including at least one cousin marriage (two cousins who are also partners). Add `MARRIED_TO` edges for the couples. Print a summary of how many nodes and edges were created.

**Done when:** Script runs without errors, and the Aura Console shows the expected nodes and edges.

---

### 1.5 Pydantic models [x]
**Agent brief:** Create Pydantic schemas directly in each feature file (no separate `schemas.py` — one file per feature holds its schemas, routes, and Cypher together). In `people.py`: `PersonCreate` (fields: `name` required, `birth_year` optional int, `death_year` optional int, `birth_place` optional str, `notes` optional str), `PersonUpdate` (all fields optional), `PersonResponse` (all fields + `id` str + `tree_id` str). In `trees.py`: `TreeCreate` (name required), `TreeUpdate` (name optional), `TreeResponse` (id, name, owner_id). In `relationships.py`: define `RelationshipType(str, Enum)` with values `PARENT_OF` and `MARRIED_TO` (not a plain string) — FastAPI then rejects any other value at the API boundary and shows the two options as a dropdown in `/docs`. `RelationshipCreate` (person_a_id, person_b_id, `type: RelationshipType`), `RelationshipResponse` (relationship_id, person_a_id, person_b_id, `type: RelationshipType`). In `auth.py`: `UserCreate` (name, email, password), `UserResponse` (id, name, email).

**Done when:** `python -c "from app.people import PersonCreate; PersonCreate(name='Test')"` runs without error.

---

### 1.6 Tree CRUD endpoints [x]
**Agent brief:** Implement the trees feature in `backend/app/trees.py` — schemas, routes, and Cypher (via `core/db.py`) all in this one file. Implement these endpoints. Use a hardcoded `owner_id = "dev-user"` for now (auth comes later). Endpoints: `POST /trees` (create Tree node in Neo4j, return TreeResponse), `GET /trees` (return all trees where owner_id matches), `GET /trees/{tree_id}` (return one tree or 404), `PATCH /trees/{tree_id}` (update name), `DELETE /trees/{tree_id}` (detach delete tree and all its Person nodes). Register the router in `main.py`.

**Done when:** All five endpoints work correctly via the FastAPI docs UI (`/docs`). Create a tree, fetch it, rename it, delete it.

---

### 1.7 People CRUD endpoints [x]
**Agent brief:** Implement the people feature in `backend/app/people.py` — schemas, routes, and Cypher in this one file, same pattern as `trees.py`. All people belong to a tree (stored as `tree_id` property on Person nodes). Endpoints: `POST /trees/{tree_id}/people` (create Person node, return PersonResponse), `GET /trees/{tree_id}/people` (list all people in tree; support optional `?search=` query param that filters by name), `GET /trees/{tree_id}/people/{person_id}` (return one person or 404), `PATCH /trees/{tree_id}/people/{person_id}` (update person fields), `DELETE /trees/{tree_id}/people/{person_id}` (detach delete person node). Register the router in `main.py`.

**Tree isolation (see `design.md`):** every person lookup, update and delete must match on both `id` and `tree_id` (e.g. `MATCH (p:Person {id: $pid, tree_id: $tid})`), all parameterized; return 404 if no match. Create an index on `Person.id` and `Person.tree_id`. Every Cypher-touching function in `people.py` takes `tree_id`.

**Done when:** All five endpoints work via `/docs`. Add 3 people to a tree, search for one by name, edit one, delete one. Requesting a person via a different tree's ID in the URL returns 404.

---

### 1.8 Relationship CRUD endpoints [x]
**Agent brief:** Implement the relationships feature in `backend/app/relationships.py` — schemas, routes, and Cypher in this one file. Implement: `POST /trees/{tree_id}/relationships` — given `RelationshipCreate` body, create either a `PARENT_OF` or `MARRIED_TO` edge between the two people in Neo4j, generating a UUID in Python and storing it as an `id` property on the edge (same pattern as `Person.id` — see `design.md`; do NOT use `elementId(r)`, which is not guaranteed stable across restores/dumps/copies per Neo4j's own docs). Return `RelationshipResponse` including that `id` as `relationship_id`. `DELETE /trees/{tree_id}/relationships/{relationship_id}` — delete the relationship by matching on its `id` property, not `elementId()`. Validate that both people exist and belong to the specified tree before creating the relationship. Register the router in `main.py`.

**Relationship enforcement (see `design.md`):**
- Reject if `person_a_id == person_b_id` (no self-relationship), before any Cypher runs.
- `PARENT_OF`: use `MERGE` on the exact directed pattern `(a)-[:PARENT_OF]->(b)`, not `CREATE` — Cypher does not deduplicate on its own, and `CREATE` run twice makes two parallel edges that both exist and both show up in traversals/counts. No limit on number of parents or children.
- `MARRIED_TO`: before creating, explicitly check both directions for an existing edge (`MERGE` alone only checks the one direction you write). No limit on number of partners (polygamy is in scope) — reject only an exact duplicate pair.
- Cycle prevention for `PARENT_OF` is explicitly OUT of scope for this task — deferred to Phase 3 (Task 3.1+), once the ancestor-walk exists to reuse. Do not implement a separate cycle check here.

**Tree isolation:** reject with 400/404 if the two people are not both in the tree from the URL (no cross-tree edges). Deleting a relationship must also verify it connects people in that tree.

**Done when:** Can create a PARENT_OF edge between two people, verify it in Aura Console, then delete it via the API. Trying to link two people from different trees is rejected. Submitting the same PARENT_OF or MARRIED_TO pair twice does not create a duplicate edge. Creating two MARRIED_TO edges from one person to two different partners succeeds (polygamy case).

---

### 1.9 User model + registration endpoint [x]
**Agent brief:** Store user accounts in Neo4j as `(:User {id, name, email, password_hash, created_at})` nodes (no separate relational database). On app startup, run `CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE` and an equivalent unique constraint on `User.id`. In `backend/app/auth.py` (schemas, routes, and Cypher together; hashing helpers come from `core/security.py`), implement `POST /auth/register`: accept `UserCreate`, hash the password with `pwdlib` using Argon2id (`PasswordHash.recommended()`, per OWASP and the FastAPI docs), create the User node with a parameterized query, catch the Neo4j constraint-violation error and return 400 if the email is already taken, and return `UserResponse` (never return the hash). Normalize emails to lowercase before storing. Register the router in `main.py`.

**Done when:** `POST /auth/register` with a new email returns 201 + user info. A second call with the same email returns 400. The User node appears in Aura Console with a hash, not a plain password.

---

### 1.10 JWT login, logout, refresh [x]
**Agent brief:** In `backend/app/auth.py` (routes and Cypher together; JWT create/verify helpers in `core/security.py`), add: `POST /auth/login` — look up the User node by email in Neo4j, verify the password against `password_hash` with `pwdlib`, issue a signed JWT access token (expires in 1 hour) and a refresh token (expires in 7 days) using `PyJWT`. Use the same generic error for unknown email and wrong password. Return both tokens. `POST /auth/refresh` — accept a valid refresh token, return a new access token. `POST /auth/logout` — return 200 (stateless: client discards the token). In `backend/app/core/dependencies.py`, create a `get_current_user` FastAPI dependency that reads the Bearer token from the Authorization header, verifies it, and returns the user. Add a protected test route `GET /me` that requires `get_current_user` and returns the current user's info.

**Done when:** Login returns tokens. `GET /me` with a valid token returns user info. `GET /me` with no token or an invalid token returns 401.

---

### 1.11 Wire auth into tree endpoints (stub access guard) [ ]
**Agent brief:** Update all `/trees/**` endpoints to require authentication via the `get_current_user` dependency. Replace the hardcoded `owner_id = "dev-user"` with the actual `current_user.id` from the dependency. For now, scope all tree queries to only return/modify trees where `owner_id == current_user.id` (full role-based sharing comes in Phase 3). This is a temporary stub — the comment `# TODO: Phase 3 — expand to include shared trees` should be left where the access check is.

**Done when:** Creating a tree while logged in saves the correct owner. Fetching `/trees` only returns that user's trees. Accessing another user's tree returns 403.

---

## Phase 2 — Preliminary UI (~10 hrs, ~weeks 7–9)

### 2.1 React + Vite project setup [ ]
**Agent brief:** In the project root, initialize a new Vite React project in a `frontend/` directory using the `react` template. Install these additional dependencies: `axios`, `react-router-dom`, `cytoscape`. Create this directory structure inside `frontend/src/`: `api/` (empty), `components/` (empty), `pages/` (empty). In `vite.config.js`, add a dev proxy: requests to `/api` are proxied to `http://localhost:8000`. Update `App.jsx` to render just a `<h1>Grapht</h1>` placeholder.

**Done when:** `npm run dev` starts the dev server, browser shows "Grapht", no console errors.

---

### 2.2 API client + auth API module [ ]
**Agent brief:** Create `frontend/src/api/client.js`: an Axios instance with `baseURL: '/api'`. Add a request interceptor that reads the JWT access token from `localStorage` (key: `"access_token"`) and attaches it as `Authorization: Bearer <token>` if present. Create `frontend/src/api/auth.js` with three functions: `register(email, password)`, `login(email, password)` (stores returned tokens in localStorage), `logout()` (clears localStorage tokens).

**Done when:** Can call `login()` from the browser console, token appears in localStorage, and a subsequent API call includes the header.

---

### 2.3 Login and Register pages + routing [ ]
**Agent brief:** Create `frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx`. Each should have a simple form (email + password fields, plus a name field on the register page, submit button) that calls the corresponding auth API function. On success, redirect to `/trees`. On error, show the error message. In `App.jsx`, set up React Router with routes: `/login` → LoginPage, `/register` → RegisterPage, `/trees` → placeholder "Trees page" div, `/` → redirect to `/login`. No styling required — functional only.

**Done when:** Can register a new user, get redirected to `/trees`, log in with that user from the login page.

---

### 2.4 Tree list and create page [ ]
**Agent brief:** Create `frontend/src/pages/TreesPage.jsx`. On mount, call `GET /trees` and display a list of tree names. Include a simple form (just a name input) to create a new tree via `POST /trees`. After creating, refresh the list. Add a link from each tree name to `/trees/:id`. Create `frontend/src/api/trees.js` with `getTrees()` and `createTree(name)` functions.

**Done when:** Trees page loads, shows existing trees, create form works, new tree appears in the list.

---

### 2.5 Add person form [ ]
**Agent brief:** Create `frontend/src/pages/TreeView.jsx` (stub — just shows the tree ID for now). Create `frontend/src/components/PersonForm.jsx`: a form with fields for name (required), birth_year, death_year, birth_place, notes. On submit, call `POST /trees/{tree_id}/people`. Accept `treeId` and an `onSuccess` callback as props. Create `frontend/src/api/people.js` with `addPerson(treeId, personData)`. Add the PersonForm to TreeView, calling it with the current treeId.

**Done when:** Can navigate to a tree, fill in the form, submit, and confirm the person appears in the AuraDB Aura Console.

---

### 2.6 Add relationship form [ ]
**Agent brief:** Create `frontend/src/components/RelationshipForm.jsx`. It should: fetch the list of people in the current tree (`GET /trees/{tree_id}/people`), show two person-select dropdowns (person A, person B), a radio/select for relationship type (PARENT_OF or MARRIED_TO), and a submit button. On submit, call `POST /trees/{tree_id}/relationships`. Accept `treeId` and `onSuccess` as props. Add it to TreeView alongside PersonForm. Create `frontend/src/api/relationships.js` with `addRelationship(treeId, data)`.

**Done when:** Can select two people, create a PARENT_OF relationship, and verify the edge appears in the Aura Console.

---

### 2.7 Graph visualization (rough) [ ]
**Agent brief:** Add a `GET /trees/{tree_id}/graph` endpoint to the backend (in `backend/app/analysis.py`). [Backend piece built early, during Task 1.9's demo-page hookup — see schedule.md.] It should fetch all Person nodes in the tree and all PARENT_OF and MARRIED_TO edges between them, and return `{ nodes: [{id, name}], edges: [{source, target, type}] }`. Then in the frontend, create `frontend/src/components/TreeGraph.jsx`: a component that accepts `nodes` and `edges` props and renders them with Cytoscape.js using the `cytoscape-fcose` layout (install `cytoscape-fcose`; it's a faster, better-scaling variant of `cose` — prefer it over plain `cose` from the start, since it also naturally spaces out distant/weakly-connected branches). Mount the Cytoscape instance on a `div` that fills the available space. In TreeView, fetch the graph data on mount and render `<TreeGraph>`. No styling required.

**Done when:** Navigating to a tree renders the nodes and edges from seed data as a graph. The layout is messy but the nodes are there.

---

## Phase 3 — Algorithm, Access Control, Security (~13 hrs, ~weeks 10–13)

### 3.1 Cypher BFS ancestor query [ ]
**Agent brief:** In `backend/app/analysis.py`, write a `get_parents(person_ids, tree_id)` function (Cypher, via `core/db.py`) that returns the parents of a whole set of people, and a `get_ancestors(person_id, tree_id)` function that uses it to find all ancestors of a given person via `PARENT_OF` edges, bounded to 22 generations. Include the person themself at distance 0. Return a dict `{ancestor_id: set_of_distances}` (an ancestor reached at several distances keeps all of them).

**Pitfall — do NOT use a single variable-length pattern like `(a)-[:PARENT_OF*0..22]->(anc)`.** It enumerates every *route*, not every person. With cousin marriages (pedigree collapse), one ancestor can be reached by thousands or millions of routes, so the query becomes very slow even if `min()` is applied afterward (aggregation happens after all paths are found). Instead climb one generation at a time: keep a *set* of people at the current generation, run one parameterized query per generation fetching all their parents (`WHERE child.id IN $ids AND child.tree_id = $tree_id`), record the distance for each parent, and use that set of parents as the next generation. Stop at 22 rounds or when the set is empty. Sets dedupe, so work scales with distinct ancestors. Test on a small dataset with repeated cousin marriages, and use `PROFILE` if anything is slow. The query must be fully parameterized — no string interpolation. Test it manually against the seed data: run it for one person and verify the returned ancestors match what you built in the seed script.

**Done when:** Function returns correct ancestors with correct depths for people in the seed dataset, verified by manual inspection.

---

### 3.2 Ancestor intersection and path finding (Python) [ ]
**Agent brief:** In `backend/app/analysis.py`, write `find_common_ancestors` as a pure function — plain data in, plain data out, no database calls inside it (see `structure.md`) — so it stays unit-testable with plain dicts even though it lives in the same file as the route functions. `find_common_ancestors(ancestors_a, ancestors_b)` that takes two ancestor dicts `{id: set_of_distances}` (each includes the person themself at distance 0, as returned by Task 3.1) and returns a list of `{ancestor_id, depth_a, depth_b}` for every common ancestor and every distinct (distance in A, distance in B) combination. Direct-line rule: if any common ancestor has distance 0 for either person, one is the other's ancestor, so return only the results where a distance is 0 and ignore the rest (see `design.md`). If both people are the same person, return an empty list (the API handles that case before calling). Write unit tests in `backend/tests/test_algorithm.py` covering: direct parent-child (one person is ancestor of the other, e.g. a child vs. their mother must not also return the grandparents as an uncle/aunt relationship), siblings (one common parent), first cousins (one common grandparent), and a double-cousin case (two common grandparents from different lines).

**Done when:** `pytest` passes all tests.

---

### 3.3 Relationship classification (Python) [ ]
**Agent brief:** In `backend/app/analysis.py`, write a function `classify_relationship(depth_a, depth_b)` that takes two generation distances and returns a human-readable relationship label string. Rules: if one depth is 0 and other is 1 → "parent" or "child"; both 1 → "sibling"; one is 2 and other is 1 → "aunt/uncle" or "niece/nephew"; both equal n≥2 → "{n-1} cousin" (e.g., both 2 → "1st cousin", both 3 → "2nd cousin"); unequal where both≥2 → "{min-1} cousin {|diff|} times removed". Write unit tests for all these cases plus a "2nd cousin once removed" case.

**Done when:** `pytest` passes all classification tests.

---

### 3.4 Relationship-path API endpoint [ ]
**Agent brief:** In `backend/app/analysis.py`, implement `GET /trees/{tree_id}/relationship-path?person_a={id}&person_b={id}`. It should: call `get_ancestors` for both people, call `find_common_ancestors`, then call `classify_relationship` for each common ancestor, and return a list of `{ancestor_id, ancestor_name, label}` objects. If no common ancestors are found, return an empty list with a message. Require authentication. Test against seed data for the cousin-marriage pair — should return multiple paths.

**Done when:** The endpoint returns multiple relationship paths for the cousin-marriage pair in the seed data, with correct labels.

---

### 3.x Re-evaluate flat vs. layered structure (do this first, before 3.5) [ ]
Before building access control (3.5–3.7), stop and reconsider the flat one-file-per-feature structure (see `structure.md`) against the router/service/repository split that was deliberately dropped back at Task 1.6. The reason to revisit now: access control is exactly the kind of cross-cutting rule ("editor can write, viewer can't") that was flagged as the trigger for needing a shared place for logic, rather than copy-pasting the same check into every route across `people.py`, `relationships.py`, `trees.py`, `access.py`. Decision: if the check is small enough to stay a single shared function (likely living in `core/dependencies.py`, already planned) called from each route, keep the flat structure. Only reintroduce a `service.py`-style layer if that shared logic grows complex enough that copy-pasting a one-line dependency call into each route genuinely becomes the problem — not before. Write the decision and reasoning into `design.md`'s "Backend Layering" section either way, so it's not re-litigated again later without cause.

**Done when:** A clear decision is written down (stay flat, or introduce a shared layer — and if so, how much of one) before any access-control code is written.

---

### 3.5 Tree access data model [ ]
**Agent brief:** Update the Neo4j data model to support shared access. Add a `HAS_ACCESS` relationship between User nodes and Tree nodes: `(User {id})-[:HAS_ACCESS {role: "editor"|"viewer"}]->(Tree)`. User nodes already exist from Task 1.9 (users live in Neo4j), so no extra user records are needed. Update `POST /trees` (create tree) to also create a `HAS_ACCESS {role: "owner"}` relationship from the creator's User node to the new Tree node.

**Done when:** Creating a tree creates the HAS_ACCESS relationship. Verify in Aura Console.

---

### 3.6 Access control endpoints [ ]
**Agent brief:** In a new `backend/app/access.py` file (schemas, routes, and Cypher together), implement the sharing endpoints. `POST /trees/{tree_id}/access` — body: `{email, role}`. Look up the target User node by (lowercased) email in Neo4j, then create a `HAS_ACCESS {role}` relationship from their User node to the Tree node. Only the tree owner can call this. `GET /trees/{tree_id}/access` — return list of `{user_id, name, role}` for all users with access (include `email` only when the requester is the owner). `PATCH /trees/{tree_id}/access/{user_id}` — update the role property on the HAS_ACCESS relationship. `DELETE /trees/{tree_id}/access/{user_id}` — remove the HAS_ACCESS relationship. Owner cannot remove themselves.

**Done when:** Can grant editor access to a second test user, verify they can see the tree, then revoke it.

---

### 3.7 Access enforcement [ ]
**Agent brief:** Update `backend/app/core/dependencies.py` (the tree-access lookup itself can call a function defined in `access.py`). Replace the stub `get_accessible_trees` with a real implementation: query Neo4j for all Trees the current user has a `HAS_ACCESS` relationship to (any role). Inject this dependency into all `/trees/**` endpoints. For write operations (POST/PATCH/DELETE on people, relationships), add a check that the current user's role on that tree is "editor" or "owner" — return 403 if not. For read operations, any role (including "viewer") is sufficient.

**Cross-tree test:** with two users each owning a tree, user A must get 403/404 on every tree B endpoint (people, relationships, graph, relationship-path, access), including when using a valid tree B person ID in a URL under tree A. Add this as a pytest test or a written manual checklist.

**Done when:** A viewer account cannot add a person (gets 403). An editor account can. An owner can do everything. The cross-tree test passes.

---

### 3.8 Security hardening [ ]
**Agent brief:** Audit the backend for these security issues and fix any found: (0) Email validation — in `auth.py`, change `UserCreate.email` from plain `str` to Pydantic's `EmailStr` (requires the `email-validator` package; add it to `requirements.txt`), so a malformed email is rejected at the API boundary instead of being stored as-is. (This was deliberately left as a plain `str` in Task 1.5 — fix it here, alongside the other security items, rather than earlier.) (1) Cypher injection — search all `.py` files for any Cypher queries built with string formatting or f-strings; replace with parameterized queries using the `neo4j` driver's parameter syntax `{param_name}`. (2) CORS — in `main.py`, configure `CORSMiddleware` to allow only `http://localhost:5173` (dev) and the production frontend URL (placeholder for now). (3) Auth endpoint rate limiting — add `slowapi` rate limiting to `POST /auth/login` and `POST /auth/register`. (4) `.gitignore` — verify `.env` is listed (plus `.venv/`, `__pycache__/`, `node_modules/`). (5) Create `.env.example` with all required env var names and placeholder values.

**Done when:** Grep for f-string Cypher queries returns nothing. CORS rejects requests from an unlisted origin. `.env` is not tracked by git.

---

## Phase 4 — UI Updates (~10 hrs, ~weeks 14–16)

### 4.1 Traditional tree layout (Cytoscape.js) [ ]
**Agent brief:** Install `cytoscape-dagre` and `dagre` in the frontend. In `TreeGraph.jsx`, add a `layout` prop that accepts `"force"` (current fcose layout) or `"tree"` (dagre hierarchical layout). In TreeView, add a toggle button that switches between the two layouts. The dagre layout should have `rankDir: "TB"` (top-to-bottom) and treat `PARENT_OF` edges as defining the hierarchy direction.

**Done when:** Toggle button switches between force-directed and top-down hierarchical layouts for seed data.

---

### 4.2 Person detail side panel [ ]
**Agent brief:** Create `frontend/src/components/PersonPanel.jsx`. It displays a selected person's details (name, birth year, death year, birth place, notes). It also includes an edit mode: clicking "Edit" renders the PersonForm pre-populated with that person's data; submitting calls `PATCH /trees/{tree_id}/people/{person_id}`. In TreeView, wire up Cytoscape's `tap` event on nodes to set a `selectedPersonId` state value. Render `<PersonPanel>` in a sidebar when a person is selected. Create `frontend/src/api/people.js` functions: `getPerson(treeId, personId)` and `updatePerson(treeId, personId, data)`.

**Done when:** Clicking a node opens the panel with that person's data. Editing a field and saving updates the node.

---

### 4.3 Relationship-path query UI [ ]
**Agent brief:** Create `frontend/src/components/RelationshipQuery.jsx`. It should have two person-search inputs (type-ahead search using `GET /trees/{tree_id}/people?search=`), and a "Find relationship" button. On submit, call `GET /trees/{tree_id}/relationship-path`. Display the results as a list: for each path, show the common ancestor's name and the relationship label. Show "No relationship found" if the list is empty. Add this component to TreeView (below the graph or in a sidebar section).

**Done when:** Selecting the two cousin-marriage people from seed data returns multiple labeled paths.

---

### 4.4 Branch collapse/expand [ ]
**Agent brief:** In `TreeGraph.jsx`, implement branch collapse and expand. When a node is right-clicked (or a collapse button is clicked on the node), hide all descendant nodes and edges in the tree below it (in tree layout: hide children and their subtrees). Show a visual indicator on the collapsed node. Right-clicking again (or an expand button) restores them. This should work in both layout modes. Use Cytoscape's `hide()`/`show()` methods on elements.

**Done when:** Collapsing a node hides its subtree. Expanding restores it. Works for a branch in the seed data.

---

### 4.5 Access management UI [ ]
**Agent brief:** In TreeView (or a separate settings panel), add a "Share" section (visible only to the tree owner). It should: show a list of current access grants (name/email + role), include a form to add a new person by email with a role selector, allow changing a role via a dropdown, and include a "Revoke" button per entry. Wire these up to the access control endpoints from Task 3.6. Create `frontend/src/api/access.js` with the relevant API calls.

**Done when:** Owner can share a tree with another test user account, change their role, and revoke access.

---

### 4.6 Component library + basic polish [ ]
**Agent brief:** Install `shadcn/ui` (or `@radix-ui/react-*` with Tailwind CSS). Replace the plain HTML form inputs and buttons in LoginPage, RegisterPage, TreesPage, PersonForm, RelationshipForm, and RelationshipQuery with shadcn/ui equivalents (Input, Button, Select, Label, Card). Add a simple top navigation bar showing the current user's email and a logout button. No major layout redesign required — just make it look consistent and not raw HTML.

**Done when:** App looks visually coherent. All forms use the component library. No raw `<input>` or `<button>` elements remain in pages/components.

---

## Phase 5 — Testing & Deployment (~9.5 hrs, ~weeks 17–20)

### 5.1 Expand unit test coverage [ ]
**Agent brief:** In `backend/tests/test_algorithm.py`, add test cases for: half-siblings (two people sharing exactly one parent), "2nd cousin once removed", a multi-path double-cousin case (two people who are both 1st cousins through two separate grandparent pairs — the function should return two paths, not one). Verify all existing tests still pass.

**Done when:** `pytest` passes all tests including the new ones.

---

### 5.2 Dockerfile + docker-compose [ ]
**Agent brief:** Create `backend/Dockerfile`. Use `python:3.11-slim` as base image. Copy `requirements.txt` and install dependencies. Copy the `app/` directory. Expose port 8000. Set the CMD to run uvicorn. Create `docker-compose.yml` in the project root that defines one service: the `backend` app, built from `./backend`, with port 8000 mapped, and env vars loaded from `backend/.env`.

**Done when:** `docker-compose up --build` starts the API and `GET /` returns `{"status": "ok"}` from `http://localhost:8000`.

---

### 5.3 GitHub Actions CI pipeline [ ]
**Agent brief:** Create `.github/workflows/ci.yml`. The pipeline should trigger on push to `main` and on pull requests. Steps: (1) checkout code, (2) set up Python 3.11, (3) install backend dependencies from `requirements.txt`, (4) run `pytest` with `--tb=short`. Add a second job: (5) build the Docker image with `docker build ./backend` to confirm the Dockerfile isn't broken. The pytest step should pass `NEO4J_URI=bolt://localhost:7687`, `NEO4J_USERNAME=neo4j`, `NEO4J_PASSWORD=test`, `JWT_SECRET=test-secret` as env vars (unit tests don't connect to Neo4j, so these just prevent import errors).

**Done when:** Pipeline runs on push and pytest passes.

---

### 5.4 Deploy to managed host [ ]
**Agent brief:** Deploy the backend to Railway (or Render/Fly.io — confirm choice before this task). Steps: (1) create a new project on the platform, (2) connect the GitHub repo, (3) set all required environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, JWT_SECRET) in the platform's dashboard, (4) confirm the platform detects the Dockerfile and builds correctly, (5) verify the deployed app's `/` endpoint returns `{"status": "ok"}` and the Neo4j connection works. Document the deployed URL in README.md.

**Done when:** App is live at a public URL. Health check passes. Neo4j queries work from the deployed environment.

---

### 5.5 E2E test — critical flow (cut if short on time) [ ]
**Agent brief:** Install Playwright in the frontend (`npm init playwright@latest`). Write one E2E test covering the critical path: register a new user → log in → create a tree → add two people → add a PARENT_OF relationship → navigate to the tree → verify both nodes appear in the graph. Run it with `npx playwright test`.

**Done when:** Playwright test passes against the running dev server.

---

### 5.6 Large seed script + demo data [ ]
**Agent brief:** Expand `backend/seed/seed.py` to generate ~2,500 Person nodes across ~20 generations with realistic pedigree collapse patterns. Strategy: generate a base population of ~100 "founder" couples at the top, then each generation has children who sometimes marry cousins from the same generation (introduce cousin marriages at a rate that produces 10–20 meaningful multi-path relationship cases). Name people with generated names (can use a simple list). Run the script against the production AuraDB. Test the relationship-path endpoint against at least 3 known cousin-marriage pairs in the generated data and verify multi-path results.

**Also check layout behavior at scale:** render this data in both the fcose and dagre layouts (Tasks 2.7, 4.1) and confirm that distant/weakly-connected branches visually separate and that denser branches get proportionally more space, without custom layout code. If `fcose` is too slow or cluttered at ~2,500 nodes, that's the signal to lean on branch collapse/expand (Task 4.4) and the zoom-clustering backlog item rather than writing a custom layout.

**Done when:** AuraDB has ~2,500 nodes. At least 3 relationship-path queries return multiple paths with correct labels.

---

## Phase 6 — Buffer & Backlog (~weeks 21–24)

### 6.1 Address anything that slipped from earlier phases [ ]
Review completed tasks. Note anything that was marked done but wasn't fully verified, or any known bugs discovered during demo prep.

### 6.2 Thesis write-up support [ ]
The implementation report needs to explain: data model choices (why no Family node), the algorithm (ancestor intersection approach), security measures implemented, and validation methodology (what the unit tests cover and why representative coverage is sufficient). Use `design.md` and `requirements.md` as source material.

### 6.3 Extended Person fields [ ]
Add the extra Person properties from the original data model notes: gender, full date of birth, Hebrew birthday, date of death (yahrzeit), and places lived. Update `people.py`, `PersonForm.jsx` and `PersonPanel.jsx`. Open decisions to settle first: how vague historical dates (e.g. "approximately 1500s") are stored alongside full dates, and whether the Hebrew date is entered or calculated from the regular date. The current Person fields are enough until then.

### 6.5 "Home person" default focus (UI extra) [ ]
Give the graph view a sensible default center when no `root_person_id` is passed — not a root in the data-structure sense (the graph has none, and this has no security meaning), purely a UI convenience computed on the fly, not stored. Add a repository/service function that computes a reasonable default each time it's requested, e.g. the person with the most generations beneath them (largest descendant depth), or most total descendants — run as a query at request time, not persisted on the Tree node. Wire `GET /trees/{tree_id}/graph` to use this when `root_person_id` is omitted. Nice-to-have, not required for the demo; revisit the exact "biggest generation chain" metric when this is picked up.

### 6.6 Invite by email (pre-registration sharing) [ ]
Let a tree owner share a tree with someone who hasn't registered yet, by email (like a Google Doc invite), per the earlier discussion. Needs: a pending `Invite` record (email, tree_id, role) OR a placeholder `User` node created with just an email; when someone registers with that email, turn the invite into a real `HAS_ACCESS` edge. Requires email verification at registration — otherwise anyone could register with an invited email and claim that access. Build only after core sharing (3.5–3.7) works for already-registered users.

### 6.4 Backlog (only if time allows, in priority order) [ ]
1. GEDCOM import/export
2. In-law relationship paths via MARRIED_TO traversal
3. `KNOWN_DESCENDANT_OF` edge type for undocumented historical ancestors
4. Kubernetes deployment (YAML manifests)
5. Zoom-based density clustering visualization
