# Genealogy Application — Technical Spec (Living Document)

## Project Overview

Web application for building and analyzing large, dense family trees (target scale: 2,500+ people, up to ~20 generations / 500 years back). Core thesis contribution: demonstrating that graph databases model genealogical data more efficiently and naturally than relational databases, particularly for relationship-path analysis in densely interconnected families.

Three design principles (from thesis paper): **usability**, **scalability**, **privacy**.

## Potential Names
- Graft / Grapht
- Pardes
- Root
- Arbor
- Elder
- Kerem
- Pando
- Canopy
- Thicket
- Glade
- Loops / Links
- Neta (hebrew for branch/bough)
- Shevet

Logo



## Scope Boundaries

- Focus: storage, display, and relationship analysis of family tree data.
- Explicitly out of scope: genealogical research tools, document/record archives, DNA analysis.
- **All biological relatives must be supported** — this is a hard requirement, not flexible. In-law/step relationships (via partner edges) are out of core scope (backlog).
- Half-siblings likely fall out mostly "for free" from the core ancestor-intersection algorithm (two people sharing exactly one parent) — not being actively cut, but **first to go if Phase 3 (algorithm work) runs long.**
- Step-relationships (via marriage, not blood) are cut without argument under time pressure — same category as the in-law relationship-path backlog item, since both require crossing partner edges.
- If UI time is constrained: keep one view mode (not both traditional + graph), simplify access control to owner-only (no editor/viewer roles, no sharing) as the true floor, and treat E2E testing, branch collapse/expand, and the second view mode as explicitly cuttable.

## Core Decisions

### Database
- **Neo4j** (graph database) for family tree data — nodes = people, typed edges = relationships.
- **No `Family` node** — pure person-to-person edges (`PARENT_OF`, `PARTNER_OF`), idiomatic graph modeling.
- Relational store (or Neo4j itself) for user/account data.
- Target scale: comfortably handle 2,500 people. No formal graph-vs-relational benchmarking required (not a thesis deliverable).
- Basic indexing (e.g., person ID) as standard practice, not a research burden.
- Performance optimization beyond that: nice-to-have, not a must.

### Data Model Notes
- Historical/sparse-data ancestors: need to support optional fields (approximate era instead of exact dates) for people 500 years back where full records don't exist.
- Backlog: separate edge type (e.g., `KNOWN_DESCENDANT_OF`) for asserted-but-undocumented ancestral connections to historical figures, distinct from fully documented `PARENT_OF` chains.

### Relationship-Path Algorithm (core thesis contribution)
- **Approach:** ancestor-intersection method — generalizes lowest-common-ancestor to *all* common ancestors, which naturally produces the "multiple relationship paths" feature for intermarried families (pedigree collapse).
  1. BFS upward from each of the two people via `PARENT_OF` edges only, bounded depth, recording generation-distance per ancestor.
  2. Intersect the two ancestor sets — each match is a distinct common ancestor / relationship path.
  3. Classify each path from generation-distances (m, n): direct line, siblings, aunt/uncle, or cousin degree + "removed" count via standard formula.
  4. Present all distinct paths found (dense families may have several, e.g. double cousins).
- **Depth bound:** ~20–22 generations (covers 500-year target with headroom). Not user-configurable; invisible safety rail against pathological pedigree-collapse cases.
- **Relationship labels:** full precise terms (e.g., "2nd cousin once removed").
- **Split of responsibility:** graph traversal in Cypher (Neo4j-native), relationship classification/labeling logic in Python (easier to write/test/debug).
- **Out of scope (backlog):** in-law relationship paths via `PARTNER_OF` traversal.

### Frontend / Visualization
- **Cytoscape.js** chosen for graph/tree rendering — supports hierarchical layout (traditional tree view) and force-directed layout (graph view) from the same underlying node/edge data. Free, no licensing complications.
- **Two view modes required:** traditional family-tree format + graph format (per thesis paper).
- **Ruled out:** Neo4j Bloom (requires Enterprise license, designed as standalone analyst tool not embeddable end-user UI), Pajek (desktop software, not embeddable), Dual-tree (academic technique, not a packaged library — would require full custom implementation).
- Manual branch collapse/expand (buttons/arrows to hide branches) — core scope, standard graph-viz interaction pattern.
- Not building custom UI design from scratch — component library approach to minimize custom design work while looking modern.

### API Layer
- **Python + FastAPI.** Async-native, built-in validation via Pydantic, auto-generated docs.
- **Plain REST** (not GraphQL — unnecessary complexity for a scoped, known client).
- Authorization: every query must be scoped to trees the requesting user has access to. Needs a consistent enforcement pattern (e.g., dependency injection of accessible tree IDs), not ad hoc per-endpoint checks. **[Design deferred — see Open Items]**

### Access Control / Sharing
- Tree owners can grant access to other users (typically relatives).
- **Role-based permissions per tree:** editor vs. viewer (not just binary owner/no-access).
- Data model implication: needs a `TreeAccess`-style relationship linking (user, tree, role), not a single `owner_id` field. **[Detailed design deferred]**

### Security
- Web app security is an explicit secondary thesis component (not just a background concern).
- Topics to cover when designed: authentication/session handling, per-tree authorization enforcement, Cypher injection prevention, secrets/credential management.
- **[Full design deferred — see Open Items]**

### Testing
- Revised given 6 hr/week budget and no formal defense: unit tests remain a priority for the algorithm specifically; E2E testing is explicitly cuttable if time runs short.
- Unit test coverage target: **general/common relationship types only** — direct line, siblings, standard cousins with removal, at least one multi-path/double-cousin case. No requirement to test exhaustive or hypothetical edge-case relationships.
- E2E tests: scoped to critical flows (create tree → add people → query relationship), lowest priority, cut first under time pressure.

### Deployment
- Single containerized service (Docker) on a managed platform (e.g., Railway/Render/Fly.io) rather than Kubernetes for core scope — gets "real production practices" (CI/CD, env config, health checks) without orchestration overhead for a solo dev on a deadline.
- Kubernetes experimentation: backlog / stretch, only after core deliverables solid.

### Demo Strategy
Two separate demo trees, showing two different things:
1. **Manual-entry tree** — small, built live/on-screen through the UI, demonstrating the actual product experience (a user building their own tree from scratch).
2. **Large dense tree (~thousands of people)** — demonstrates the thesis's scalability and multi-path relationship claims. **Populated via a Cypher/Python seed script, not manual UI entry** (manual entry at this scale isn't feasible within the time budget). Script should be written early (Phase 1) since it doubles as test-data generation for algorithm unit tests. Should include intentional intermarriage/cousin-marriage patterns to demonstrate multi-path relationship detection (pedigree collapse) meaningfully.

## Technology Stack

**Database**
- **Neo4j** (graph database), via **AuraDB Free** tier (cloud-managed, no cost, no credit card required). Interact via the **Aura Console's Query tab** (browser-based Cypher editor) for exploration, prototyping, and running the seed script — no local install (Neo4j Desktop) needed.

**Backend**
- **Python + FastAPI**, developed in **VS Code**. Includes Pydantic for request/response validation (built into FastAPI).
- **neo4j** Python driver (official, `pip install neo4j`) for connecting to AuraDB from the API layer.
- **pytest** for unit tests (relationship-path algorithm correctness).

**Frontend / Visualization**
- **Cytoscape.js**, developed in **VS Code**.

**Supporting tooling**
- **Docker** — containerizing the FastAPI app for deployment.
- **Hosting platform: TBD** — decide later (candidates discussed earlier: Railway/Render/Fly.io).

**Stretch / backlog (not core scope given 6 hr/week budget)**
- **Kubernetes** (YAML manifests) — deployment orchestration. Revisit only after core deliverables are solid; see Deployment section for the reasoning (adds real overhead — cluster management, manifest debugging — that isn't needed at this project's scale).

## Project Constraints

- Solo developer, also working part-time. **Realistic time budget: ~6 hrs/week** (down from earlier 15-20 hr/week estimate — total ~96 hrs across 16 weeks, not 240-320). This is a major constraint driving scope decisions below. Unknown whether this loosens later in the semester — **[Open item]**.
- Timeline: ~3–4 months to working product.
- No formal thesis defense — deliverables are a non-technical demo + written implementation report. This lowers the bar on some polish (e.g., correctness testing can be representative rather than exhaustive) but the write-up still needs to explain validation methodology.
- Developer is comfortable with SQL, new to graph databases; not UI-design-focused; no prior hands-on Cypher experience yet (see Open Items — spike needed).
- Given the reduced time budget, **priority has shifted from "polished product" toward "algorithmic core + proof-of-concept UI."** Thesis paper's own framing ("accomplishing the first stage alone will be considered a success") supports this as a legitimate, complete thesis outcome, not a fallback.

### Tech Stack Rationale (Python vs. alternatives)
Considered Go, Java, and Node.js/TypeScript as backend language alternatives to Python + FastAPI. Decision: **stay with Python.**
- No prior hands-on backend experience stated in any of these languages, so learning-curve cost is roughly comparable across options — the deciding factor is which gets a working CRUD API with the least friction, not raw language merit.
- Go and Java offer performance/concurrency/type-safety advantages that don't matter at this project's scale (2,500 nodes, low concurrent users) and come with more setup ceremony and slower iteration loops (compile steps, boilerplate, build tooling) — a bad trade against a 6 hr/week budget.
- Node/TypeScript's main advantage (language unification with frontend) is real but secondary to FastAPI's stronger out-of-the-box validation and auto-generated docs for a beginner to backend work.
- Note: Cypher (Neo4j's query language) is not a competing choice against these — it's required regardless of host language, the same role SQL plays for a relational DB. The actual architectural decision already made is *how much logic lives in Cypher vs. Python*: traversal in Cypher, classification/labeling in Python (see Relationship-Path Algorithm section).

## Backlog / Stretch Goals (explicitly deferred, not core scope)

1. GEDCOM import/export.
2. Branch/density clustering — algorithmic (graph community detection, e.g. Neo4j GDS Louvain) or simpler ancestor-anchored subdivision.
3. In-law relationship paths (via `PARTNER_OF` traversal).
4. Kubernetes deployment.
5. `KNOWN_DESCENDANT_OF` edge type for undocumented historical ancestor connections.
6. Othram Maps–style zoom-based density clustering visualization (progressive aggregation of nodes into cluster circles at zoom-out).

## API Endpoint List (by feature/action)

**Account & login**
- Register a new account — `POST /auth/register`
- Log in — `POST /auth/login`
- Log out — `POST /auth/logout`
- Refresh session — `POST /auth/refresh`

**Managing a tree**
- Create a new tree — `POST /trees`
- List trees I have access to — `GET /trees`
- View a tree's details — `GET /trees/{tree_id}`
- Rename/update a tree — `PATCH /trees/{tree_id}`
- Delete a tree — `DELETE /trees/{tree_id}`

**Sharing a tree with others**
- Grant someone access (set their role) — `POST /trees/{tree_id}/access`
- See who has access to a tree — `GET /trees/{tree_id}/access`
- Change someone's role (editor ↔ viewer) — `PATCH /trees/{tree_id}/access/{user_id}`
- Revoke someone's access — `DELETE /trees/{tree_id}/access/{user_id}`

**Managing people in a tree**
- Add a person — `POST /trees/{tree_id}/people`
- View a person's details — `GET /trees/{tree_id}/people/{person_id}`
- Edit a person's details — `PATCH /trees/{tree_id}/people/{person_id}`
- Remove a person — `DELETE /trees/{tree_id}/people/{person_id}`
- List/search people in a tree — `GET /trees/{tree_id}/people`

**Managing relationships between people**
- Add a relationship (parent-child or partner) — `POST /trees/{tree_id}/relationships`
- Remove a relationship — `DELETE /trees/{tree_id}/relationships/{relationship_id}`

**Viewing & analyzing the tree**
- Fetch tree data for visualization (supports root person / depth params, so you're not always pulling all 2,500 people) — `GET /trees/{tree_id}/graph`
- Get someone's direct relatives (parents, children, siblings, partners) — `GET /trees/{tree_id}/people/{person_id}/relatives`
- Find how two people are related, including all distinct paths, with full relationship labels — `GET /trees/{tree_id}/relationship-path?person_a={id}&person_b={id}`

## Phased Build Plan (~16 weeks)

Iterative approach: rough data model/backend first, then a preliminary UI to sanity-check the API and data model visually, then continue backend work with a working UI already in place, then bring the UI up to match.

| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1–3 | Data model & backend foundations: Neo4j (Aura) setup, data model, basic CRUD API, auth scaffolding |
| 2 | 4–5 | Preliminary UI: rough Cytoscape.js frontend (login, create tree, add people/relationships, render graph fetch) — not polished, confirms API shape works for a real frontend |
| 3 | 6–9 | Continue backend: relationship-path algorithm (Cypher + Python, unit tests), access control/permissions, core security hardening |
| 4 | 10–12 | Update UI: second view mode (traditional vs. graph layout), branch collapse/expand, relationship-path query UI, polish |
| 5 | 13–14 | Testing & deployment: E2E tests on critical flows, Docker, deploy to managed host |
| 6 | 15–16+ | Buffer, then backlog items in priority order if time remains |

Rationale for sequencing: the relationship-path algorithm (Phase 3) is the thesis's intellectual core and riskiest piece, so it's still done early relative to full polish — but a preliminary UI exists first (Phase 2) so integration issues with the data model/API surface while cheap to fix, and later backend work can be visually sanity-checked as it's built.

## Open Items (flagged for later discussion)

**Design work deferred:**
- Detailed authorization design (tree access enforcement pattern).
- Editor/viewer permission model — full data model + enforcement logic (note: may be simplified to owner-only if time-constrained, see Scope Boundaries).
- Web app security deep-dive (auth flow, session handling, Cypher injection prevention).

**Action items (yours to close out):**
- **Confirm test/demo dataset source.** Direction: a historic/well-documented large family tree, ideally one with real pedigree collapse (e.g., royal lineages are a good candidate — genuinely useful for demoing multi-path detection, not just a placeholder). Still needs a concrete pick and a compatibility check with your data model.
- **Do a hands-on Cypher spike.** Load a small (~10-15 person) toy dataset into Neo4j and hand-write the ancestor-traversal query. This is the single biggest unknown-unknown risk on the project (no prior graph-DB experience) and should happen in week 1, not mid-Phase-3, so there's still time to adjust the plan if it's harder than expected.
- **Talk to thesis advisor about the 6 hr/week time constraint specifically** — separate conversation from the scope reduction (which the paper's own stage-1-is-success framing already covers). Silence for long stretches due to low weekly hours is a different risk than reduced scope, and worth surfacing proactively.
- **Confirm whether the 6 hr/week ceiling is fixed for the whole semester or may loosen** (e.g., lighter coursework or fewer work hours later) — determines whether to plan for a flat ~96 total hours or something backloaded.

---
*Last updated: reflects time-budget revision (6 hrs/week), tech stack rationale, demo strategy, and scope adjustments for biological-only relationships.*
