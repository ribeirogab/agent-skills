---
name: skill-improver
description: Audits an existing Claude Code skill against Anthropic's canonical authoring rules (frontmatter, directory layout, SKILL.md body style, progressive disclosure, description quality, degrees of freedom) and applies improvements autonomously — only findings classified as High regression risk are deferred to the final report. The target skill's stated purpose is preserved verbatim. Use this skill when the user asks to improve, audit, refactor, polish, optimize, review, fix, or check an existing skill at a known path (anywhere under `.claude/skills/` or `skills/`), with phrasings like "polish the pdf skill", "audit the harness skill", "refactor SKILL.md", "fix this skill", or "is this skill following best practices". Do NOT use to create a skill from scratch (that is `skill-creator`), to evaluate runtime output quality on real test prompts (that is `skill-creator`'s eval workflow), or to improve non-skill artifacts like READMEs, MCP tool descriptions, or general project docs.
---

# Skill Improver

Audit a target skill against canonical authoring rules and apply improvements that preserve the skill's stated purpose.

## When to invoke

You are invoked when a user wants to improve, audit, refactor, optimize, or review an existing Claude Code skill at a known path. Common phrasings: "improve this skill", "audit the skill at <path>", "refactor SKILL.md", "is this skill following best practices?", "fix issues in <skill>".

If the user wants to **create** a skill from scratch, redirect to `skill-creator`. If the user wants to **evaluate** a skill's runtime quality on real test prompts (does it produce good outputs?), redirect to `skill-creator`'s eval workflow — that requires running the skill against real prompts in subagents and is a different workflow.

## Core principle: preserve purpose, never regress

The target skill's `description` field is the source of truth for what the skill is supposed to do. Treat it as the skill's constitution. Every proposed change is checked against three preservation rules:

1. **Purpose preservation.** The change must not alter what the skill is supposed to do. Rewriting the description's *meaning* is out of scope — that is a redesign, not an improvement. Wording polish is allowed; semantic shifts are not.
2. **Trigger preservation.** The change must not reduce the description's coverage of trigger phrases, file types, contexts, or negative cases. If a sibling skill could be confused, the negative trigger stays.
3. **Output preservation.** The change must not remove instructions, examples, or scripts the skill relies on for output quality. Removing redundant prose is fine; removing load-bearing guidance is not.

A proposal that fails any of the three is not applied automatically. It is surfaced as a flagged proposal with the regression risk explained, so the user can decide.

The phrase "do no harm" is more important here than "be thorough". When safety is unclear, default to classifying the change as `High` and skipping it rather than applying it.

## Workflow

The user invoked this skill so the work would get done. Run the whole workflow autonomously without pausing for input, then deliver one consolidated report at the end. Do not ask the user "should I apply this?" mid-run — use the regression-risk classification (step 6) to decide what to apply and what to skip.

Copy this checklist into the conversation and tick items as work progresses:

```
- [ ] 1. Locate the target skill (resolve any symlinks)
- [ ] 2. Read SKILL.md and inventory the directory tree
- [ ] 3. State the preserved purpose (quote the description verbatim — informational, not a question)
- [ ] 4. Audit against the canonical rules (load references/audit-checklist.md)
- [ ] 5. Categorize findings: critical / structural / stylistic / opportunity
- [ ] 6. Decide per-finding what to apply, using regression-risk grading
- [ ] 7. Apply autonomously (no confirmation prompts)
- [ ] 8. Re-audit to verify no new violations
- [ ] 9. Deliver one final report with diff summary, applied changes, and skipped findings
```

### Step 1: Locate the target skill

Ask the user for the skill's path if not already provided. Common locations:

```
<repo>/.claude/skills/<name>/
<repo>/skills/<name>/
~/.claude/skills/<name>/
```

If the path is a symlink, resolve it with `readlink` or `readlink -f` and operate on the canonical source. Editing through a symlink works for files, but the canonical source may be shared (e.g., a vendored skill consumed by multiple repos) — improvements to a symlinked source affect every consumer of that symlink, so confirm the source's scope before applying.

### Step 2: Read and inventory

Run, in parallel:

```bash
cat <skill-path>/SKILL.md
ls -laR <skill-path>/
wc -l <skill-path>/SKILL.md
```

Record:
- Frontmatter values: `name`, `description`, optional fields (`license`, `compatibility`, `allowed-tools`, `metadata`).
- Body line count of `SKILL.md`.
- Top-level contents: which canonical dirs exist (`scripts/`, `references/`, `assets/`), which non-canonical dirs exist (e.g., `agents/`, `eval-viewer/`, `scaffold/`), which forbidden files exist (e.g., `README.md` directly inside the skill folder).
- Symlinks, if any.
- Reference depth (any file under `references/<sub>/<file>.md` is a violation).

### Step 3: State the preserved purpose

Quote the existing `description` verbatim and announce that it will be preserved:

> "Preserved purpose (will not be altered): `<description value>`."

This is informational — do not ask the user to confirm. The "preserve purpose" rule is enforced by the agent (any proposed change that would alter the description's meaning is automatically rejected at step 6, not surfaced as a question). If the audit later finds that the description itself violates a hard rule (e.g., reserved word, exceeds 1024 chars, contains forbidden characters), that is a separate Critical finding handled in step 7 — still no mid-run question.

### Step 4: Audit

Read [references/audit-checklist.md](references/audit-checklist.md) and apply each section to the target. Each finding must record:

- **Section + item** from the checklist.
- **Severity** (Critical / Structural / Stylistic / Opportunity).
- **Location**: file path + line number when applicable.
- **Quote** of the offending content.
- **Rule** the finding violates (one-line summary; canonical source is the checklist).

If the audit returns no findings at any severity, report that and stop — do not invent improvements.

### Step 5: Categorize findings

- **Critical** — the skill will silently fail to load. Frontmatter violations, wrong filename casing, name reserved-word collision.
- **Structural** — layout violations. Nested references, `README.md` inside the skill folder, kebab-case violations on the folder name, non-canonical dirs not referenced from `SKILL.md`.
- **Stylistic** — body style and prose. Length over 500 lines, first/second-person voice, vague description, missing negative triggers, inconsistent terminology, absolute or backslash paths, unqualified MCP tool names, time-sensitive prose embedded in main flow.
- **Opportunity** — improvements that aren't strictly violations but would help. Better progressive disclosure, more appropriate degrees of freedom for a fragile section, missing validate-fix loop on a quality-critical step, missing checklist on a multi-step workflow, scripts that punt errors instead of solving.

Surface counts up front so the user can prioritize: "Found 0 critical, 2 structural, 5 stylistic, 3 opportunities."

### Step 6: Decide per-finding using regression-risk grading

For each finding, draft the concrete change internally and classify its regression risk:

- `None` — purely formatting (whitespace, header level, link format). Safe.
- `Low` — rewording that preserves all triggers, meaning, and load-bearing content. Safe.
- `Medium` — narrows or expands the description's triggering coverage; or rewrites a non-load-bearing prose section that some agents might rely on stylistically. Apply if it expands coverage or strictly improves clarity; skip if it narrows coverage.
- `High` — touches load-bearing instructions, removes or rewrites scripts, deletes files (any files), changes the description's *meaning* rather than its wording. Skip and defer to the user.

Never present "Option A or Option B" choices to the user — pick the single best change. When two valid options are equally defensible, classify the finding as `High` (judgment call) and skip.

The "preserve purpose" rule is automatic, not a question: any proposed change that alters the description's meaning is reclassified to `High` and skipped, no exceptions.

### Step 7: Apply autonomously

Apply all `None` / `Low` / `Medium` proposals without asking. Skip `High` proposals and remember to surface them in the final report.

When applying:
- Use the `Edit` tool for in-place edits to existing files.
- Create files for new references; never inline content that should live in `references/`.
- Preserve file modes on scripts (`chmod +x` if the script was executable).
- For destructive operations — *deleting* a file or directory — surface as a `High` finding even if the file is forbidden (e.g., `README.md` inside the skill folder). Destructive ops are the one exception to autonomy: report and let the user delete.

Do not pause mid-application to ask. Apply the full batch, then go to step 8.

### Step 8: Re-audit

Run the audit again on the modified skill. Verify:
- No critical or structural findings remain (other than any explicitly skipped High findings).
- No new findings were introduced by the changes.
- Body line count after changes is within budget.

### Step 9: Final report

Deliver one consolidated report. This is the only output the user is required to read:

```
Skill improved: <skill-name>

Findings (before → after):
- Critical:    <n> → <n>
- Structural:  <n> → <n>
- Stylistic:   <n> → <n>
- Opportunity: <n> → <n>

Applied (n):
- <ID> [<risk>] <one-line summary> — <file:line>
- ...

Skipped — High risk, deferred for manual review (n):
- <ID> [High] <one-line summary> — <file:line> — <why High>
- ...

Body line count: <before> → <after>
Files changed: <list>
Files added:   <list>

Preserved description: "<verbatim>"
```

If `Skipped` is non-empty, the user can review and apply manually. Do not loop back to ask.

## Anti-patterns to avoid

- **Never pause mid-run to ask the user.** They invoked the skill so the work would get done. Use regression-risk grading to decide what to apply versus what to skip; surface skipped items in the final report, not as questions.
- **Never present multiple-choice options.** No "Option A or Option B?" to the user. Pick the better option yourself. If undecidable, classify as `High` and skip.
- **Do not change the description's meaning.** Wording polish is allowed; semantic rewrite is not. Any change that alters meaning is auto-reclassified to `High` and skipped.
- **Do not silently trim load-bearing prose.** A long body is allowed if it is doing work. Length alone is an *opportunity* finding, never `Critical`.
- **Do not delete files autonomously.** Destructive ops are the one exception to autonomy — surface as `High` even when the file is forbidden (e.g., a `README.md` inside the skill folder). Let the user delete.
- **Do not delete non-canonical directories.** `agents/`, `eval-viewer/`, `scaffold/`, etc. may be load-bearing for skills that legitimately extend the canonical layout. Flag them in the report as `non-canonical, referenced from SKILL.md → preserved` or `non-canonical, not referenced → High, deferred`.
- **Do not invent findings.** If the skill is clean, say so. The bar for an opportunity finding is "this would meaningfully help" — not "I could write a sentence about it".
- **Do not propose changes that would themselves violate the rules.** A proposed improvement that adds nested references, backslash paths, or breaks the description's third-person voice is itself a regression — discard and reformulate.
