---
status: shipped
feature: opensource-readiness
created: 2026-04-30
shipped: 2026-04-30
---
# Opensource Readiness — Spec

**Status:** Draft
**Scope:** Add the minimum set of root-level artifacts (license, README, contributor docs, security policy, GitHub templates, attribution for vendored content) so `agent-skills` can be published as a public repository on GitHub without leaving load-bearing questions unanswered.

## Context

`agent-skills` is the author's personal collection of Claude Code skills and slash commands. The repo currently has no top-level `LICENSE`, no `README.md`, no contributor docs, and no attribution file for the two vendored third-party skills (`skill-creator` Apache-2.0; `opensource-guide-coach` MIT). The opensource-guide-coach skill's diagnostic on this repo identified `Starting an Open Source Project` + `The Legal Side of Open Source` + `Your Code of Conduct` as the relevant guides, with a six-step launch checklist. This spec turns that checklist into a concrete, verifiable set of artifacts.

The author wants the repo public-ready in a single PR — no governance charters, no maintainer hierarchies, no funding scaffolding. Solo project, best-effort maintenance, opinionated about scope.

## Problem Statement

Without the artifacts in this spec, the repo cannot be safely or usefully made public:
- **Legal:** absence of a top-level license means visitors have no rights to use, fork, or modify the content. Vendored third-party content (Apache-2.0 + MIT) requires preserving original attribution.
- **Discoverability:** absence of a `README.md` means GitHub renders an empty repo card.
- **Contribution:** absence of `CONTRIBUTING.md` means contributors don't know what's accepted (skills) versus what isn't (the personal knowledge vault under `context/`), and they don't know the quality bar (the `skill-improver` audit).
- **Trust signals:** absence of `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `.github/` templates triggers GitHub's community-health warning and produces a worse first impression than the project deserves.

## Non-Goals

- Governance charter, MAINTAINERS file, leadership rotation. Solo project; premature.
- Funding/sponsorship setup (`FUNDING.yml`, GitHub Sponsors). Out of scope; can be added later.
- Marketing or discoverability work (badges-as-marketing, blog post, social posts, `awesome-*` list submissions). The opensource-guide-coach guide explicitly recommends not over-promising at launch.
- Test infrastructure or CI for skills. The skills are markdown-driven; the canonical validators (`scripts/quick_validate.py`, `scripts/package_skill.py`) live inside `skill-improver` and are sufficient for contributor self-validation.
- Localization (translating the README or other docs to other languages).
- Paid-support tier, SLAs, response-time commitments. Opposite of what the guide recommends for solo projects.
- Migration of the personal vault (`context/`) into a contributor-facing format. The vault stays personal.

## Constraints

- **Branch + PR:** all work in `feat/opensource-readiness`, one PR opened via `/harness-open-pr`. The `Rule of Explicit Consent` from the user's global `CLAUDE.md` says never push directly to main; this is the path.
- **License compatibility:** the chosen top-level license must be compatible with both vendored licenses (Apache-2.0 and MIT). MIT is the standard low-friction choice and satisfies this trivially.
- **Attribution preservation:** the existing `skill-creator/LICENSE.txt` (Apache-2.0 full text) must remain in place. The vendored `opensource-guide-coach/` files do not currently carry a copyright notice — one must be added per the MIT license terms (Xi Xu).
- **Single source of truth:** any mention of which skills are vendored vs. authored must agree with the actual repo state. Use `find` / `git ls-files` to enumerate, do not maintain a parallel list by hand.
- **No promises:** CONTRIBUTING and SECURITY must avoid response-time commitments. State "best-effort, no SLA" explicitly.
- **Personal vault is off-limits to contributors:** CONTRIBUTING must explicitly say `context/`, `evals/skill-improver/workspace/`, and personal memory under `~/.claude/projects/` are not accepting external PRs. Skill folders under `skills/` and `.claude/skills/` ARE the contribution surface.
- **No Claude attribution in commits/PR text** (`Rule of No Attribution` from global CLAUDE.md).
- **Project artifacts in EN** (existing memory `user_language.md`).

## User Stories / Scenarios

1. **Visitor lands on the repo.** They see a `README.md` that explains in two paragraphs what the repo is, who it's for, what's inside, and how to install one skill into their own Claude Code setup. They can click through to LICENSE, CONTRIBUTING, and the skill catalog without scrolling past clutter.

2. **Potential contributor wants to add a skill.** They open `CONTRIBUTING.md`, see the contribution scope (skills yes, vault no), see the quality bar (run `skill-improver` against the new skill until clean), see the PR checklist, and have everything they need to submit a clean PR.

3. **Security researcher finds a sketchy script.** They open `SECURITY.md`, find an email and a clear "best-effort, no SLA" disclosure expectation, and know how to report.

4. **Attribution check by a downstream consumer.** Someone forks the repo and wants to confirm the vendored skills are properly attributed. They open `NOTICE.md` (or the attribution section of `README.md`) and find each vendored skill listed with: original source URL, original license, what (if anything) was modified.

5. **Existing user re-runs `/harness` after the PR lands.** The harness audit still passes 13/13 validation — none of the new files cause drift in the existing harness checks.

## Acceptance Criteria

Each criterion is binary, observable, and verifiable in under a minute by anyone with a fresh clone of the branch.

- [ ] `LICENSE` exists at the repo root, contains the full MIT license text with copyright line `Copyright (c) 2026 Gabriel Ribeiro`. (`grep -q "MIT License" LICENSE && grep -q "Copyright (c) 2026 Gabriel Ribeiro" LICENSE`)
- [ ] `README.md` exists at the repo root and contains, in this order: project name as H1, one-paragraph description, "What's included" section listing every committed skill (under `skills/` and `.claude/skills/`) with a one-line summary each, "Install a skill" section with a concrete `cp -r` example, "License" section pointing to LICENSE, and "Attribution" section pointing to `NOTICE.md`. (Verified by section-header grep + visual confirmation.)
- [ ] Every skill directory present in the filesystem is mentioned by its directory name at least once in `README.md`. Verifiable by: `for d in skills/*/ .claude/skills/*/; do n=$(basename "$d"); grep -q "$n" README.md || echo "MISSING: $n"; done` — must produce no output. Symlinks count as their own entry only when the symlink is the *only* exposure (e.g., `.claude/skills/harness` → `skills/harness` is one entry, "harness", listed once).
- [ ] `CONTRIBUTING.md` exists at the repo root and contains, at minimum, sections titled `## Scope`, `## How to add a skill`, `## Quality bar`, `## Pull request checklist`. The "Scope" section states explicitly that `context/`, `evals/skill-improver/workspace/`, and any other personal-vault path are not accepting PRs. The "Quality bar" section states that new skills MUST pass `python skills/skill-improver/scripts/quick_validate.py <skill-path>` and `python skills/skill-improver/scripts/package_skill.py <skill-path> /tmp` cleanly before the PR is opened.
- [ ] `CODE_OF_CONDUCT.md` exists at the repo root and is the unmodified text of Contributor Covenant 2.1 with the contact email field filled in (`gblosr@gmail.com`).
- [ ] `SECURITY.md` exists at the repo root, lists `gblosr@gmail.com` as the disclosure address, states "best-effort, no SLA" explicitly, and lists the supported scope (skills under `skills/` and `.claude/skills/`).
- [ ] `NOTICE.md` exists at the repo root and contains a row for every vendored third-party skill (currently `skill-creator` and `opensource-guide-coach`). Each row states: skill folder path, original source URL, original license SPDX identifier, copyright holder, and a one-line description of what was modified (or "verbatim copy" when unmodified).
- [ ] `.claude/skills/opensource-guide-coach/` has a `LICENSE` file containing the MIT license text with copyright line `Copyright (c) Xi Xu` (the upstream repo carries it at the top-level only — vendoring just the skill folder dropped the notice; restore it inside the skill folder).
- [ ] `.github/ISSUE_TEMPLATE/bug.md` exists with frontmatter `name: Bug report` and a body that asks for: skill name, Claude Code version, reproduction steps, expected vs actual behavior.
- [ ] `.github/ISSUE_TEMPLATE/skill_request.md` exists with frontmatter `name: Skill request` and a body that asks for: proposed skill name, intended use case, why it doesn't fit an existing skill.
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` exists and includes a checklist that asks the contributor to confirm: ran `quick_validate.py` and `package_skill.py` on any new/modified skill (when applicable), updated `README.md`'s skill list (when adding a skill), did not modify `context/` or `evals/`.
- [ ] Running `/harness` against the branch returns "Harness is healthy" (or, for any genuine MISSING/DRIFT, the items are unrelated to the opensource artifacts added by this PR — meaning we did not break the harness scaffold).
- [ ] Running `python skills/skill-improver/scripts/quick_validate.py skills/skill-improver` and `... package_skill.py skills/skill-improver /tmp` both succeed with `Skill is valid!` / `Successfully packaged` (sanity check that the artifacts didn't accidentally break the skills themselves).
- [ ] One PR is opened against `main` from `feat/opensource-readiness` using `/harness-open-pr`. The PR title fits within 70 characters. The PR body has a `## Summary` section and a `## Test plan` section per the repo's commit conventions.
- [ ] The PR description does not contain `Co-Authored-By: Claude` or any "Generated by Claude" footer (`Rule of No Attribution`).

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| MIT license chosen at root conflicts with Apache-2.0 vendored content. | False conflict: Apache-2.0 license terms allow inclusion in MIT-licensed projects as long as the original Apache-2.0 LICENSE.txt + any NOTICE file remain inside the vendored folder. The skill-creator's LICENSE.txt is preserved. |
| README skill list drifts from filesystem state over time. | Listed as a constraint and as an acceptance criterion. The PR checklist also reminds contributors to update it when adding skills. A future iteration could automate the list, but that's out of scope here. |
| Code of Conduct attracts moderation work the maintainer doesn't want. | Contributor Covenant 2.1 is the lightest mainstream choice. Filing the contact email as a personal address is a deliberate signal that enforcement is solo + best-effort. |
| Attribution mistake on vendored content (forgetting to preserve a copyright notice). | NOTICE.md + per-vendored-skill LICENSE files. Acceptance criteria call out each vendored skill explicitly. |
| `.github/` templates trigger GitHub's auto-fill UI in unexpected ways for the maintainer's own issues. | Templates are short and bypassable; no `assignees` or `labels` fields that would force a particular workflow. |
| Personal vault (`context/`) gets edited by an external contributor who didn't read CONTRIBUTING. | CONTRIBUTING calls it out explicitly. PR template asks the contributor to confirm they did not edit `context/` or `evals/`. PR review will reject any such PR. |
| The PR is too large and hard to review. | Single-purpose: every file added is required for the launch checklist. No surprise refactors. |

## Open Questions

None — the brainstorming questions were answered self-directed per the user's instruction. Specifically:

- License choice: **MIT** (compatible with both vendored licenses, lightest, highest familiarity).
- Code of Conduct: **Contributor Covenant 2.1** with `gblosr@gmail.com` as contact.
- Contribution scope: **skills only** — `context/` and `evals/` are personal.
- Maintainer expectations: **solo, best-effort, no SLA** — stated explicitly.
- Naming/branding: **keep `agent-skills`** with subtitle "A personal-but-shareable collection of Claude Code skills".
- Adoption/marketing: **out of scope** for this PR (deferred to a future task per opensource-guide-coach's "don't over-promise at launch" guidance).
- Funding / sponsorship: **out of scope**.
- Test infrastructure: **already covered** by `skill-improver`'s vendored validators; no extra CI in this PR.
