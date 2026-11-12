# Grapht

Grapht is a web app for building, exploring and analysing **large, dense family trees**.

Most family tree tools assume a tidy, branching tree. Real families aren't tidy: cousins marry cousins, the same ancestor shows up on both sides, and people have several partners. Grapht stores a family as a **graph**, so these tangled structures are handled naturally instead of being squeezed into a strict tree.

![Grapht graph view, showing a family as connected nodes with a details card for the selected person](docs/images/graph-view.png)

## The goal

- **Large, dense families.** Built for trees of 2,500+ people across up to ~20 generations (about 500 years), where relatives are connected in many overlapping ways.
- **Map multiple relationship paths.** Two people in an intermarried family can be related in several ways at once (for example, both second cousins *and* third cousins). Grapht is designed to find **every** distinct path between two people, not just the shortest one.
- **Usable, scalable and private.** A UI a real person can navigate, graph rendering that stays smooth on big trees, and per-tree access control with secure login.

Grapht is a thesis project demonstrating that graph databases model genealogical data more naturally and efficiently than relational ones, especially for relationship-path analysis.

## How it works

- Each **person** is a node. Each **relationship** is a typed edge: `PARENT_OF` (parent to child) or `MARRIED_TO` (partners).
- There is no separate "family" node. Everything is a direct person-to-person link.
- To find how two people are related, the backend walks up the `PARENT_OF` edges from each person, finds their common ancestors, and labels each path ("sibling", "1st cousin", "2nd cousin once removed", and so on).

## Features

**Working now**
- User accounts with JWT login
- Multiple trees per user, with each tree's data kept isolated
- Add, edit and delete people, with optional fields for sparse historical data (gender, birth and death year, birthplace, notes)
- Parent-child and marriage relationships (with marriage and divorce years)
- Two views of a tree, switchable with a Graph/Tree toggle: a force-directed graph, and a traditional top-down family tree layout
- Interactive graph with a details card for the selected person, and search
- Members page (a searchable table of everyone in the tree) and a page for each member, showing their details and family
- Landing page and settings page
- Light and dark themes

**In progress / planned**
- Relationship-path finder that returns all paths between two people (the button is in place but not active yet)
- Sharing trees with other users (editor or viewer roles); for now a tree is visible only to its owner
- Further ideas (custom fields, bulk add, GEDCOM import, voice-to-tree, a 3D view) are tracked in `plan/specs/tasks.md`

## Tech stack

**Database**
- Neo4j (AuraDB Free, cloud-hosted)

**Backend**
- Python
- FastAPI
- Pydantic
- neo4j (official Python driver)
- PyJWT (authentication tokens)
- pwdlib with Argon2 (password hashing)
- pytest

**Frontend**
- React
- Vite
- Sigma.js (WebGL graph rendering) with graphology (graph data structure)
- graphology-layout-forceatlas2 (force-directed layout)
- dagre (hierarchical tree layout)
- React Router
- Axios
- Tailwind CSS v4
- Fonts: Fraunces, Cormorant Garamond and DM Sans (self-hosted with Fontsource)

**Planned for deployment**
- Docker
- GitHub Actions (CI)
- A managed host (Railway, Render or Fly.io)

## Getting started

You need Python 3, Node.js and a Neo4j database (a free [AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) instance works).

**1. Configure credentials.** Create `backend/.env` with your database details:

```
NEO4J_URI=neo4j+s://your-instance-id.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password-here
JWT_SECRET=replace-with-a-long-random-string
```

**2. Run the backend** (from `backend/`):

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is served at `http://localhost:8000/api`, with interactive docs at `http://localhost:8000/api/docs`.

**3. Run the frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`, and requests to `/api` are proxied to the backend.

**Run the tests** (from `backend/`):

```bash
pytest
```

## Project docs

Planning documents live in `plan/specs/`:

- `requirements.md`, `design.md`: what is being built and how
- `tasks.md`, `schedule.md`: the task list and timeline
- `steering/`: product, tech and structure notes
