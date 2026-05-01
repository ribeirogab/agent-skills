---
name: harness
description: "Scaffold or audit the agent harness (context/ vault + AGENTS.md + spec templates + bundled skills) in any repo. Agent-agnostic — works with any tool that supports the open agent skills standard (Claude Code, Codex, Cursor, OpenCode, etc.). Idempotent — safe to run repeatedly. Use when the user wants to set up, verify, or fix agent infrastructure in a project."
---

# Harness — Idempotent Agent Infrastructure

Set up or audit the agent harness in the current repo. Safe to run multiple times — it checks what exists, reports what's missing or wrong, asks before making changes, then validates the result.

**Announce at start:** "Auditing agent harness..."

## Mode of Operation

This skill is **audit-first, then autonomous**. Audit, report, and proceed to scaffold or repair without further prompting. The one exception is destructive operations (renaming or deleting existing files) — surface those before acting.

1. **Audit** — scan the repo and build a checklist of what exists vs what's expected.
2. **Report** — show the checklist to the user with status per item.
3. **Fix** — if issues are found, scaffold or repair them directly. Confirm only before destructive ops (e.g., renaming a spec folder).
4. **Validate** — after any creation or fix (and at the end of an audit-only run), run Phase 5 validation.

If the audit finds nothing wrong **and** validation passes, just say "Harness is healthy." and stop.

## Phase 1 — Audit

Read `references/audit-checklist.md` for the full inventory of files and directories to check, the meaning of each status (`OK` / `MISSING` / `DRIFT`), drift criteria for `AGENTS.md` and `context/constitution.md`, the report format, and special handling for date-prefixed spec folders.

Apply each check, then assemble the report described in that reference.

## Phase 2 — Report

Render the audit table per the format in `references/audit-checklist.md`. Summarize:

```
### Summary
- X/Y items OK
- N missing, M drifted
```

If anything is missing or drifted, proceed to Phase 3. If everything was `OK`, skip to Phase 5 (validation).

## Phase 3 — Prerequisites (first-time or fix)

Before creating files, gather project context:

1. Read `package.json`, `README.md`, or any existing docs to understand what the project is.
2. Detect the package manager (`pnpm-workspace.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, else npm).
3. Detect the tech stack (frameworks, languages, deploy targets) from dependencies and config files.

This information is required to fill `AGENTS.md` and `context/constitution.md` without surviving placeholders.

## Phase 4 — Scaffold (only the items that need it)

Create or repair only the items the audit flagged. Never touch files that are already `OK`.

### Vault files

For `.obsidian/*.json`, atomic note templates (`templates/learning.md`, `rule.md`, `convention.md`), spec templates (`_template/spec.md`, `plan.md`, `tasks.md`), and the five MOCs in `_index/`, read `references/vault-files.md` and write each file from the spec there. Use the project name from Prerequisites to substitute `{{Project Name}}` in MOCs.

### Constitution

For `context/constitution.md`, read `references/constitution-template.md`. It contains the template **and** filling rules — this is the most important file in the vault and must not be left with `{{placeholders}}`. If you don't have enough info to fill a section, ask the user; never commit unsubstituted placeholders.

### AGENTS.md

For `AGENTS.md` at the repo root, read `references/agents-md-template.md`. Fill `{{Project Name}}`, the project description paragraph, and the `## Commands (most used)` section from Prerequisites. The reference lists all required section headers — none may be missing.

### CLAUDE.md symlink (Claude Code back-compat)

`AGENTS.md` is the universal agent entry point. Claude Code historically reads `CLAUDE.md` instead, so a symlink at the repo root keeps it satisfied without duplicating content. Other agents ignore the file.

If `CLAUDE.md` does not exist at the repo root:

```bash
ln -s AGENTS.md CLAUDE.md
```

### .gitignore additions

Append these lines to the repo's `.gitignore` (skip if already present):

```
# Obsidian vault config (machine-local — Obsidian rewrites these on every open)
context/.obsidian/
```

Rationale: Obsidian rewrites `app.json`, `appearance.json`, `core-plugins.json`, and the workspace files every time the vault is opened, which creates constant `git status` noise. The harness still **creates** the three config JSONs locally during scaffolding (so `useMarkdownLinks: false` / `newLinkFormat: "relative"` are set the first time Obsidian opens — wikilinks in the MOCs depend on this), but they are not tracked. Obsidian preserves existing user settings when it rewrites these files, so the defaults persist locally on subsequent opens.

### Skills and commands (copy from scaffold/)

All bundled skills and commands live in `scaffold/` alongside this `SKILL.md`.

**Skills** are agent-agnostic and install canonically under `.agents/skills/<name>/` (the open agent skills standard's location, also discoverable by `npx skills` and similar tooling). For each agent-specific discovery directory already present in the repo (`.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.aider/`, `.augment/`, etc.), the harness adds a per-skill symlink so that agent picks up the skill without duplicating files on disk:

```bash
HARNESS_DIR="<directory where this SKILL.md lives>"
SKILL_NAMES=(harness-recall harness-brainstorming harness-writing-plans)

# 1. Canonical install — single source of truth on disk
mkdir -p .agents/skills
for name in "${SKILL_NAMES[@]}"; do
  [ -e ".agents/skills/$name" ] && continue   # idempotent: don't overwrite
  cp -r "$HARNESS_DIR/scaffold/skills/$name" ".agents/skills/$name"
done

# Ensure scripts are executable (only one skill ships scripts today)
[ -d .agents/skills/harness-brainstorming/scripts ] && \
  chmod +x .agents/skills/harness-brainstorming/scripts/*.sh

# 2. Per-agent symlinks — only into discovery dirs that already exist
#    (do NOT auto-create agent dirs; their absence means the user does
#    not run that agent in this repo).
for agent_dir in .claude .codex .cursor .opencode .aider .augment; do
  [ -d "$agent_dir" ] || continue
  mkdir -p "$agent_dir/skills"
  for name in "${SKILL_NAMES[@]}"; do
    target="$agent_dir/skills/$name"
    [ -e "$target" ] && continue   # idempotent: keep whatever's there
    ln -s "../../.agents/skills/$name" "$target"
  done
done
```

**Slash commands** are a Claude Code-specific concept (no other current agent has an equivalent), so they install only into `.claude/commands/`. If `.claude/` does not exist in the repo, skip the command copy entirely — the workflows the commands encode are useful in any agent, but the user invokes them via prose prompts on those agents, not via `/foo` syntax.

```bash
if [ -d .claude ]; then
  mkdir -p .claude/commands
  for cmd in harness-open-pr harness-learn harness-spec harness-review-spec harness-sweep; do
    target=".claude/commands/$cmd.md"
    [ -e "$target" ] && continue
    cp "$HARNESS_DIR/scaffold/commands/$cmd.md" "$target"
  done
fi
```

Rules:
- Skills always go to `.agents/skills/<name>` first (canonical), then symlinked into existing agent dirs.
- Existing files are never overwritten — re-runs are no-ops on already-installed items.
- Per-agent dirs that do not already exist are not auto-created by the skill copy; only an existing dir signals that agent is in use here.

### Spec folder migration (if drift was reported)

If the audit flagged any spec folder without a `YYYY-MM-DD-` prefix, migrate per the rules in `references/audit-checklist.md` (pull date from the spec file's frontmatter `created:` field, ask user when absent, never rename without confirmation).

### Spec file rename migration (if drift was reported)

If the audit detected a spec folder containing generic `spec.md` / `plan.md` / `tasks.md` files (instead of the `<type>-<slug>.md` convention), migrate the folder. Renaming tracked files is a destructive operation — surface each detected folder, get explicit user confirmation per folder, then run the recipe below.

For each confirmed `<spec_dir>` (e.g. `context/specs/2026-04-30-opensource-readiness/`):

```bash
spec_dir="<the folder, e.g. context/specs/2026-04-30-opensource-readiness>"
slug=$(basename "$spec_dir" | sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//')

# 1. Rename each generic file to include the slug, preserving git history
for type in spec plan tasks; do
  src="$spec_dir/${type}.md"
  dst="$spec_dir/${type}-${slug}.md"
  [ -f "$src" ] && [ ! -e "$dst" ] && git mv "$src" "$dst"
done

# 2. Update internal wikilinks inside every file in the folder
#    [[spec]] / [[plan]] / [[tasks]] → [[<type>-<slug>]]
for f in "$spec_dir"/*.md; do
  sed -i.bak \
    -e "s/\\[\\[spec\\]\\]/[[spec-${slug}]]/g" \
    -e "s/\\[\\[plan\\]\\]/[[plan-${slug}]]/g" \
    -e "s/\\[\\[tasks\\]\\]/[[tasks-${slug}]]/g" \
    "$f" && rm "$f.bak"
done

# 3. Update the specs MOC entry that pointed at the old basename
folder=$(basename "$spec_dir")
sed -i.bak \
  -e "s|/${folder}/spec\\([|\\]]\\)|/${folder}/spec-${slug}\\1|g" \
  -e "s|/${folder}/plan\\([|\\]]\\)|/${folder}/plan-${slug}\\1|g" \
  -e "s|/${folder}/tasks\\([|\\]]\\)|/${folder}/tasks-${slug}\\1|g" \
  context/_index/specs.md && rm context/_index/specs.md.bak
```

After the recipe runs, also `grep -rln "\[\[spec\]\]\|\[\[plan\]\]\|\[\[tasks\]\]" context/learnings/ context/conventions/ context/rules/` to surface any external wikilinks that might have pointed at the old basenames; update those manually with the user's confirmation (those references are not always intra-spec — they could legitimately mean "the spec template").

Note for the `sed` `-e` line: `[|\\]]` is a character class matching `|` or `]` — this scopes the replacement to wikilink edges so we do not match `<folder>/spec-tweaks.md` or other longer paths that happen to start with `spec`.

## Phase 5 — Validate

After **any** creation or fix run, and at the end of an audit-only run with all `OK`, execute the validation checklist.

Read `references/validation.md` and run all 15 checks. Report results as the table specified there. If any check fails, surface the specific reason and ask "Want me to fix the failed checks?" Loop until clean or the user stops.

Validation is non-negotiable — this is what catches `{{placeholders}}` that survived scaffolding, missing AGENTS.md sections, broken symlinks, malformed JSON, and spec folders that slipped past the rename step.

## Final summary (always show at the end)

```
## Harness Audit Complete

- X/Y items OK
- N created, M fixed, K skipped (already correct)
- Validation: 15/15 PASS  (or list the FAILs)

{{only if first-time setup:}}
Next steps:
1. Review context/constitution.md — make sure it captures your non-negotiables
2. Run the project and start adding learnings to context/learnings/
3. First feature? Copy context/specs/_template/ and start a spec
```
