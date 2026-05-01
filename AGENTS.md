# agent-skills — Agent Instructions

`agent-skills` is the author's personal library of agent skills and slash commands, written in markdown with occasional shell scripts. The flagship is `skills/harness/`, an idempotent scaffolder that installs agent infrastructure into target repos. There is no build system, no package manager, and no test runner at the repo root — each skill is self-contained under `skills/<name>/`. The repo dogfoods its own harness: scaffolded helper skills live canonically under `.agents/skills/<name>/` and are exposed via per-agent symlinks (`.claude/skills/<name>` → `.agents/skills/<name>`); the `/harness-*` slash commands live in `.claude/commands/` (Claude Code-specific concept).

## Before starting any work

1. **Read `context/_index/home.md`** for project-specific knowledge.
2. **Read `context/constitution.md`** for non-negotiable principles.
3. **If the user is asking you to implement, modify, or create something**, assess the request: "Can I describe the complete solution in one sentence?"
   - **Yes** → implement directly.
   - **No** → invoke `harness-brainstorming` → `spec-<slug>.md` → self-review the spec → `/harness-review-spec` for an external evaluator pass → `harness-writing-plans` → `plan-<slug>.md` + `tasks-<slug>.md` → implement.
   - **Almost** (1-2 open decisions) → ask the user whether to spec or go direct.

   If the user is asking a question, investigating, or exploring — just answer.

## Work ethic — never the lazy path

When you see two ways to do something — one quick-and-shallow, one correct-and-thorough — **default to correct**. You may *surface* the lighter option to the user with the tradeoffs ("here's a faster path that skips X, here's the proper one that handles X — which do you want?"), but never silently pick the worse one to finish faster. Cutting corners now creates work later, and the user notices. If the task is hard, the answer is to do it right, not to redefine "done" downward.

## When stuck or in doubt — read the vault first

`context/` is your project brain. You have been writing to it; **read from it too**. Before grinding on a hard problem, before guessing, before asking the user a question whose answer might already be captured: search `context/learnings/`, `context/conventions/`, `context/rules/`, the relevant spec in `context/specs/`, and `context/constitution.md`. Use the `harness-recall` skill or grep directly. Reading the vault is the **first move** on a hard problem, not the last. If the vault answers the question, cite the note; if it almost answers it, update the note after you fill the gap.

## After completing any task

If you discovered something non-obvious during implementation — a gotcha, a constraint, a surprising behavior — create an atomic note in `context/learnings/` using the template at `context/templates/learning.md`. Link it to the relevant spec with a wikilink if applicable. Do this without asking permission.

## After completing a spec

When a spec is shipped (all tasks in `tasks-<slug>.md` done, spec marked `shipped`), always run an explicit reflection step before closing out — do not skip this:

1. Ask yourself: "What did I learn implementing this that wasn't obvious from the spec?" Consider gotchas hit, constraints discovered, surprising framework/library behavior, decisions that reversed mid-implementation, and anything a future implementer would waste time rediscovering.
2. If there is at least one useful learning, create an atomic note in `context/learnings/` per learning (one concept per note) using `context/templates/learning.md`, and link it back to the spec folder with a wikilink. Add each new note to `context/_index/learnings.md` under the appropriate category.
3. If nothing non-obvious came up, say so explicitly in the final report ("No new learnings from this spec") — silence is not the same as reflection.

## Commands (most used)

This repo has no package.json and no build system. The most used commands are git workflow and the harness slash commands themselves.

- `git status` / `git diff` — inspect the working tree.
- `git switch -c feat/<name>` — start a new feature branch (never commit directly to `main`).
- `/harness-open-pr` — open a PR with auto-generated title and description (always use this, never raw `gh pr create`).
- `/harness` — invoke this skill (in this repo or any other) to audit/scaffold the agent harness.
- `/harness-spec` — turn the current conversation into a spec.
- `/harness-sweep` — manual garbage-collection pass over `context/`.

Full command catalog: `context/learnings/commands-catalog.md` _(create this note after setup)_.

## Knowledge locations

| What | Where |
|---|---|
| Non-negotiable principles | `context/constitution.md` |
| Specs (active + shipped) | `context/specs/` |
| Architecture, patterns, gotchas | `context/learnings/` (indexed by `context/_index/learnings.md`) |
| Code style conventions | `context/conventions/` (indexed by `context/_index/conventions.md`) |
| Project-specific rules | `context/rules/` |
| Spec template | `context/specs/_template/` |
| Note templates (learning, rule) | `context/templates/` |

## Skills and slash commands

Skills live canonically under `.agents/skills/` (agent-agnostic) and are exposed via per-agent symlinks (`.claude/skills/`, `.codex/skills/`, etc.) for whichever agent is in use. Slash commands live in `.claude/commands/` only — slash commands are a Claude Code-specific concept; on other agents the same workflows are invoked via prose prompts.

- **`harness-brainstorming`** — design exploration before writing a spec.
- **`harness-writing-plans`** — turn an approved design into a task list.
- **`harness-recall`** — quick project reconnaissance of the `context/` vault.
- **`/harness-spec`** — take the current conversation and enter the spec flow, skipping already-discussed questions.
- **`/harness-review-spec`** — external evaluator that reads `context/constitution.md` + a spec and flags violations, vagueness, missing acceptance criteria, and duplication of existing learnings/rules. Run this **after** your own spec self-review and **before** moving to `harness-writing-plans`.
- **`/harness-sweep`** — manual garbage-collection pass over the vault: orphan learnings, MOC entries pointing nowhere, constitution rules never cited, specs whose `tasks-<slug>.md` is fully checked but `status:` is still `draft`. Run on demand, never automatic.
- **`/harness-learn`** — investigate a topic in the project and save findings as a learning note in `context/learnings/`.
- **`/harness-open-pr`** — **required** command to open pull requests with auto-generated title and description. Always use this command when creating a PR.
