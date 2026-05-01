---
tags:
  - learning
  - concept
related:
  - "[[harness-engineering-foundations]]"
created: 2026-04-30
---
# AGENTS.md is a map, not an encyclopedia

The `AGENTS.md` file at the root of any repo touched by a skill in this collection (whether dogfooded here or scaffolded elsewhere by `harness/`) must stay short — **80 lines hard cap, target 70–80** — and act as a *table of contents* into a structured knowledge directory. It is not the place to dump every rule, every convention, every gotcha. The harness enforces the cap mechanically via Phase 5 validation check #14.

## Context

OpenAI's harness-engineering essay (2025-2026) explicitly tested the "one big AGENTS.md" approach in their five-month, 1M-line, fully-agent-generated repo. It failed. They documented four failure modes worth memorizing — they apply directly to any AGENTS.md the harness skill produces or modifies.

## How It Works

The four failure modes OpenAI named:

1. **Context is scarce.** A giant instruction file crowds out the actual task, the relevant code, and the relevant docs. The agent either misses the constraint that mattered or starts optimizing for the wrong one.
2. **Too much guidance becomes non-guidance.** When everything is "important", nothing is. Agents end up pattern-matching locally instead of navigating intent.
3. **It rots instantly.** Monolithic manuals become graveyards of stale rules. Agents can't tell what's still true; humans stop maintaining it.
4. **It's hard to verify.** A single blob doesn't lend itself to mechanical checks (coverage, freshness, ownership, cross-links). Drift is inevitable and invisible.

**The fix** OpenAI converged on (and that this repo's `harness/` skill scaffolds by default):

- A short `AGENTS.md` (≤ 80 lines, target 70–80) — the entry point. It states the project, the workflow trigger, the work ethic, and the locations of deeper knowledge.
- A structured directory (`context/` here, `docs/` in OpenAI's case) holding the system of record: constitution, design docs, exec plans, generated artifacts, references.
- Cross-links between them, validated mechanically (linters, CI checks).
- Progressive disclosure: agents start with the small map and are taught where to look next.

Looking at this repo's `AGENTS.md` (currently 72 lines) and `context/_index/home.md` MOC: this pattern is already followed and the size cap (#14) protects against future bloat. Future edits should respect the cap — never let `AGENTS.md` swell.

## Note on scope

This note is about the `AGENTS.md` files that live at the root of repos using the `harness` scaffold (this one, and target repos). It is **not** about how Claude Code `SKILL.md` files should be structured — that is a separate platform concern.
