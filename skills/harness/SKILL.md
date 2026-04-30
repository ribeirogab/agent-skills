---
name: harness
description: "Scaffold or audit the agent harness (context/ vault + AGENTS.md + spec templates + Claude Code skills) in any repo. Idempotent — safe to run repeatedly. Use when the user wants to set up, verify, or fix agent infrastructure in a project."
user-invocable: true
argument-hint: "<optional: project name>"
---

# Harness — Idempotent Agent Infrastructure

Set up or audit the agent harness in the current repo. Safe to run multiple times — it checks what exists, reports what's missing or wrong, asks before making changes, then validates the result.

**Announce at start:** "Auditing agent harness..."

## Mode of Operation

This skill is **audit-first**. It never creates or modifies files without asking.

1. **Audit** — scan the repo and build a checklist of what exists vs what's expected.
2. **Report** — show the checklist to the user with status per item.
3. **Fix** — if issues are found, ask "Want me to fix these?" and only proceed on confirmation.
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

Want me to fix the issues?
```

If the user confirms, proceed to Phase 3. If everything was `OK`, skip to Phase 5 (validation).

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

### CLAUDE.md symlink

If `CLAUDE.md` does not exist at the repo root:

```bash
ln -s AGENTS.md CLAUDE.md
```

### .gitignore additions

Append these lines to the repo's `.gitignore` (skip any already present):

```
# Obsidian workspace (machine-local)
context/.obsidian/workspace.json
context/.obsidian/workspace-mobile.json
context/.obsidian/cache
context/.obsidian/plugins/*/data.json
```

### Skills and commands (copy from scaffold/)

All bundled skills and commands live in `scaffold/` alongside this `SKILL.md`. Copy them into the project's `.claude/`:

```bash
HARNESS_DIR="<directory where this SKILL.md lives>"

# Skills
cp -r "$HARNESS_DIR/scaffold/skills/harness-recall" .claude/skills/harness-recall
cp -r "$HARNESS_DIR/scaffold/skills/harness-brainstorming" .claude/skills/harness-brainstorming
cp -r "$HARNESS_DIR/scaffold/skills/harness-writing-plans" .claude/skills/harness-writing-plans

# Commands
cp "$HARNESS_DIR/scaffold/commands/harness-open-pr.md" .claude/commands/harness-open-pr.md
cp "$HARNESS_DIR/scaffold/commands/harness-learn.md" .claude/commands/harness-learn.md
cp "$HARNESS_DIR/scaffold/commands/harness-spec.md" .claude/commands/harness-spec.md
cp "$HARNESS_DIR/scaffold/commands/harness-review-spec.md" .claude/commands/harness-review-spec.md
cp "$HARNESS_DIR/scaffold/commands/harness-sweep.md" .claude/commands/harness-sweep.md

# Ensure scripts are executable
chmod +x .claude/skills/harness-brainstorming/scripts/*.sh
```

Rules:
- Create `.claude/skills/` and `.claude/commands/` if they don't exist.
- If a skill or command already exists in the project, **skip it** — don't overwrite.

### Spec folder migration (if drift was reported)

If the audit flagged any spec folder without a `YYYY-MM-DD-` prefix, migrate per the rules in `references/audit-checklist.md` (pull date from `spec.md` frontmatter `created:` field, ask user when absent, never rename without confirmation).

## Phase 5 — Validate

After **any** creation or fix run, and at the end of an audit-only run with all `OK`, execute the validation checklist.

Read `references/validation.md` and run all 12 checks. Report results as the table specified there. If any check fails, surface the specific reason and ask "Want me to fix the failed checks?" Loop until clean or the user stops.

Validation is non-negotiable — this is what catches `{{placeholders}}` that survived scaffolding, missing AGENTS.md sections, broken symlinks, malformed JSON, and spec folders that slipped past the rename step.

## Final summary (always show at the end)

```
## Harness Audit Complete

- X/Y items OK
- N created, M fixed, K skipped (already correct)
- Validation: 12/12 PASS  (or list the FAILs)

{{only if first-time setup:}}
Next steps:
1. Review context/constitution.md — make sure it captures your non-negotiables
2. Run the project and start adding learnings to context/learnings/
3. First feature? Copy context/specs/_template/ and start a spec
```
