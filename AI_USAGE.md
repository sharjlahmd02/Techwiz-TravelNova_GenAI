# AI Usage

This document tracks all AI tool usage during the development of SupportNova, as required by the competition rules.

## Tools Used

| Tool | Purpose |
|------|---------|
| Claude (Anthropic) | Architecture planning, code generation, scaffolding, documentation |

## Usage Log

### 2026-09-26 — Project Scaffolding
- Used Claude Code to read the specification, instructions, task breakdown, and design system documents (`doc/spec.md`, `doc/claude.md`, `doc/task.md`, `doc/design.md`).
- Generated the initial repository structure: backend FastAPI skeleton, SQLAlchemy models, Alembic setup, and frontend Vite/React/TypeScript/Tailwind skeleton (Phase 0 of `doc/task.md`).

## Human vs AI-Authored Work

- **AI-assisted:** boilerplate scaffolding (project structure, config files, model definitions, router/service skeletons), Tailwind design token setup.
- **Human-authored:** product requirements and specification (`doc/spec.md`, `doc/design.md`), business rule content (resolution rules, escalation rules, policy documents), final review and testing decisions.

*This file is updated continuously as development progresses.*
