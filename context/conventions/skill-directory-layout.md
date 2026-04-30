---
tags:
  - convention
  - skill-authoring
applies-to:
  - skills/<name>/
  - .claude/skills/<name>/
created: 2026-04-30
---
# Skill directory layout

Every skill in this repo (under `skills/<name>/` and the dogfooded copies in `.claude/skills/<name>/`) must follow the canonical layout below. The structure is taken directly from Anthropic's platform docs and is what `harness-recall`, the skill-creator, and Claude's own discovery expect to find.

## Why

The layout is load-bearing for **progressive disclosure** (`[[../learnings/skill-progressive-disclosure]]`). The frontmatter is loaded into the system prompt, the `SKILL.md` body is loaded when the skill triggers, and the `references/`, `scripts/`, `assets/` files are loaded only when the body explicitly tells Claude to read them. Without the canonical layout this filesystem-driven loading model breaks down — Claude either over-loads context or fails to find what it needs.

## How to Apply

### Required

```
skills/<name>/                # kebab-case, matches frontmatter `name`
└── SKILL.md                  # required — frontmatter + instructions
```

### Optional, in canonical positions

```
skills/<name>/
├── SKILL.md
├── scripts/                  # executable code (Python, Bash, Node) — run, not read
│   └── <verb>_<noun>.py
├── references/               # markdown loaded on demand — read, not run
│   └── <topic>.md
└── assets/                   # templates, schemas, fonts, images, static files
    └── <name>.<ext>
```

### Rules

- **Folder name = `name` field** in frontmatter. Both kebab-case.
- **No `README.md` inside the skill folder.** All docs go in `SKILL.md` or `references/`. (Repo-level READMEs outside any skill folder are fine.)
- **Files are exactly one level deep from `SKILL.md`.** Do not nest: `references/a.md` is fine, `references/topic/a.md` is not. Anthropic's docs warn that Claude partial-reads deeply-nested files (using `head -100`) and may miss content past the preview.
- **`scripts/` is for things Claude runs.** Make execution intent explicit in `SKILL.md`: write "Run `python scripts/foo.py`" or "See `scripts/foo.py` for the algorithm" — never let Claude guess.
- **`references/` is for things Claude reads on demand.** Each file should be a cohesive topic. Files >100 lines should start with a table-of-contents block so Claude can navigate even when it partial-reads.
- **`assets/` is for static output templates** Claude copies/embeds (HTML templates, JSON schemas, fonts, images).
- Use **forward slashes** in any path written into a skill, even on Windows (`scripts/helper.py`, never `scripts\helper.py`).

### Example skills already following this in the repo

- `.claude/skills/skill-creator/` — `SKILL.md` + `agents/` + `assets/` + `eval-viewer/` + `references/` + `scripts/`. Note: `agents/` and `eval-viewer/` are non-canonical extensions; they work because the `SKILL.md` references them explicitly.
- `.claude/skills/opensource-guide-coach/` — minimal: `SKILL.md` + `references/`.
- `skills/harness/` — `SKILL.md` + `references/` + `scaffold/`. The `scaffold/` directory is a project-specific extension for the harness's "ship assets to a target repo" behavior — it is not part of Anthropic's canonical layout, but is permitted because it is referenced from `SKILL.md`.

### Anti-patterns

- Nested reference folders (`references/db/v1/schema.md`).
- Embedding a `README.md` inside the skill folder.
- Library code in `scripts/` (use small, single-purpose CLIs; reference real libraries with `pip install` etc.).
- Backslash paths.

## Source

Anthropic platform docs — *Skill authoring best practices*, "Skill structure" and "Runtime environment" sections; *The Complete Guide to Building Skills for Claude* (PDF), Chapter 2 "Technical requirements"; mgechev/skills-best-practices README ("Mandatory structure", "Keep files exactly one level deep").
