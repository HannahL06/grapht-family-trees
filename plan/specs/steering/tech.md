# Technology Stack
- keep in mind, tech stack may change depending on development priorities

## Database
- **Neo4j** via **AuraDB Free** (cloud-managed, no local install)
- People = nodes, relationships = typed edges: `PARENT_OF`, `MARRIED_TO`
- No `Family` node — pure person-to-person edges
- User/account data: stored in Neo4j as `User` nodes (unique constraint on email); can revisit later if needed
- Access the AuraDB via Aura Console Query tab for exploration and running seed scripts

## Backend
- **Python** (intermediate level) + **FastAPI**
- **Pydantic** for request/response validation (built into FastAPI)
- **neo4j** Python driver (official, `pip install neo4j`) for AuraDB connection
- **PyJWT** for JWT token handling (matches current FastAPI docs)
- **pwdlib[argon2]** for password hashing (Argon2id, per OWASP and FastAPI docs)
- **pytest** for unit tests
- Plain REST API (not GraphQL)

## Frontend
- **React** (with **Vite** as build tool)
- **Sigma.js** (WebGL renderer) + **graphology** (graph data structure) for graph/tree visualization — chosen over Cytoscape.js so trees well beyond 2,500 people stay smooth. Sigma only renders; layouts are separate packages:
  - Force-directed layout for graph view: `graphology-layout-forceatlas2` (in a web worker)
  - Hierarchical layout for traditional tree view: `dagre` computes positions, written onto the nodes
- **React Router** for client-side routing
- **Axios** for API calls
- **shadcn/ui** (or similar) for component library — minimize custom design work
- JWT stored in localStorage; injected as Authorization header on all API calls

## Auth Approach
- **JWT tokens** — issued on login, verified via FastAPI dependency injection
- `get_current_user` dependency used on all protected routes
- Token refresh via `/auth/refresh`

## Deployment
- **Docker** — containerized FastAPI app
- **GitHub Actions** — CI/CD (run tests on push, build Docker image)
- **Managed host** — Railway, Render, or Fly.io (TBD at Phase 5)

## Development Environment
- VS Code
- Python virtual environment
- `.env` file for all secrets/credentials — never hardcoded, never committed

## Key Architectural Decision
Graph traversal (BFS ancestor search) lives in **Cypher** (Neo4j-native).
Relationship classification and labeling logic lives in **Python** (easier to test and debug).
