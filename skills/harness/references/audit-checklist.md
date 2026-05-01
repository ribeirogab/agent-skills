# Audit Checklist

Full inventory of what the harness audit checks. The orchestrator (`SKILL.md`) loads this file at the start of an audit run.

## Contents

- [Status meanings](#status-meanings)
- [Files and directories to check](#files-and-directories-to-check)
- [Additional checks](#additional-checks)
- [AGENTS.md drift detection (required headers)](#agentsmd-drift-detection-required-headers)
- [Constitution drift detection (required sections)](#constitution-drift-detection-required-sections)
- [Frontmatter sanity](#frontmatter-sanity)
- [Report format](#report-format)

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
CLAUDE.md                      (symlink → AGENTS.md, Claude Code back-compat)

.agents/skills/harness-recall/SKILL.md            (canonical, agent-agnostic)
.agents/skills/harness-brainstorming/             (full directory)
.agents/skills/harness-writing-plans/             (full directory)

.claude/commands/harness-open-pr.md               (slash commands — Claude Code only)
.claude/commands/harness-learn.md
.claude/commands/harness-spec.md
.claude/commands/harness-review-spec.md
.claude/commands/harness-sweep.md

.gitignore                     (contains obsidian workspace exclusions)
```

### Per-agent skill symlinks (optional, not required)

For every agent-specific discovery directory present in the repo (`.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.aider/`, `.augment/`, etc.), each scaffold skill above should also be symlinked into that agent's `skills/` subdirectory so the agent can discover it. Example: when `.claude/` exists, `.claude/skills/harness-recall` is a symlink to `../../.agents/skills/harness-recall`.

A missing per-agent symlink is **not `DRIFT`** — only the canonical files under `.agents/skills/` are required. If a per-agent dir exists but lacks the expected symlinks, the harness re-creates them on the next run (no prompt needed; symlinks are non-destructive). If a per-agent dir does not exist at all, no symlinks are created (the absence signals the user does not run that agent in this repo).

## Additional checks

### CLAUDE.md is a symlink (Claude Code back-compat)

`AGENTS.md` is the universal agent entry point. Claude Code historically reads `CLAUDE.md` instead, so the harness keeps a `CLAUDE.md → AGENTS.md` symlink at the repo root as a back-compat concession. Other agents ignore the file.

`CLAUDE.md` must be a symlink pointing to `AGENTS.md` — not a copy, not a separate file. Verify with `readlink CLAUDE.md` returning `AGENTS.md`. If it is a regular file or points elsewhere, status is `DRIFT`.

### Spec folder naming follows `YYYY-MM-DD-<kebab-slug>/`

Actively scan `context/specs/` (excluding `_template/`) — any folder whose name does **not** start with `YYYY-MM-DD-` is `DRIFT`. Report each non-conforming folder and ask the user, per folder:

> "`<old-name>/` is not date-prefixed. Date prefixes prevent the naming conflicts that numeric prefixes (`01-`, `02-`) cause when multiple specs land in parallel. Rename to `<YYYY-MM-DD>-<slug>/`?"

Pull the date from the folder's `spec-<slug>.md` frontmatter `created:` field when present; if absent, ask the user. **Never rename without confirmation.**

### Spec file naming follows `<spec|plan|tasks>-<slug>.md`

Inside any date-prefixed spec folder, the three files must use the slug-included naming convention: `spec-<slug>.md`, `plan-<slug>.md`, `tasks-<slug>.md`, where `<slug>` is the same kebab slug used in the folder name (the part after the `YYYY-MM-DD-` prefix). Generic `spec.md` / `plan.md` / `tasks.md` files inside a real spec folder are `DRIFT` — they make every spec's tab indistinguishable in editors and search.

The `_template/` folder is the only exception — its files stay named `spec.md` / `plan.md` / `tasks.md` because they are blueprints, not real specs.

**Detection** (run during the audit pass, alongside the date-prefix check):

```bash
find context/specs -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-*' 2>/dev/null | while read -r spec_dir; do
  slug=$(basename "$spec_dir" | sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//')
  for generic in spec.md plan.md tasks.md; do
    if [ -f "$spec_dir/$generic" ]; then
      echo "DRIFT: $spec_dir/$generic → should be ${generic%.md}-$slug.md"
    fi
  done
done
```

Report each drift with the source path and the target name. Fix logic lives in `SKILL.md` (Phase 4 → "Spec file rename migration") and is rename-then-rewrite-wikilinks. Renaming a tracked file is a destructive operation per the SKILL.md "Mode of Operation" — confirm with the user once per spec folder before applying.

### .gitignore ignores the entire Obsidian config directory

The repo's `.gitignore` must contain a pattern that ignores `context/.obsidian/` in full:

```
context/.obsidian/
```

Rationale: Obsidian rewrites every file under `context/.obsidian/` on each vault open, which creates constant `git status` noise. The whole directory is machine-local. The harness still scaffolds the three config JSONs locally so first-time Obsidian opens get the right wikilink defaults — they just are never tracked.

If `.gitignore` is missing, or contains the older fine-grained pattern set (`workspace.json`, `cache`, `plugins/*/data.json`) instead of the directory-level ignore, status is `DRIFT`. Fix: replace the old patterns with the single `context/.obsidian/` line.

## AGENTS.md drift detection (required headers + size cap)

`AGENTS.md` must contain all of these section headers — missing any one is `DRIFT`:

- `## Before starting any work`
- `## Work ethic — never the lazy path`
- `## When stuck or in doubt — read the vault first`
- `## After completing any task`
- `## After completing a spec`
- `## Commands (most used)`
- `## Knowledge locations`
- `## Skills and slash commands`

When reporting drift, name the missing section(s) explicitly so the fix step knows what to insert.

`AGENTS.md` must also be **≤ 80 lines** (target range 70–80). The file is loaded into every agent session as the entry-point contract; growing past this cap crowds context and reintroduces the "encyclopedia" anti-pattern that the canonical authoring rules reject. If `AGENTS.md` exceeds 80 lines, status is `DRIFT` and the fix is to trim the body per the guidance in `references/agents-md-template.md` (`## Size constraint`) — never by dropping a required section header.

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
```

After rendering this report, the orchestrator proceeds directly to Phase 3 to fix any `MISSING` or `DRIFT` items — no mid-run confirmation. Spec-folder renames (a destructive op) are the only exception and require an explicit prompt per the migration rules above. If everything passes, the orchestrator skips Phase 3 and runs Phase 5 validation (see `references/validation.md`) before reporting "Harness is healthy."
