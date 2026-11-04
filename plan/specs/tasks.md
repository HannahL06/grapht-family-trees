# Task List

Each task is ~1–2 hours and written as a self-contained brief you can hand to a coding agent.
Before handing a task to an agent, paste in the relevant steering files (`product.md`, `tech.md`, `structure.md`) as context.

**Endpoint paths:** every backend route listed in these briefs (e.g. `GET /trees`, `POST /auth/login`, `GET /me`) is actually served under the `/api` prefix (`/api/trees`, `/api/auth/login`, `/api/me`), and the docs are at `/api/docs`. Briefs omit the prefix for brevity. Only `GET /` (health check) and `/demo` are unprefixed. In frontend code, the axios client's `baseURL: '/api'` adds the prefix, so calls are written without it.

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
**Agent brief:** Create Pydantic schemas directly in each feature file (no separate `schemas.py` — one file per feature holds its schemas, routes, and Cypher together). In `people.py`: `PersonCreate` (fields: `name` required, `birth_year` optional int, `death_year` optional int, `birth_place` optional str, `notes` optional str), `PersonUpdate` (all fields optional), `PersonResponse` (all fields + `id` str + `tree_id` str). In `trees.py`: `TreeCreate` (name required), `TreeUpdate` (name optional), `TreeResponse` (id, name, owner_id). In `relationships.py`: define `RelationshipType(str, Enum)` with values `PARENT_OF` and `MARRIED_TO` (not a plain string) — FastAPI then rejects any other value at the API boundary and shows the two options as a dropdown in `/api/docs`. `RelationshipCreate` (person_a_id, person_b_id, `type: RelationshipType`), `RelationshipResponse` (relationship_id, person_a_id, person_b_id, `type: RelationshipType`). In `auth.py`: `UserCreate` (name, email, password), `UserResponse` (id, name, email).

**Done when:** `python -c "from app.people import PersonCreate; PersonCreate(name='Test')"` runs without error.

---

### 1.6 Tree CRUD endpoints [x]
**Agent brief:** Implement the trees feature in `backend/app/trees.py` — schemas, routes, and Cypher (via `core/db.py`) all in this one file. Implement these endpoints. Use a hardcoded `owner_id = "dev-user"` for now (auth comes later). Endpoints: `POST /trees` (create Tree node in Neo4j, return TreeResponse), `GET /trees` (return all trees where owner_id matches), `GET /trees/{tree_id}` (return one tree or 404), `PATCH /trees/{tree_id}` (update name), `DELETE /trees/{tree_id}` (detach delete tree and all its Person nodes). Register the router in `main.py`.

**Done when:** All five endpoints work correctly via the FastAPI docs UI (`/api/docs`). Create a tree, fetch it, rename it, delete it.

---

### 1.7 People CRUD endpoints [x]
**Agent brief:** Implement the people feature in `backend/app/people.py` — schemas, routes, and Cypher in this one file, same pattern as `trees.py`. All people belong to a tree (stored as `tree_id` property on Person nodes). Endpoints: `POST /trees/{tree_id}/people` (create Person node, return PersonResponse), `GET /trees/{tree_id}/people` (list all people in tree; support optional `?search=` query param that filters by name), `GET /trees/{tree_id}/people/{person_id}` (return one person or 404), `PATCH /trees/{tree_id}/people/{person_id}` (update person fields), `DELETE /trees/{tree_id}/people/{person_id}` (detach delete person node). Register the router in `main.py`.

**Tree isolation (see `design.md`):** every person lookup, update and delete must match on both `id` and `tree_id` (e.g. `MATCH (p:Person {id: $pid, tree_id: $tid})`), all parameterized; return 404 if no match. Create an index on `Person.id` and `Person.tree_id`. Every Cypher-touching function in `people.py` takes `tree_id`.

**Done when:** All five endpoints work via `/api/docs`. Add 3 people to a tree, search for one by name, edit one, delete one. Requesting a person via a different tree's ID in the URL returns 404.

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

### 1.11 Wire auth into tree endpoints (stub access guard) [x]
**Agent brief:** Update all `/trees/**` endpoints to require authentication via the `get_current_user` dependency. Replace the hardcoded `owner_id = "dev-user"` with the actual `current_user.id` from the dependency. For now, scope all tree queries to only return/modify trees where `owner_id == current_user.id` (full role-based sharing comes in Phase 3). This is a temporary stub — the comment `# TODO: Phase 3 — expand to include shared trees` should be left where the access check is.

**Done when:** Creating a tree while logged in saves the correct owner. Fetching `/trees` only returns that user's trees. Accessing another user's tree returns 403.

---

## Phase 2 — Preliminary UI (~24.5 hrs, ~weeks 7–14)

### 2.1 React + Vite project setup [x]
**Agent brief:** In the project root, initialize a new Vite React project in a `frontend/` directory using the `react` template. Install these additional dependencies: `axios`, `react-router-dom`, `sigma`, `graphology` (Sigma.js renders the graph, graphology holds its data; Cytoscape was originally planned here and replaced — see `design.md`). Create this directory structure inside `frontend/src/`: `api/` (empty), `components/` (empty), `pages/` (empty). In `vite.config.js`, add a dev proxy: requests to `/api` are proxied to `http://localhost:8000` **unchanged, with no path rewriting**. The backend serves every data route (and its docs) under `/api` itself (`/api/trees`, `/api/auth/...`, `/api/me`), so the browser and backend see identical paths in development and production. The prefix also keeps API calls separate from React page URLs like `/trees`. Update `App.jsx` to render just a `<h1>Grapht</h1>` placeholder.

**Done when:** `npm run dev` starts the dev server, browser shows "Grapht", no console errors.

---

### 2.2 API client + auth API module [x]
**Agent brief:** Create `frontend/src/api/client.js`: an Axios instance with `baseURL: '/api'`. Add a request interceptor that reads the JWT access token from `localStorage` (key: `"access_token"`) and attaches it as `Authorization: Bearer <token>` if present. Add a response interceptor for expired sessions: on a 401 response, clear the stored tokens and redirect to `/login` — **except** for requests to `/auth/login` and `/auth/register`, where a 401/400 is an expected "wrong password / email taken" error that the page must display, not a redirect trigger. (Access tokens expire after 1 hour; silently using the refresh token is deferred to a later task.) Create `frontend/src/api/auth.js` with three functions: `register(name, email, password)` (registration requires `name`), `login(email, password)` (stores both returned `access_token` and `refresh_token` in localStorage), `logout()` (clears localStorage tokens). `register` does NOT return tokens, so it does not log the user in by itself.

**Done when:** Can call `login()` from the browser console, token appears in localStorage, and a subsequent API call includes the header. A request made with an expired or invalid token clears the tokens and lands on `/login`.

---

### 2.x Visual design foundation [x]
**Goal:** Decide how the app looks before building more pages, so Tasks 2.3 onward are built once on the real design instead of being built unstyled and restyled in Phase 4.

**Part A, the design (done).** The user made the mock-ups in the "Grapht Design System" canvas (https://claude.ai/artifact/Cfqd3pr4Tt38gA87VC1DTx): tree view, Trees, Members, Member and Landing screens, plus Foundations and Components sheets. The result, including tokens, type, screens and the styling approach (Tailwind CSS v4 + semantic tokens + a `ui/` component layer), is written into `design.md` under "Visual Design". Login, register, empty states, modals and other screens are not mocked yet; they get designed later in the same style.

**Part B, the styling foundation (done 2026-11-04).** Built and verified in both themes at `/styleguide`; the toggle persists across reloads, lint (one fast-refresh warning in `icons.jsx`) and build pass. Not included yet: a `canvas` token, custom radius tokens (Tailwind's `rounded-xl`/`2xl`/`full` are used instead), the user button/menu in `AppHeader` (Task 2.3), and the search, minus and relationship icons (added with the screens that need them). Plan as written:
1. Install `tailwindcss` and `@tailwindcss/vite`, add the plugin to `vite.config.js`, and `@import "tailwindcss"` in `src/index.css` (replacing the current minimal stylesheet).
2. In `src/index.css`, define the tokens from `design.md` as CSS variables on `:root` (light) and `[data-theme="dark"]`, expose them to Tailwind with `@theme inline` as semantic utilities (`bg-page`, `bg-canvas`, `bg-chrome`, `text-ink`, `text-muted`, `text-accent`, `border-rule`, and so on), and add the fonts (`font-display` Fraunces, `font-hero` Cormorant Garamond, `font-sans` DM Sans) and radii (`rounded-card`, etc.). Install the fonts with fontsource packages (self-hosted, no CDN).
3. Create `src/theme.js`: sets `data-theme` on `<html>`, saves the choice in `localStorage`, defaults to `prefers-color-scheme`, and exports a `useTheme()` hook. Also export a helper that reads the token values from the CSS variables, for Sigma (Task 2.7).
4. Create the `src/components/ui/` set shown in the Components artboard: `Button` (variants: accent pill, soft pill, row action), `PillToggle`, `Card`, `TextField`/`SearchField`, `NavTab`, `AppHeader` (logo pill, nav tabs, theme toggle, user button) and `AppShell`, plus the inline SVG icons used (plus, search, pencil, trash, minus, sun, moon, relationship). Long class lists live only here.
5. Create a dev-only `/styleguide` route that renders every `ui/` component in both themes, matching the Components artboard.
6. Update `App.jsx` to use `AppShell`.

**Estimate:** Part B is about 4 hrs.

**Done when:** `npm run lint` and `npm run build` pass; the theme toggle switches light and dark and the choice survives a reload; `/styleguide` matches the Components artboard in both themes; no component outside `ui/` uses a raw hex color; Tasks 2.3 onward are built with these components.

---

### 2.y Backend: marriage year, relatives, member counts [x]
**Agent brief:** The new screens need data the API does not return yet. In `backend/app/relationships.py`: (1) add an optional `marriage_year: int | None` to `RelationshipCreate` and `RelationshipResponse`, stored as a property on `MARRIED_TO` edges only (reject it with a 400 on `PARENT_OF`); (2) add `PATCH /trees/{tree_id}/relationships/{relationship_id}` that updates `marriage_year` only (400 for a `PARENT_OF` edge; 404 across trees, the same isolation as DELETE). In `backend/app/people.py`: (3) add `GET /trees/{tree_id}/people/{person_id}/relatives` returning `{parents: [{id, name}], spouses: [{id, name, marriage_year, relationship_id}], children: [{id, name}]}`; (4) make the list `GET /trees/{tree_id}/people` also return `marriage_years: [int]` per person (empty when none), using a separate list-item model so the Members table can show "Married" without one call per person. In `backend/app/trees.py`: (5) add `member_count: int` to `TreeResponse` for `GET /trees` and `GET /trees/{tree_id}` (the number of Person nodes with that `tree_id`). All Cypher stays parameterized and tree-scoped. Write integration tests for each, including cross-tree 404s, a person with two marriages and the `PARENT_OF` rejection, and run the whole suite.

**Done when:** All new and existing backend tests pass; the endpoints work in `/api/docs`; creating a marriage with a year and then editing it shows up in `relatives` and in the people list.

**Estimate:** ~2.5 hrs.

---

### 2.3 Login and Register pages + routing [ ]
**Agent brief:** Create `frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx`. Each should have a simple form (email + password fields, plus a name field on the register page, submit button) that calls the corresponding auth API function. On success, redirect to `/trees`. On error, show the error message. **Register must call `login(email, password)` immediately after a successful `register(...)`** (the register endpoint returns no tokens), then redirect to `/trees`. In `App.jsx`, set up React Router with routes: `/login` → LoginPage, `/register` → RegisterPage, `/trees` → placeholder "Trees page" div, `/` → redirect to `/login` (until the landing page exists, Task 2.10). **Add a small `ProtectedRoute` wrapper that redirects to `/login` when there is no `access_token` in localStorage, and wrap `/trees` (and later `/trees/:id`) in it** so a logged-out visit never shows a page that just fails with 401. Build both pages inside `AppShell` with the `ui/` components from Task 2.x. There are no mock-ups for them yet, so keep them simple and consistent with the tokens (a centered card on the page background); they will be restyled once designed. Also wire the header's user button to a small menu showing the user's name with a **Log out** action, so the login flow can be tested both ways.

**Done when:** Can register a new user and land on `/trees` already logged in, and log in with that user from the login page. Visiting `/trees` while logged out redirects to `/login`. A wrong password shows an error on the login page instead of redirecting.

---

### 2.4 Trees page [ ]
**Agent brief:** Create `frontend/src/pages/TreesPage.jsx` and `frontend/src/api/trees.js` (`getTrees()`, `createTree(name)`). Build the page from the Trees artboard using the `ui/` components inside `AppShell`: a "Trees" title and a responsive grid of cards. Each card shows a decorative graph thumbnail (a static SVG, rotated a different amount per card as in the mock-up), the tree name and "N members" (from `member_count`, Task 2.y), and links to `/trees/:id`. The last card is a dashed "New tree" card: clicking it reveals an inline name field and a create button that calls `POST /trees`, then refreshes the list. Both endpoints require login (the Task 2.2 client attaches the token). The `/trees/:id` page is Task 2.5, so the link lands on an empty route until then.

**Done when:** The page matches the Trees artboard in both themes, shows only the logged-in user's trees with correct member counts, and creating a tree adds a card.

---

### 2.5 Tree view page [ ]
**Agent brief:** Create `frontend/src/pages/TreeView.jsx` for `/trees/:id`, from the tree-view artboard: inside `AppShell`, a 220px left pane and a canvas area (an empty placeholder until Task 2.7). Left pane: a Graph/Tree `PillToggle` (state only for now), a search control that expands inline into a field with a results list (calls `GET /trees/{tree_id}/people?search=`, debounced; choosing a result selects that person), "Add member", "Edit" and "Delete" actions (Edit and Delete disabled, with the tooltip "Select a person first", until someone is selected; they are wired in Task 2.6), and a "Relationship calculator" link at the bottom (inert until Task 4.3). Hold `selectedPersonId` in the page's state. When a person is selected, show the details card (top right of the canvas: name, Born, Birthplace, Married) filled from the people and relatives endpoints, with a close button; clicking empty canvas clears the selection. Show "Members" in the top bar's nav while a tree is open. Create `frontend/src/api/people.js` (`listPeople`, `getPerson`, `getRelatives`).

**Done when:** `/trees/:id` loads the tree's name, search finds and selects a person, the details card shows their data including the marriage year, and Edit and Delete enable and disable with the selection, in both themes.

---

### 2.6 Add, edit and delete members and relatives [ ]
**Agent brief:** Wire up the tree view's actions. (1) "Add member" opens a form (name required; born year, birthplace, and also died year and notes since the API supports them) that calls `POST /trees/{tree_id}/people`, then selects the new person. (2) With a person selected, an "Add to X: Parent | Spouse | Child" bar appears at the bottom of the canvas (opened by the "+" button from Task 2.7). Choosing one asks for the new person's details, creates the person, then creates the relationship: Parent means `PARENT_OF` from the new person to X; Child means `PARENT_OF` from X to the new person; Spouse means `MARRIED_TO` with an optional marriage year. If the second call fails, say so and offer to retry (a person without the link may already exist). (3) "Edit" opens the same form pre-filled and calls `PATCH .../people/{person_id}`; for a spouse's marriage year it calls `PATCH .../relationships/{relationship_id}` (Task 2.y). (4) "Delete" asks for confirmation in a native `<dialog>` that says the person's relationships are removed too, then calls `DELETE`. Create `frontend/src/api/relationships.js`. Reuse the `ui/` components; there are no mock-ups for the forms or the dialog yet, so keep them simple and consistent with the tokens.

**Done when:** You can add a member, add a parent, spouse (with a year) and child to someone, edit a member and a marriage year, and delete a member after confirming, with everything still there after a page refresh and visible in the Aura Console.

---

### 2.7 Graph visualization [ ]
**Agent brief:** Add a `GET /trees/{tree_id}/graph` endpoint to the backend (in `backend/app/analysis.py`). [Backend piece built early, during Task 1.9's demo-page hookup — see schedule.md.] It should fetch all Person nodes in the tree and all PARENT_OF and MARRIED_TO edges between them, and return `{ nodes: [{id, name}], edges: [{source, target, type}] }`. Then in the frontend, create `frontend/src/components/TreeGraph.jsx`: a component that accepts `nodes` and `edges` props, loads them into a `graphology` graph, and renders it with Sigma.js (WebGL, chosen so trees much larger than 2,500 people stay smooth). Sigma only renders — it has no layout built in — so install `graphology-layout-forceatlas2` and use it for the force-directed layout, running it in its web-worker variant (`graphology-layout-forceatlas2/worker`) so large graphs don't freeze the page. Mount Sigma on a `div` that fills the available space, and create/destroy it inside `useEffect` (Sigma owns its own canvas, so React must not re-render it). Draw `MARRIED_TO` edges dashed using Sigma's `layerDashed`/`createEdgeProgram`. Update incrementally when props change (add only new nodes/edges to the graphology graph rather than rebuilding). In TreeView, fetch the graph data on mount and render `<TreeGraph>`. Match the design: nodes alternate `node-a` and `node-b` chosen by a hash of the person's id; edges use the `edge` color (1.4px), dashed for `MARRIED_TO`; the colors come from the CSS variables through the theme helper (Task 2.x) and update when the theme changes. Clicking a node selects it (ink ring, slightly larger) and shows the "/" (open the details card) and "+" (open the Add-relative bar, Task 2.6) buttons as HTML elements positioned next to the node with Sigma's graph-to-screen coordinate conversion; clicking empty canvas clears the selection. The graph view shows no labels. Also test it once with a synthetic graph of 10,000+ nodes to confirm the scale goal, not only the 22-person demo tree.

**Done when:** Navigating to a tree renders its people and relationships as a graph in the design's colors in both themes; clicking a person selects them and shows the "/" and "+" buttons; the 10,000-node test stays interactive.

---

### 2.8 Members page [ ]
**Agent brief:** Create `frontend/src/pages/MembersPage.jsx` for `/trees/:id/members`, from the Members artboard: a "Members" title, a search field (calls `GET /trees/{tree_id}/people?search=`, debounced) and a table with columns Name, Born, Birthplace and Married (`marriage_years` from Task 2.y; all years comma-separated, "—" if none). Each row links to `/trees/:id/members/:personId`. The table scrolls sideways on narrow screens.

**Done when:** The page lists the current tree's people only, search filters them, rows link to the member page, and it matches the artboard in both themes.

---

### 2.9 Member page [ ]
**Agent brief:** Create `frontend/src/pages/MemberPage.jsx` for `/trees/:id/members/:personId`, from the Member artboard: a "← All members" link, the member's name (Fraunces, large) with the tree name beneath, a "Show in tree" link (to `/trees/:id?selected={personId}`; TreeView selects that person on load) and an edit pencil (opens the edit form from Task 2.6). Two columns: Details (Born, Birthplace, Married; also Died and Notes when present) and Family (Parents, Spouse with the marriage year, Children, each name linking to that member's page) from `GET .../relatives` (Task 2.y). Add the `?selected=` handling to TreeView.

**Done when:** A member page shows correct details and working family links, "Show in tree" opens the tree with that person selected, and it matches the artboard in both themes.

---

### 2.10 Landing page [ ]
**Agent brief:** Create `frontend/src/pages/LandingPage.jsx` for `/`, from the Landing artboard: a header (logo, "How it works", "Contact", and a "Get started" button to `/register`, or to `/trees` when already logged in), a very large "See your whole family." headline (Cormorant Garamond, scaling with the viewport) and a band with the graph illustration (a static SVG). Use only the app's tokens, with no separate landing palette (decided; see `design.md`): `page` background, `ink` text, an `accent` button, and the band in `chrome` with `node-a`/`node-b` nodes and `edge` lines, so dark mode works with no extra code. "How it works" and "Contact" can scroll to placeholder sections for now. Change the `/` route to render this page.

**Done when:** `/` shows the landing page in both themes and "Get started" works for logged-out and logged-in visitors.

---

## Phase 3 — Algorithm, Access Control, Security (~13 hrs, ~weeks 15–18)

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
**Agent brief:** Audit the backend for these security issues and fix any found: (0) Email validation — in `auth.py`, change `UserCreate.email` from plain `str` to Pydantic's `EmailStr` (requires the `email-validator` package; add it to `requirements.txt`), so a malformed email is rejected at the API boundary instead of being stored as-is. (This was deliberately left as a plain `str` in Task 1.5 — fix it here, alongside the other security items, rather than earlier.) (1) Cypher injection — search all `.py` files for any Cypher queries built with string formatting or f-strings; replace with parameterized queries using the `neo4j` driver's parameter syntax `{param_name}`. (2) CORS — in `main.py`, configure `CORSMiddleware` to allow only `http://localhost:5173` (dev) and the production frontend URL (placeholder for now). (3) Auth endpoint rate limiting — add `slowapi` rate limiting to `POST /auth/login` and `POST /auth/register`. (4) `.gitignore` — verify `.env` is listed (plus `.venv/`, `__pycache__/`, `node_modules/`). (5) Create `.env.example` with all required env var names and placeholder values. (6) Token storage — the React app keeps login tokens in `localStorage` (Task 2.2), which any injected script on the page can read. Review the options (e.g. keep the short-lived access token in memory only and store the refresh token in an `httpOnly` cookie set by the backend) and either adopt one or record why `localStorage` is acceptable for now. If adopted, it also changes Tasks 2.2/2.3 and the backend login/refresh routes.

**Done when:** Grep for f-string Cypher queries returns nothing. CORS rejects requests from an unlisted origin. `.env` is not tracked by git. The token-storage decision is written in `design.md`.

---

## Phase 4 — UI Updates (~10 hrs, ~weeks 19–22)

### 4.1 Traditional tree layout (Sigma.js) [ ]
**Agent brief:** Sigma has no built-in hierarchical layout, so compute the positions yourself: install `dagre` in the frontend, run it on the `PARENT_OF` structure (`rankdir: "TB"`, top-to-bottom, parents above children) and write the resulting `x`/`y` onto the graphology nodes. In `TreeGraph.jsx`, add a `layout` prop that accepts `"force"` (the ForceAtlas2 layout from Task 2.7) or `"tree"` (the dagre positions). In TreeView, add a toggle button that switches between the two. For very large trees dagre can be slow; if it is, evaluate `elkjs` or compute the layout on the backend, and note the result in `design.md`. The Graph/Tree toggle already exists in the left pane (Task 2.5); this task makes the Tree layout real, with the person's name shown under each node (see `design.md`, Graph styling).

**Done when:** Toggle button switches between force-directed and top-down hierarchical layouts for seed data.

---

### 4.2 Person detail side panel [-]
**Superseded.** The details card, editing and deleting are built in Tasks 2.5 and 2.6, and the full member page in Task 2.9. Nothing remains here.

---

### 4.3 Relationship-path query UI [ ]
**Agent brief:** Create `frontend/src/components/RelationshipQuery.jsx`. It should have two person-search inputs (type-ahead search using `GET /trees/{tree_id}/people?search=`), and a "Find relationship" button. On submit, call `GET /trees/{tree_id}/relationship-path`. Display the results as a list: for each path, show the common ancestor's name and the relationship label. Show "No relationship found" if the list is empty. Open it from the "Relationship calculator" link in the tree view's left pane (Task 2.5). No mock-up exists yet for the calculator or its results; design it first in the style of `design.md`.

**Done when:** Selecting the two cousin-marriage people from seed data returns multiple labeled paths.

---

### 4.4 Branch collapse/expand [ ]
**Agent brief:** In `TreeGraph.jsx`, implement branch collapse and expand. When a node is right-clicked (or a collapse button is clicked on the node), hide all descendant nodes and edges in the tree below it (in tree layout: hide children and their subtrees). Show a visual indicator on the collapsed node. Right-clicking again (or an expand button) restores them. This should work in both layout modes. With Sigma, set the `hidden` attribute on the graphology nodes/edges (or use node/edge reducers) rather than removing them, so expanding restores them without refetching. The mock-ups have no collapse/expand control yet; design one first in the style of `design.md`.

**Done when:** Collapsing a node hides its subtree. Expanding restores it. Works for a branch in the seed data.

---

### 4.5 Access management UI [ ]
**Agent brief:** In TreeView (or a separate settings panel), add a "Share" section (visible only to the tree owner). It should: show a list of current access grants (name/email + role), include a form to add a new person by email with a role selector, allow changing a role via a dropdown, and include a "Revoke" button per entry. Wire these up to the access control endpoints from Task 3.6. Create `frontend/src/api/access.js` with the relevant API calls. No mock-up exists yet for sharing; design it first in the style of `design.md`.

**Done when:** Owner can share a tree with another test user account, change their role, and revoke access.

---

### 4.6 Final consistency pass [ ]
**Note:** The look, the styling approach (Tailwind v4, semantic tokens, `ui/` components) and the component set are decided in Task 2.x. This task does not choose anything.

**Agent brief:** Apply the Task 2.x foundation to everything added in Phases 3–4 (relationship calculator, sharing UI, collapse/expand controls) and do a final consistency pass over every page in both themes: no raw hex colors or hard-coded sizes outside the token file, no raw `<input>` or `<button>` outside `components/ui/`, any repeated class combination extracted into a component, and a check at phone width.

**Done when:** All pages look consistent in both themes, the checks above find nothing, and `/styleguide` includes every component added since Task 2.x.

---

## Phase 5 — Testing & Deployment (~11 hrs, ~weeks 23–25)

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

### 5.x Deploy the frontend [ ]
**Agent brief:** Tasks 5.2 and 5.4 only containerize and deploy the backend; something also has to host the built React app. Build it with `npm run build` (output in `frontend/dist/`, static files) and host it on a static host (e.g. Vercel, Netlify or Cloudflare Pages) or serve it from the backend. Requirements: (1) the host must serve `index.html` for every unknown path (single-page-app fallback), otherwise reloading on `/trees` returns 404; (2) `/api/*` must reach the deployed backend unchanged — either with a proxy/rewrite rule on the host (the backend already serves everything under `/api`, so no path rewriting) or by calling the backend's own URL, in which case the backend CORS setting from Task 3.8 must allow the frontend's origin; (3) HTTPS on both. Also extend the Task 5.3 CI workflow with a frontend job that runs `npm ci`, `npm run lint` and `npm run build`.

**Done when:** The deployed frontend URL loads, you can register and log in against the deployed backend, and reloading directly on `/trees` still works.

---

### 5.5 E2E test — critical flow (cut if short on time) [ ]
**Agent brief:** Install Playwright in the frontend (`npm init playwright@latest`). Write one E2E test covering the critical path: register a new user → log in → create a tree → add two people → add a PARENT_OF relationship → navigate to the tree → verify both nodes appear in the graph. Run it with `npx playwright test`.

**Done when:** Playwright test passes against the running dev server.

---

### 5.6 Large seed script + demo data [ ]
**Agent brief:** Expand `backend/seed/seed.py` to generate ~2,500 Person nodes across ~20 generations with realistic pedigree collapse patterns. Strategy: generate a base population of ~100 "founder" couples at the top, then each generation has children who sometimes marry cousins from the same generation (introduce cousin marriages at a rate that produces 10–20 meaningful multi-path relationship cases). Name people with generated names (can use a simple list). Run the script against the production AuraDB. Test the relationship-path endpoint against at least 3 known cousin-marriage pairs in the generated data and verify multi-path results.

**Also check layout behavior at scale:** render this data in both the ForceAtlas2 and dagre layouts (Tasks 2.7, 4.1) and confirm that distant/weakly-connected branches visually separate and that denser branches get proportionally more space, without custom layout code. Test at ~2,500 nodes (the minimum target) and also at 10,000+, since larger trees are an explicit goal. If either layout is too slow or cluttered at that size, that's the signal to lean on branch collapse/expand (Task 4.4), loading only part of the tree at a time (the `/graph` endpoint's root-person/depth options), and the zoom-clustering backlog item rather than writing a custom layout.

**Done when:** AuraDB has ~2,500 nodes. At least 3 relationship-path queries return multiple paths with correct labels.

---

## Phase 6 — Buffer & Backlog (~weeks 26–29)

### 6.1 Address anything that slipped from earlier phases [ ]
Review completed tasks. Note anything that was marked done but wasn't fully verified, or any known bugs discovered during demo prep.

### 6.2 Thesis write-up support [ ]
The implementation report needs to explain: data model choices (why no Family node), the algorithm (ancestor intersection approach), security measures implemented, and validation methodology (what the unit tests cover and why representative coverage is sufficient). Use `design.md` and `requirements.md` as source material.

### 6.3 Custom fields: per-tree fields and person values [ ]
Replaces the old "Extended Person fields" task (gender, Hebrew birthday, date of death, places lived are now just starter fields, see 6.5). Lets each tree define its own extra metadata fields (e.g. "Zodiac sign", "Hometown"), shared by every person in that tree. Values may be left empty.

- **Model:** a field is `{name, type}`, with `type` defaulting to `"text"` and not yet validated (typed fields such as dates are a later extension; the stored shape doesn't change). The tree stores its ordered list as `fields`. Because Neo4j can't store nested maps as properties, store the list as a JSON string on the Tree node. Each Person stores `custom` as a JSON string of `{field_name: value}`; values are always strings (a date would be an ISO string). Validate both with Pydantic (`dict[str, str]`). Empty values aren't stored.
- **Behaviour:** all people in a tree share the same fields; no ad hoc fields on a single person. Renaming a field renames the key on every person. Deleting a field removes its values, with a confirmation in the UI.
- **API:** `GET/PUT /trees/{id}/fields`. Person create and update accept `custom`. Editing the field list needs the owner role and editing values the editor role (depends on 3.5–3.7; until then, owner only).
- **UI:** a "Fields" section in tree settings (add, rename, reorder, remove); `PersonForm.jsx` renders one input per field; `PersonPanel.jsx` lists the non-empty values.
- Estimate: ~3 hrs.

### 6.4 Custom field templates: user library [ ]
Name still open ("field template" / "field set" / "profile"). A user can save a named list of fields and reuse it across their trees. Depends on 6.3.

- **Model:** `(User)-[:OWNS]->(FieldTemplate {id, name, fields_json})`, where `fields_json` is the same `[{name, type}]` list as a tree's fields. Names only, no default values.
- **Apply = copy, not link.** Applying a template copies its fields into the tree (skipping names that already exist), so the tree stays self-contained, collaborators don't need access to the owner's library, and later edits or deletion of the template never affect existing trees. A tree may have several templates applied. Optionally record `source_template_id` as a hint; an "update from template" diff/merge is out of scope.
- **API:** `GET/POST/PATCH/DELETE /me/field-templates`; `POST /trees/{id}/fields/apply` with `{template_id}`.
- **UI:** a "My templates" page (create a template by naming it and adding fields); "Apply a template" in tree settings; a "Save these fields as a template" shortcut on a tree.
- Possible later additions: export/import a template as JSON for sharing between users.
- Estimate: ~2–3 hrs.

### 6.5 Starter field templates [ ]
Ship a few read-only, system-defined templates so the feature is useful immediately and covers the fields from the old "Extended Person fields" task: "Standard" (gender, date of birth, Hebrew birthday, date of death / yahrzeit, places lived), "Zodiac & birthday", "Residence history" (e.g. "Lived in (childhood)", "Lived in (adult)"). Served by `GET /field-templates/starters` from a constant in the backend (not stored in the DB), applied the same way as user templates (6.4), with a "Duplicate to my templates" action. Vague historical dates and a calculated Hebrew date are no longer blockers because values are free text; revisit when typed fields are added. Estimate: ~1–2 hrs.

### 6.6 Bulk add: "Add parents" and "Add N children" [ ]
Speeds up building a tree by creating several blank people and their relationships in one action, instead of the one-at-a-time flow in 2.6. Chosen over a pre-shaped "seed tree" (couple plus N children per generation), which would be symmetric and unrealistic and leave users deleting placeholders. Depends on 2.6 (add relatives) and 2.7.

- **Add parents:** from a selected person X, creates two new people, a `MARRIED_TO` edge between them, and a `PARENT_OF` edge from each to X, all in one Neo4j transaction. If X already has one parent, offer to add only the missing one (and marry them to the existing parent); if X already has two, hide the action (`PARENT_OF` has no count limit, but the bulk action targets the common case).
- **Add N children:** from X, creates N new people with `PARENT_OF` from X to each. If X has spouses, let the user pick the other parent (or none); the same `PARENT_OF` edge is then added from that person too. N is capped at about 20 and validated server-side.
- **New people are fully empty:** `name` is required by the model, so they are named just "Person" and nothing else is set (all other fields, and any custom fields from 6.3, are blank). The user fills them in later through the normal edit form.
- **Backend:** one repository function that creates the people and relationships in a single transaction, so a failure leaves nothing half-created (this also avoids the partial-failure retry case in 2.6). Endpoints e.g. `POST /trees/{id}/people/{person_id}/add-parents` and `.../add-children` with `{count, other_parent_id?}`; both return the created people and relationships so the graph can update without a refetch. Guarded like the other tree endpoints (editor role once 3.7 lands).
- **UI:** two new items in the "Add to X" bar from 2.6/2.7, with a small count input for children. Newly created nodes are selected or highlighted so they're easy to find, and several identically named "Person" nodes should be easy to tell apart (e.g. by position, or by "Child 1 of X" shown until renamed, if it can be done without storing it as the name).
- **Possible later addition:** "Add spouse and N children" as a combined action, or pasting a list of names to create people with proper names.
- Estimate: ~3–4 hrs.

**Done when:** From a person you can add two married parents and N empty children in one click each, every created person and edge is visible and persists after a refresh, and a forced failure mid-way leaves nothing behind.

### 6.7 Describe a family by voice (AI chart generation) [ ]
A user speaks (or types) a description of a family and AI generates the tree diagram, so they can get a rough graph quickly and clean it up afterwards. Main use case: a quick visual of a small family to explain who everyone is to someone unfamiliar (e.g. a newcomer to the family, or someone researching a distant branch). Depends on 2.7 (graph) and 6.6 (shared single-transaction bulk-create function).

**Direction (details deliberately left for later):**
- Speech to text, always followed by an editable transcript (a plain text box is the fallback and the easiest way to test).
- An LLM turns the transcript into structured data (people with temporary ids, `PARENT_OF` and `MARRIED_TO` pairs, optional marriage year). The user is asked who "I" is up front so relative terms ("my mother's second husband") can be resolved.
- Deterministic validation in Python (Pydantic, reject cycles and impossible structures, flag ambiguity). The LLM only extracts structure; relationship logic stays in tested code.
- The result is shown as a preview in the existing graph view; on confirm it is saved via the 6.6 bulk-create function.

**Open decisions:**
- Whether the generated tree is stored in the DB before the user confirms, or held client-side as a draft until then.
- Whether a no-account "draft" mode and image export are included (fits the "explain a family" use case).
- How corrections work (edit the preview by hand vs. spoken corrections like "no, Dina is his sister").
- Which speech-to-text option (browser Web Speech API vs. a hosted transcription API) and which LLM.
- Handling relations outside the current model (step, adoptive, in-law, "cousin"): `PARENT_OF` is biological only, so these may need clarification prompts or be rejected.
- Privacy and cost: family details go to third-party services (disclose; note in 3.8) and each call costs money (per-user rate limits).

**Likely split:** (1) structured extraction from text plus validation, backend only, testable without audio; (2) draft preview UI and confirm-and-save; (3) voice input and transcript review; (4) optional spoken corrections and image export. Estimate ~12–20 hrs depending on the correction UI.

### 6.8 "Home person" default focus (UI extra) [ ]
Give the graph view a sensible default center when no `root_person_id` is passed — not a root in the data-structure sense (the graph has none, and this has no security meaning), purely a UI convenience computed on the fly, not stored. Add a repository/service function that computes a reasonable default each time it's requested, e.g. the person with the most generations beneath them (largest descendant depth), or most total descendants — run as a query at request time, not persisted on the Tree node. Wire `GET /trees/{tree_id}/graph` to use this when `root_person_id` is omitted. Nice-to-have, not required for the demo; revisit the exact "biggest generation chain" metric when this is picked up.

### 6.9 Invite by email (pre-registration sharing) [ ]
Let a tree owner share a tree with someone who hasn't registered yet, by email (like a Google Doc invite), per the earlier discussion. Needs: a pending `Invite` record (email, tree_id, role) OR a placeholder `User` node created with just an email; when someone registers with that email, turn the invite into a real `HAS_ACCESS` edge. Requires email verification at registration — otherwise anyone could register with an invited email and claim that access. Build only after core sharing (3.5–3.7) works for already-registered users.

### 6.10 Backlog (only if time allows, in priority order) [ ]
1. GEDCOM import/export
2. In-law relationship paths via MARRIED_TO traversal
3. `KNOWN_DESCENDANT_OF` edge type for undocumented historical ancestors
4. Kubernetes deployment (YAML manifests)
5. Zoom-based density clustering visualization
