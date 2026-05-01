# Validation — Phase 5 Checklist

Run this checklist after **any** scaffold or fix run, and at the end of an audit even when nothing was missing. Confirms the harness is structurally sound. Each check is a quick command with a clear pass/fail.

Report results as a table. Any `FAIL` triggers an automatic fix attempt using the recipe under each check, then re-runs the validator. The orchestrator does not prompt the user before fixing — it loops until the table is clean or it determines a check cannot be auto-repaired.

## Contents

- [Output format](#output-format)
- [Checks](#checks) — 15 numbered checks (CLAUDE.md symlink, placeholder sweeps, AGENTS.md headers, frontmatter, Obsidian JSON, .gitignore, spec folder naming, copied skills/commands, executable scripts, MOC placeholders, spec template Acceptance Criteria, AGENTS.md size cap, spec-file slug naming)
- [When everything passes](#when-everything-passes)
- [When something fails](#when-something-fails)

## Output format

```
## Phase 5 — Validation

| # | Check | Status |
|---|-------|--------|
| 1 | CLAUDE.md symlink resolves to AGENTS.md | PASS |
| 2 | constitution.md has no surviving placeholders | FAIL — line 14: "{{Project Name}}" |
| ... | ... | ... |

### Result: 14/15 PASS — 1 FAIL needs attention
```

## Checks

### 1. `CLAUDE.md` symlink resolves to `AGENTS.md`

```bash
[ "$(readlink CLAUDE.md)" = "AGENTS.md" ] && echo PASS || echo FAIL
```

FAIL means `CLAUDE.md` is missing, is a regular file, or points elsewhere. Fix: remove and recreate with `ln -s AGENTS.md CLAUDE.md`.

### 2. `context/constitution.md` has no surviving `{{placeholders}}`

```bash
grep -n '{{' context/constitution.md && echo FAIL || echo PASS
```

FAIL means the scaffold left unsubstituted placeholders. Fix: ask the user for the missing info and patch the lines reported.

### 3. `AGENTS.md` has no surviving `{{placeholders}}`

```bash
grep -n '{{' AGENTS.md && echo FAIL || echo PASS
```

Same fix as #2.

### 4. `AGENTS.md` contains all required section headers

```bash
required=(
  "## Before starting any work"
  "## Work ethic — never the lazy path"
  "## When stuck or in doubt — read the vault first"
  "## After completing any task"
  "## After completing a spec"
  "## Commands (most used)"
  "## Knowledge locations"
  "## Skills and slash commands"
)
missing=()
for h in "${required[@]}"; do
  grep -qF "$h" AGENTS.md || missing+=("$h")
done
[ ${#missing[@]} -eq 0 ] && echo PASS || printf 'FAIL — missing: %s\n' "${missing[@]}"
```

Fix: read `references/agents-md-template.md` and insert the missing sections in the canonical order.

### 5. Frontmatter valid in MOCs and templates

For each of `context/_index/{home,specs,learnings,conventions,rules}.md`, `context/templates/{learning,rule,convention}.md`, and `context/specs/_template/{spec,plan,tasks}.md`, confirm the file begins with `---` and contains a closing `---` with at least one expected field (`tags:`, `feature:`, or `status:`) between them.

```bash
for f in context/_index/*.md context/templates/*.md context/specs/_template/*.md; do
  head -1 "$f" | grep -q '^---$' || { echo "FAIL: $f missing opening fence"; continue; }
  awk '/^---$/{n++} n==2{exit} {print}' "$f" | grep -qE '^(tags|feature|status):' \
    || echo "FAIL: $f missing expected frontmatter field"
done
```

Fix: re-create the file from `references/vault-files.md`.

### 6. Obsidian JSON files parse

```bash
for f in context/.obsidian/app.json context/.obsidian/appearance.json context/.obsidian/core-plugins.json; do
  python3 -c "import json,sys; json.load(open('$f'))" 2>/dev/null && echo "PASS: $f" || echo "FAIL: $f"
done
```

Fix: re-write from `references/vault-files.md`.

### 7. `.gitignore` ignores the entire Obsidian config directory

```bash
grep -qE '^context/\.obsidian/?$' .gitignore 2>/dev/null && echo PASS || echo FAIL
```

FAIL means `.gitignore` is missing the `context/.obsidian/` line (or still has the older fine-grained patterns). Fix: replace any old per-file Obsidian patterns with the single line `context/.obsidian/`.

### 8. `context/specs/` contains no folder without date prefix

```bash
ls context/specs/ 2>/dev/null | grep -vE '^_template$|^[0-9]{4}-[0-9]{2}-[0-9]{2}-' \
  && echo FAIL || echo PASS
```

FAIL lists the offending folder names. Fix: rename per the migration prompt in `references/audit-checklist.md`.

### 9. Skills installed at the canonical location — each has its `SKILL.md`

Skills are canonically under `.agents/skills/<name>/`. Per-agent symlinks (`.claude/skills/<name>`, etc.) are bonus exposure, not the source of truth.

```bash
for s in harness-recall harness-brainstorming harness-writing-plans; do
  [ -f ".agents/skills/$s/SKILL.md" ] && echo "PASS: $s" || echo "FAIL: $s"
done
```

Fix: re-run the skills copy block from `SKILL.md` (Scaffolding section).

### 10. Brainstorming scripts are executable

```bash
fail=0
for f in .agents/skills/harness-brainstorming/scripts/*.sh; do
  [ -x "$f" ] || { echo "FAIL: $f not executable"; fail=1; }
done
[ $fail -eq 0 ] && echo PASS
```

Fix: `chmod +x .agents/skills/harness-brainstorming/scripts/*.sh`.

### 11. Commands copied

Slash commands are Claude Code-specific and only install if `.claude/` is present in the repo. If `.claude/` is absent, this check is `N/A`.

```bash
if [ ! -d .claude ]; then
  echo "N/A — no .claude/ directory; commands skipped by design"
else
  for c in harness-open-pr harness-learn harness-spec harness-review-spec harness-sweep; do
    [ -f ".claude/commands/$c.md" ] && echo "PASS: $c" || echo "FAIL: $c"
  done
fi
```

Fix: re-run the commands copy block from `SKILL.md` (Scaffolding section).

### 12. MOCs have no surviving `{{Project Name}}` placeholders

The five MOCs in `context/_index/` belong to Group B in `references/vault-files.md` — they must have `{{Project Name}}` substituted with the actual project name. Surviving placeholders here mean the scaffold step skipped a file.

```bash
grep -nH '{{' context/_index/*.md && echo FAIL || echo PASS
```

Fix: re-substitute `{{Project Name}}` (and any other surviving `{{}}` placeholder) in the offending file with the project name from Prerequisites. Note: `templates/*.md` and `specs/_template/*.md` are Group A (templates) and **legitimately retain** their `{{}}` placeholders — do not run this check against them.

### 13. Spec template carries an `## Acceptance Criteria` section

Every spec produced from `_template/spec.md` must inherit a structured Acceptance Criteria section so the behaviour harness has something concrete to verify. If the heading was deleted from the template, every future spec loses it silently — `/harness-review-spec` would have nothing to enforce.

```bash
grep -q '^## Acceptance Criteria$' context/specs/_template/spec.md \
  && echo PASS \
  || echo "FAIL: missing '## Acceptance Criteria' heading in _template/spec.md"
```

Fix: re-create `_template/spec.md` from the spec block in `references/vault-files.md` — the canonical template includes the section with its rules and examples.

### 14. `AGENTS.md` is at most 80 lines

The file is loaded into every agent session as the entry-point contract. Letting it grow past 80 lines crowds context and reintroduces the "encyclopedia" anti-pattern that the canonical authoring rules explicitly reject (see `context/learnings/agents-md-as-map-not-encyclopedia.md`). Target range is 70–80 lines.

```bash
lines=$(wc -l < AGENTS.md | tr -d ' ')
[ "$lines" -le 80 ] && echo "PASS ($lines lines)" || echo "FAIL ($lines lines, cap 80)"
```

FAIL means `AGENTS.md` exceeded the cap. Fix: trim the body per the guidance in `references/agents-md-template.md` (`## Size constraint`) — tighten the project-description paragraph, cap `## Commands (most used)` at 5–6 entries, replace any longer narrative with a one-line pointer into `context/`. Never drop a required section header (check #4 enforces those).

### 15. No spec folder contains generic `spec.md` / `plan.md` / `tasks.md`

Inside any date-prefixed spec folder, the three files must use the `<type>-<slug>.md` convention (slug = the kebab slug from the folder name after the `YYYY-MM-DD-` prefix). Generic names defeat the convention's purpose (distinguishable filenames in editor tabs, file pickers, search results).

```bash
fail=0
find context/specs -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-*' 2>/dev/null | while read -r spec_dir; do
  for generic in spec.md plan.md tasks.md; do
    if [ -f "$spec_dir/$generic" ]; then
      echo "FAIL: $spec_dir/$generic"
      fail=1
    fi
  done
done
[ $fail -eq 0 ] && echo PASS
```

FAIL lists the offending paths. Fix: run the spec-file rename migration recipe in `SKILL.md` (Phase 4 → "Spec file rename migration") for each affected folder. The recipe `git mv`s the files, updates internal `[[spec]]`/`[[plan]]`/`[[tasks]]` wikilinks, and updates the `context/_index/specs.md` MOC entry. Renames are destructive — confirm with the user once per folder before running.

## When everything passes

Report:

```
## Phase 5 — Validation: 15/15 PASS

Harness is structurally sound.
```

## When something fails

Report each FAIL with the specific reason (file path, missing line, parse error), then apply the fixes listed under each check above and re-run validation. Loop until clean. Only stop the loop when a check has no auto-repair recipe or the same fix has failed twice — in that case, surface the residual failure to the user with the exact reason.
