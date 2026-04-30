# Audit Checklist

Full inventory of what the harness audit checks. The orchestrator (`SKILL.md`) loads this file at the start of an audit run.

## Status meanings

For each item, check existence and content correctness. Report status as:
- `OK` — exists and looks correct
- `MISSING` — doesn't exist at all
- `DRIFT` — exists but content has diverged from expected structure (e.g., missing sections in constitution, malformed frontmatter in templates, missing required headers in `AGENTS.md`)

## Files and directories to check

```
context/
  context/.obsidian/app.json
  context/.obsidian/appearance.json
  context/.obsidian/core-plugins.json
  context/_index/home.md
  context/_index/specs.md
  context/_index/learnings.md
  context/_index/conventions.md
  context/_index/rules.md
  context/constitution.md
  context/specs/_template/spec.md
  context/specs/_template/plan.md
  context/specs/_template/tasks.md
  context/templates/learning.md
  context/templates/rule.md
  context/templates/convention.md
  context/learnings/           (directory exists)
  context/conventions/         (directory exists)
  context/rules/               (directory exists)

AGENTS.md                      (repo root)
CLAUDE.md                      (symlink → AGENTS.md)

.claude/skills/harness-recall/SKILL.md
.claude/skills/harness-brainstorming/  (full directory)
.claude/skills/harness-writing-plans/  (full directory)
.claude/commands/harness-open-pr.md
.claude/commands/harness-learn.md
.claude/commands/harness-spec.md
.claude/commands/harness-review-spec.md
.claude/commands/harness-sweep.md

.gitignore                     (contains obsidian workspace exclusions)
```

## Additional checks

### CLAUDE.md is a symlink

`CLAUDE.md` must be a symlink pointing to `AGENTS.md` — not a copy, not a separate file. Verify with `readlink CLAUDE.md` returning `AGENTS.md`. If it is a regular file or points elsewhere, status is `DRIFT`.

### Spec folder naming follows `YYYY-MM-DD-<kebab-slug>/`

Actively scan `context/specs/` (excluding `_template/`) — any folder whose name does **not** start with `YYYY-MM-DD-` is `DRIFT`. Report each non-conforming folder and ask the user, per folder:

> "`<old-name>/` is not date-prefixed. Date prefixes prevent the naming conflicts that numeric prefixes (`01-`, `02-`) cause when multiple specs land in parallel. Rename to `<YYYY-MM-DD>-<slug>/`?"

Pull the date from the folder's `spec.md` frontmatter `created:` field when present; if absent, ask the user. **Never rename without confirmation.**

### .gitignore contains obsidian workspace exclusions

The repo's `.gitignore` must contain these four lines (or equivalents):

```
context/.obsidian/workspace.json
context/.obsidian/workspace-mobile.json
context/.obsidian/cache
context/.obsidian/plugins/*/data.json
```

If the file is missing or any line is absent, status is `DRIFT` (or `MISSING` for the file itself).

## AGENTS.md drift detection (required headers)

`AGENTS.md` must contain all of these section headers — missing any one is `DRIFT`:

- `## Before starting any work`
- `## Work ethic — never the lazy path`
- `## When stuck or in doubt — read the vault first`
- `## After completing any task`
- `## After completing a spec`
- `## Commands (most used)`
- `## Knowledge locations`
- `## Claude Code skills and commands`

When reporting drift, name the missing section(s) explicitly so the fix step knows what to insert.

## Constitution drift detection (required sections)

`context/constitution.md` must contain all of these top-level sections:

- `## Why {{Project Name}} exists` (the placeholder may be substituted with the actual project name — that is `OK`, not `DRIFT`)
- `## Scope guardrails`
- `## Architecture principles`
- `## Tooling and workflow principles`
- `## Spec-Driven workflow`
- `## Knowledge layering`
- `## What this constitution is not`

If any `{{placeholder}}` strings remain unsubstituted in the file, status is `DRIFT` — surfaces in validation as well.

## Frontmatter sanity

Each MOC and template must begin with valid YAML frontmatter (between `---` fences) with the expected `tags:` or `feature:` field. Missing or malformed frontmatter is `DRIFT`.

## Report format

```
## Harness Audit

| Status | Item |
|--------|------|
| OK     | context/constitution.md |
| MISSING| context/_index/conventions.md |
| DRIFT  | context/specs/old-feature/ (not date-prefixed) |
| DRIFT  | AGENTS.md (missing section: "Work ethic — never the lazy path") |
| ...    | ... |

### Summary
- X/Y items OK
- N missing, M drifted

Want me to fix the issues?
```

If everything passes, the orchestrator should still run Phase 5 validation (see `references/validation.md`) before reporting "Harness is healthy."
