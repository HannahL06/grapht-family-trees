# Product Overview

## What It Is
Grapht is a web application for building and analyzing large, dense family trees. Target scale: 2,500+ people, up to ~20 generations / 500 years back.

## Core Thesis Contribution
Demonstrating that graph databases model genealogical data more efficiently and naturally than relational databases — particularly for relationship-path analysis in densely interconnected families (pedigree collapse).

## Three Design Principles
1. **Usability** — functional UI a real user could navigate
2. **Scalability** — handles 2,500+ person trees without degrading
3. **Privacy** — per-tree access control, secure auth

## What It Does (Core Features)
- User accounts with authentication
- Create and manage multiple family trees
- Add people (with optional/sparse historical fields)
- Define parent-child and partner relationships
- Visualize the tree in two modes: graph layout and traditional family tree layout
- Find how any two people are related — returns ALL distinct relationship paths (handles pedigree collapse / intermarried families)
- Share trees with other users (editor or viewer role)

## What It Does NOT Do
- Genealogical research tools or document archives
- DNA analysis
- GEDCOM import/export (backlog)
- In-law / step relationships via partner traversal (backlog)
- Kubernetes orchestration (backlog)

## Demo Strategy
Two trees shown at demo:
1. **Manual-entry tree** — small, built live through the UI to show the product experience
2. **Large dense tree (~2,500 people)** — populated via seed script; demonstrates scalability and multi-path relationship detection (pedigree collapse)

## Success Criteria
Per thesis framing: completing the algorithmic core (relationship-path detection working correctly) plus a proof-of-concept UI is a complete, legitimate outcome. Polished product is a stretch goal.

## Deadline
~3 hrs/week budget; ~58 hrs of core tasks projects to ~22–24 weeks. End date is flexible and task-dependent (see `schedule.md`). Solo developer.
