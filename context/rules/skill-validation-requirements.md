---
tags:
  - rule
  - workflow
severity: important
applies-to:
  - skills/<name>/SKILL.md
  - .claude/skills/<name>/SKILL.md
created: 2026-04-30
---
# Skill validation requirements (frontmatter and folder)

A skill that violates any of the following hard constraints will silently fail to load — the YAML frontmatter validator on Claude's runtime rejects it. These are not style preferences; they are validation rules from Anthropic's platform docs.

## Why

These constraints are enforced by Claude's skill discovery system. Violating them produces silent failures (the skill never appears in the available list) or upload errors. They were originally introduced to prevent prompt-injection via frontmatter and to keep skill discovery deterministic across Claude.ai, Claude Code, and the API.

## How to Apply

When creating or modifying any skill in this repo, the following must be true. If you cannot satisfy a constraint, the skill is not shippable.

### Folder

- The skill folder name must be **kebab-case**: lowercase letters, numbers, hyphens. No spaces, no underscores, no capitals.
  - ✓ `processing-pdfs`, `harness-recall`
  - ✗ `Processing PDFs`, `processing_pdfs`, `ProcessingPDFs`
- The folder name **should match the `name` field** in `SKILL.md` exactly.
- The folder must **not** contain a `README.md` — all documentation goes in `SKILL.md` or `references/`. (A repo-level `README.md` outside the skill folder is fine for human visitors on GitHub.)

### File

- The file must be named exactly **`SKILL.md`** — case-sensitive. `SKILL.MD`, `skill.md`, `Skill.md` all fail.
- The file must begin with YAML frontmatter delimited by `---` lines.

### Frontmatter — `name` (required)

- 1–64 characters.
- Lowercase letters, numbers, and hyphens **only**.
- **No XML angle brackets** (`<` or `>`).
- **Must not contain** the reserved words `anthropic` or `claude`.

### Frontmatter — `description` (required)

- Non-empty.
- Maximum **1024 characters**.
- **No XML angle brackets** (`<` or `>`).
- Should describe both **what the skill does** and **when to use it**. (Style guidance lives in `[[../conventions/skill-md-style]]`.)

### Frontmatter — optional fields

- `license` — string, e.g. `MIT`, `Apache-2.0`. Use when shipping open source.
- `compatibility` — 1–500 characters describing required environment (Claude Code only, MCP server X required, network access needed, etc.).
- `allowed-tools` — restricts which tools the skill can use (e.g. `"Bash(python:*) Bash(npm:*) WebFetch"`).
- `metadata` — arbitrary key-value pairs (`author`, `version`, `mcp-server`, `tags`, etc.).

### Forbidden anywhere in frontmatter

- XML angle brackets `<` `>`.
- Code execution constructs.
- Reserved-word names (`claude-*`, `anthropic-*`).

## Source

Anthropic platform docs — *Skill authoring best practices*, "Technical notes" / "YAML frontmatter requirements" sections; *The Complete Guide to Building Skills for Claude* (PDF), Chapter 2 "Technical requirements" and Reference B.
