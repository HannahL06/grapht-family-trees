# Project Structure

Expected directory layout once the project is fully built out. The backend is organized **by feature**, one file per feature: routes, request/response validation, and Cypher all live together. No router/service/repository split — that was considered and deliberately dropped as unnecessary ceremony for a solo project at this scale; revisit only if access-control logic (Phase 3) turns out to need a shared place to live across many routes.

```
grapht/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, feature registration, startup (constraints/indexes)
│   │   ├── core/
│   │   │   ├── config.py             # Loads env vars (.env) into one settings object
│   │   │   ├── db.py                 # Neo4j driver + run_query helper
│   │   │   ├── security.py           # Password hashing (pwdlib/Argon2id), JWT create/verify (PyJWT)
│   │   │   └── dependencies.py       # get_current_user, tree access checks
│   │   ├── auth.py                   # /auth/*: schemas, routes, and Cypher together
│   │   ├── trees.py                  # /trees/*
│   │   ├── access.py                 # /trees/{id}/access/* (sharing, roles)
│   │   ├── people.py                 # /trees/{id}/people/*
│   │   ├── relationships.py          # /trees/{id}/relationships/*
│   │   └── analysis.py               # /trees/{id}/graph, /relatives, /relationship-path
│   │                                 #   contains get_ancestors/find_common_ancestors/classify_relationship
│   │                                 #   as plain functions — they take plain data in and out, so tests can
│   │                                 #   call them directly with no database, even though the file also
│   │                                 #   has route functions that do touch the database.
│   ├── tests/
│   │   └── test_algorithm.py         # Unit tests for the pure classification/matching functions in analysis.py
│   ├── seed/
│   │   └── seed.py                   # Seed script: creates test data in AuraDB
│   ├── .env                          # Secrets — NOT committed
│   ├── .env.example                  # Template showing required env vars — committed
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js             # Axios instance with base URL + auth header
│   │   │   ├── auth.js               # register, login, logout API calls
│   │   │   ├── trees.js              # tree CRUD API calls
│   │   │   ├── people.js             # people CRUD API calls
│   │   │   └── analysis.js           # graph fetch, relationship-path API calls
│   │   ├── components/
│   │   │   ├── TreeGraph.jsx         # Cytoscape.js wrapper component
│   │   │   ├── PersonForm.jsx        # Add/edit person form
│   │   │   ├── RelationshipForm.jsx
│   │   │   └── PersonPanel.jsx       # Side panel: person details + edit
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── TreesPage.jsx         # List/create trees
│   │   │   └── TreeView.jsx          # Main tree visualization + controls
│   │   ├── App.jsx                   # Router setup
│   │   └── main.jsx                  # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── plan/
│   ├── original-spec.md              # Original spec — do not edit, kept as history
│   └── specs/
│       ├── steering/
│       │   ├── product.md
│       │   ├── tech.md
│       │   └── structure.md
│       ├── requirements.md
│       ├── design.md
│       ├── tasks.md
│       └── schedule.md
└── README.md
```

## Feature-file rules (backend)
- Each feature file (`trees.py`, `people.py`, `relationships.py`, `auth.py`, `access.py`, `analysis.py`) contains its own Pydantic schemas, its FastAPI route functions, and the Cypher it needs, in that one file.
- All Cypher is fully parameterized — no string interpolation. Every tree-scoped query takes `tree_id` (see "Tree isolation" in `design.md`).
- Shared infrastructure stays in `core/`: the Neo4j driver (`db.py`), settings (`config.py`), password/JWT helpers (`security.py`), and FastAPI dependencies (`dependencies.py`). Feature files import from `core/`, not the other way around.
- `analysis.py` keeps its relationship-classification functions as plain functions that take and return plain data (dicts, lists) with no database calls inside them — not a separate file, just written so tests can call them directly without touching Neo4j.

## Notes
- Backend and frontend are separate — frontend calls backend via REST
- Auditing for injection and tree isolation means reading these feature files (there's nowhere else Cypher could be)
- `.env` is always in `.gitignore`
- Seed script lives in `backend/seed/` and runs against AuraDB via `core/db.py`
