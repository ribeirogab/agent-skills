# Vault Files — File Specifications

All concrete file contents the orchestrator writes when scaffolding the `context/` vault. Load this reference only when you are creating or repairing one of these files.

## Contents

- [Substitution rules — read first](#substitution-rules--read-first)
- [Obsidian config (3 JSONs)](#obsidian-config)
- [Atomic note templates (3 files)](#atomic-note-templates)
- [Spec templates (3 files) + naming convention](#spec-templates)
- [MOCs (5 files)](#mocs)

---

## Substitution rules — read first

Files in this reference fall into **two distinct groups**. Treat them differently when scaffolding:

### Group A — Templates (keep `{{}}` placeholders intact)

These files are templates that the user/agent will fill **later**, when creating an individual note or spec. Copy them verbatim. **Do NOT substitute any `{{}}` placeholder during scaffolding.**

- `context/templates/learning.md` (has `{{title}}`, `{{date}}`, `{{one-paragraph technical insight}}`, …)
- `context/templates/rule.md` (has `{{title}}`, `{{category}}`, `{{severity}}`, …)
- `context/templates/convention.md` (has `{{title}}`, `{{category}}`, …)
- `context/specs/_template/spec.md` (has `{{Feature Name}}`, `{{kebab-slug-of-feature}}`, …)
- `context/specs/_template/plan.md` (same)
- `context/specs/_template/tasks.md` (same)

### Group B — Project-bound files (substitute `{{Project Name}}` now)

These files describe the current project specifically. Substitute every occurrence of `{{Project Name}}` with the actual project name from Prerequisites **before writing** the file. No `{{}}` placeholder may survive in the written file.

- `context/_index/home.md`
- `context/_index/specs.md`
- `context/_index/learnings.md`
- `context/_index/conventions.md`
- `context/_index/rules.md`

Surviving `{{Project Name}}` in any Group B file is caught by Phase 5 validation (check #12) and fails the run.

### Group C — Inert (no placeholders to worry about)

- The 3 `.obsidian/*.json` files — pure JSON, no placeholders.

---

## Obsidian config

**`context/.obsidian/app.json`:**
```json
{
  "promptDelete": true,
  "alwaysUpdateLinks": true,
  "newLinkFormat": "relative",
  "useMarkdownLinks": false,
  "attachmentFolderPath": "attachments",
  "showLineNumber": true
}
```

**`context/.obsidian/appearance.json`:**
```json
{
  "baseFontSize": 16,
  "theme": "obsidian",
  "cssTheme": ""
}
```

**`context/.obsidian/core-plugins.json`:**
```json
{
  "file-explorer": true,
  "global-search": true,
  "switcher": true,
  "graph": true,
  "backlink": true,
  "outgoing-link": true,
  "tag-pane": true,
  "page-preview": true,
  "templates": true,
  "note-composer": true,
  "command-palette": true,
  "outline": true,
  "word-count": true,
  "file-recovery": true,
  "canvas": true,
  "properties": true,
  "bookmarks": true,
  "editor-status": true
}
```

---

## Atomic note templates

**`context/templates/learning.md`:**
```markdown
---
tags:
  - learning
related:
  - "[[related-note]]"
created: {{date}}
---
# {{title}}

{{one-paragraph technical insight}}

## Context

{{when/where this was discovered — feature, PR, incident, debugging session}}

## How to Apply

{{concrete, actionable instruction: what to do differently next time}}
```

**`context/templates/rule.md`:**
```markdown
---
tags:
  - rule
  - {{category: safety | workflow | code-style}}
severity: {{critical | important | advisory}}
applies-to:
  - {{scope}}
created: {{date}}
---
# {{title}}

{{short imperative statement of the rule}}

## Why

{{the reason — usually a past incident, constraint, or strong preference}}

## How to Apply

{{concrete instruction for when/how to apply this rule}}
```

**`context/templates/convention.md`:**
```markdown
---
tags:
  - convention
  - {{category}}
applies-to:
  - {{scope}}
created: {{date}}
---
# {{title}}

{{short imperative statement of the convention}}

## Why

{{the reason — clarity, consistency, tooling requirement, or team decision}}

## How to Apply

{{concrete instruction with examples}}
```

---

## Spec templates

**`context/specs/_template/spec.md`:**
```markdown
---
status: draft
feature: {{kebab-slug-of-feature}}
created: {{YYYY-MM-DD}}
shipped: null
---
# {{Feature Name}} — Spec

**Status:** Draft
**Scope:** {{one-sentence scope statement}}

## Context

{{why this feature exists, what triggered it, relevant constraints}}

## Problem Statement

{{what specific problem this feature solves}}

## Non-Goals

{{what this feature explicitly does NOT solve — prevents scope creep}}

## Constraints

{{technical, organizational, or timing constraints that shape the solution}}

## User Stories / Scenarios

{{numbered user flows or acceptance scenarios}}

## Success Criteria

{{observable, verifiable checks for "this feature is done"}}

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| {{risk}} | {{mitigation}} |

## Open Questions

{{use [NEEDS CLARIFICATION: specific question] markers for unresolved points}}
```

**`context/specs/_template/plan.md`:**
```markdown
---
feature: {{kebab-slug-of-feature}}
spec: "[[spec]]"
created: {{YYYY-MM-DD}}
---
# {{Feature Name}} — Plan

**For this spec:** `[[spec]]`

## Approach

{{2-3 paragraphs: the high-level technical approach and why it was chosen over alternatives}}

## Architecture

{{diagrams, component breakdown, data flow}}

## File Structure

{{files to be created, modified, or deleted, with one-line responsibilities}}

## Phase Ordering

{{if the work has natural phases, list them with dependencies}}

## Risks / Open Decisions

{{list any decisions the task-writer or implementer must make}}
```

**`context/specs/_template/tasks.md`:**
```markdown
---
feature: {{kebab-slug-of-feature}}
plan: "[[plan]]"
spec: "[[spec]]"
created: {{YYYY-MM-DD}}
---
# {{Feature Name}} — Tasks

**For this plan:** `[[plan]]`

## Phase 1: {{name}}

### Task 1: {{name}}

- [ ] Step 1: {{action}}
- [ ] Step 2: {{verification}}
- [ ] Step 3: Commit

(repeat as needed)
```

**Spec folder naming convention:** `YYYY-MM-DD-<kebab-slug>/` where `YYYY-MM-DD` is the date the spec was created. Examples: `2026-04-15-user-auth`, `2026-04-16-mobile-responsiveness`, `2026-04-17-api-refactoring`. Use today's date when creating a new spec; if multiple specs are created on the same day, the `<kebab-slug>` disambiguates them. The `_template/` folder is excluded from listings.

---

## MOCs

The MOCs start as skeletons — they grow as notes are added. Use the project info gathered in Prerequisites (see `SKILL.md`) to fill in `{{Project Name}}`.

**`context/_index/home.md`:**
```markdown
---
tags:
  - moc
---
# {{Project Name}} — Project Knowledge Vault

This vault contains all project-specific knowledge for {{Project Name}}: constitution, specs, learnings, and rules.

## Where to go

- **[[../constitution|Constitution]]** — non-negotiable project principles. Read before any substantive work.
- **[[specs|Specs MOC]]** — all specs, past and present, indexed by status.
- **[[learnings|Learnings MOC]]** — architecture, patterns, gotchas.
- **[[conventions|Conventions MOC]]** — code style choices the team has made.
- **[[rules|Rules MOC]]** — project-specific safety and workflow rules.

## How to use this vault

- New feature or refactor → copy `../specs/_template/` and fill in.
- New learning discovered → copy `../templates/learning.md` and add to `../learnings/`.
- New convention agreed → copy `../templates/convention.md` and add to `../conventions/`.
- New rule needed → copy `../templates/rule.md` and add to `../rules/`.
- Always cross-link with `[[wikilinks]]` so backlinks aggregate concepts over time.
```

**`context/_index/specs.md`:**
```markdown
---
tags:
  - moc
---
# Specs — Map of Content

All specs for {{Project Name}} features, past and current. Specs never get deleted — shipped specs remain as historical record.

## Workflow trigger

Before implementing a user request, ask: "Can I describe the complete solution in one sentence?" If no → use the Spec Kit flow. If yes → go direct. If almost → ask the user.

Template: `[[../specs/_template/spec|_template/spec]]`

## Active

_No active specs. When a request requires the spec flow, link the new spec here._

## Shipped

_No shipped specs yet._
```

**`context/_index/learnings.md`:**
```markdown
---
tags:
  - moc
---
# Learnings — Map of Content

Atomic notes about {{Project Name}}'s architecture, patterns, and gotchas. Categorized by tag.

Learnings here are specific to {{Project Name}}. Code style conventions live in `[[conventions|Conventions MOC]]`.

## `#concept` — Architecture and patterns

_No learnings yet. Add the first one when you discover something non-obvious._

## `#reference` — Environment and commands

_No references yet._

## `#gotcha` — Things that tripped us up

_No gotchas captured yet. Add the first one when you hit a repeatable surprise._
```

**`context/_index/conventions.md`:**
```markdown
---
tags:
  - moc
---
# Conventions — Map of Content

Deliberate code style choices that all code in {{Project Name}} must follow. These are not safety rules (those live in the constitution) and not things learned from incidents (those live in learnings). These are team decisions about how code should look and be structured.

## Code style

_No conventions yet. Add the first one when a team decision is made._
```

**`context/_index/rules.md`:**
```markdown
---
tags:
  - moc
---
# Rules — Map of Content

{{Project Name}}-specific safety and workflow rules.

**Nothing here yet.** Rules are added when a project-specific safety or workflow constraint is discovered.

## `severity: critical`

_(none yet)_

## `severity: important`

_(none yet)_

## `severity: advisory`

_(none yet)_
```
