# Constitution Template

The constitution (`context/constitution.md`) is the most important file in the vault. Load this reference when creating, repairing, or auditing it.

## Filling rules

This is **not a skeleton to commit as-is**. Use the project info gathered in Prerequisites (read `package.json`, `README.md`, detect tech stack and tooling) to write a real constitution. It must contain:

1. **Why {{Project Name}} exists** — the problem it solves and for whom.
2. **Scope guardrails** — what is explicitly out of scope or deferred.
3. **Architecture principles** — the load-bearing technical decisions.
4. **Tooling and workflow principles** — linter, package manager, test runner, deploy target, CI expectations.
5. **Spec-Driven workflow** — the trigger rule for when to spec vs go direct.
6. **Knowledge layering** — `context/` holds project-specific knowledge only.

**If you don't have enough info to fill a section, ask the user specific questions.** Do **not** leave `{{placeholders}}` in the final file — either fill it or ask. Surviving placeholders are caught by Phase 6 validation and fail the run.

## Template

```markdown
---
status: canonical
created: {{YYYY-MM-DD}}
---
# {{Project Name}} — Constitution

This document declares the non-negotiable principles of the {{Project Name}} project. Everything here has earned its place by being a decision we never want to re-litigate or a constraint we never want to forget. Agents and humans must read this file before making any substantive change.

If you are tempted to violate a rule here, stop and open a discussion first. Never silently work around the constitution.

## Why {{Project Name}} exists

{{fill from project docs, README, or ask the user}}

## Scope guardrails

{{fill from project context or ask the user}}

## Architecture principles

{{fill from detected stack, project structure, and existing docs}}

## Tooling and workflow principles

{{fill from detected tooling — linter, formatter, package manager, test runner, CI}}

## Spec-Driven workflow

Before implementing any user request, assess whether the solution is obvious. If you cannot describe the complete solution in one sentence, use the Spec Kit flow: brainstorm → `spec.md` → `plan.md` → `tasks.md` → implement. If the solution is obvious, go direct. If almost obvious but with 1-2 open decisions, ask the user whether to spec or go direct.

Specs never get deleted. Shipped specs remain in `context/specs/` as historical record.

## Knowledge layering

- Project-specific knowledge lives in `context/`. Only add notes here for things unique to {{Project Name}}.
- Generic patterns that apply to any project should not be duplicated in this vault.

## What this constitution is not

- Not an architecture document. See `context/_index/learnings.md` for architecture notes.
- Not a style guide. See `context/conventions/` for code style conventions.
- Not a spec for any feature. Specs live in `context/specs/`.

This document exists to hold the things that would be catastrophic to forget.
```
