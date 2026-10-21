# Requirements

User stories organized by feature area. These define what the app must do from a user's perspective.

---

## Authentication

- As a new user, I want to register with a name, email and password so that I have a personal account.
- As a registered user, I want to log in and receive a session token so that I can access my trees securely.
- As a logged-in user, I want to log out so that my session ends.
- As a logged-in user, I want my session to refresh automatically so that I don't get logged out mid-session.

---

## Tree Management

- As a user, I want to create a new, empty family tree with a name so that I can start building it.
- As a user, I want to see a list of all trees I own or have been granted access to.
- As a user, I want to rename a tree I own.
- As a user, I want to delete a tree I own.

---

## People

- As a tree editor, I want to add a person to a tree with fields: name (required), birth year, death year, birth place, and notes so that I can record family members including historical ancestors with partial records.
- As a tree editor, I want to edit a person's details.
- As a tree editor, I want to remove a person from a tree.
- As a tree viewer or editor, I want to view a person's details.
- As a tree viewer or editor, I want to search or list all people in a tree so that I can find specific individuals.

---

## Relationships

- As a tree editor, I want to add a parent-child relationship between two people so that I can build the family structure.
- As a tree editor, I want to add a partner relationship between two people.
- As a tree editor, I want to remove a relationship between two people.

---

## Visualization

- As a tree viewer or editor, I want to see the tree rendered as a force-directed graph so that I can explore connections visually.
- As a tree viewer or editor, I want to switch to a traditional family tree (hierarchical) layout so that I can see the tree in a familiar format.
- As a tree viewer or editor, I want to collapse a branch to hide its subtree and expand it to reveal it again, so that I can navigate large trees without visual clutter.
- As a tree viewer or editor, I want to click a person node and see their details in a side panel.
- As a tree editor, I want to edit a person's details from that side panel.

---

## Relationship-Path Analysis

- As a tree viewer or editor, I want to select any two people and find out how they are related, so that I can understand connections in the family.
- As a tree viewer or editor, I want to see ALL distinct relationship paths between two people (not just one), so that I can understand pedigree collapse and intermarriage in dense family trees.
- As a tree viewer or editor, I want relationship labels to use full precise terms (e.g., "2nd cousin once removed") so that the output is meaningful.

---

## Sharing & Access Control

- As a tree owner, I want to grant another user access to my tree with a role of editor or viewer.
- As a tree owner, I want to see who has access to my tree and their roles.
- As a tree owner, I want to change another user's role on my tree.
- As a tree owner, I want to revoke another user's access to my tree.
- As a viewer, I can see and navigate the tree but cannot add, edit, or remove people or relationships.
- As an editor, I can add, edit, and remove people and relationships in addition to viewing.

---

## Constraints & Non-Functional Requirements

- The app must support trees of at least 2,500 people without unacceptable performance degradation.
- All biological relatives must be supported (half-siblings fall out of the ancestor-intersection algorithm naturally).
- Every API query must be scoped to trees the requesting user has access to — no cross-tree data leakage.
- All Cypher queries must be parameterized — no string interpolation in queries.
- Secrets and credentials must never be hardcoded; all in `.env`.
- The app must support optional/sparse data fields for historical ancestors (e.g., approximate era instead of exact dates).

---

## Out of Scope (not user stories to build)

- GEDCOM import/export
- In-law / step-relationship path analysis
- DNA analysis or genealogical research tools
- Kubernetes deployment
- `KNOWN_DESCENDANT_OF` undocumented ancestral edge type
