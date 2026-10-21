# Project Structure

Expected directory layout once the project is fully built out. The backend is organized **by feature**, and each feature uses three layers: router, service, repository.

```
grapht/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, router registration, startup (constraints/indexes)
│   │   ├── core/
│   │   │   ├── config.py             # Loads env vars (.env) into one settings object
│   │   │   ├── db.py                 # Neo4j driver + run_query helper (used ONLY by repositories)
│   │   │   ├── security.py           # Password hashing (pwdlib/Argon2id), JWT create/verify (PyJWT)
│   │   │   └── dependencies.py       # get_current_user, tree access checks
│   │   ├── auth/                     # /auth/*
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── schemas.py
│   │   ├── trees/                    # /trees/*
│   │   │   └── router.py, service.py, repository.py, schemas.py
│   │   ├── access/                   # /trees/{id}/access/* (sharing, roles)
│   │   │   └── router.py, service.py, repository.py, schemas.py
│   │   ├── people/                   # /trees/{id}/people/*
│   │   │   └── router.py, service.py, repository.py, schemas.py
│   │   ├── relationships/            # /trees/{id}/relationships/*
│   │   │   └── router.py, service.py, repository.py, schemas.py
│   │   └── analysis/                 # /trees/{id}/graph, /relatives, /relationship-path
│   │       ├── router.py
│   │       ├── service.py            # Orchestrates: ancestors -> common ancestors -> labels
│   │       ├── repository.py         # Cypher: parents of a set of people, graph fetch
│   │       ├── algorithm.py          # Pure Python: find_common_ancestors, classify_relationship (no DB)
│   │       └── schemas.py
│   ├── tests/
│   │   └── test_algorithm.py         # Unit tests for algorithm.py (no database needed)
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

## Layer rules (backend)
- **router.py** — HTTP only: parse/validate the request, call the service, shape the response. No Cypher, no business logic.
- **service.py** — application logic and rules (e.g., "viewers can't edit", "both people must be in this tree"). Calls repositories; raises plain errors that the router turns into HTTP status codes.
- **repository.py** — the ONLY place Cypher lives. Every function is fully parameterized, and every tree-scoped function takes `tree_id` (see "Tree isolation" in `design.md`). Only repositories may import `core/db.py`.
- **schemas.py** — Pydantic request/response models for the feature.
- **algorithm.py** — pure Python with no imports from the database layer, so it can be unit tested with plain dicts.

## Notes
- Backend and frontend are separate — frontend calls backend via REST
- Auditing for injection and tree isolation means reading `repository.py` files only
- `.env` is always in `.gitignore`
- Seed script lives in `backend/seed/` and runs against AuraDB via `core/db.py`
