---
feature: opensource-readiness
spec: "[[spec]]"
created: 2026-04-30
---
# Opensource Readiness — Plan

**For this spec:** `[[spec]]`

## Approach

Single-PR launch checklist. Add the eight required artifacts at the repo root (`LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `NOTICE.md`, `.github/ISSUE_TEMPLATE/{bug,skill_request}.md`, `.github/PULL_REQUEST_TEMPLATE.md`) plus one missing in-tree file (`.claude/skills/opensource-guide-coach/LICENSE`). Then validate the result with the harness audit and skill-improver's static validators, then open the PR via `/harness-open-pr`.

The work is mechanical — every artifact is independently writable and has standard text (Contributor Covenant 2.1, MIT license boilerplate). The only judgment calls are inside the README (catalog of skills) and CONTRIBUTING (scope statement and quality bar), and those were resolved in the spec's brainstorming. No phasing or dependency between artifacts.

The MIT license at the repo root is compatible with the two vendored licenses (Apache-2.0 for `skill-creator`, MIT for `opensource-guide-coach`). The original `skill-creator/LICENSE.txt` (Apache-2.0 full text) is already in place from the original vendoring; we add a copy of the MIT license inside `opensource-guide-coach/LICENSE` that the upstream did not bundle. `NOTICE.md` lists every vendored skill with its source URL, original license, and modifications (skill-creator's `package_skill.py` had a one-line import change; everything else is verbatim).

## Architecture

Files added at repo root:

```
agent-skills/
├── LICENSE                                       # MIT, copyright 2026 Gabriel Ribeiro
├── README.md                                     # project description, skill catalog, install, license, attribution
├── CONTRIBUTING.md                               # scope, how to add a skill, quality bar, PR checklist
├── CODE_OF_CONDUCT.md                            # Contributor Covenant 2.1, contact gblosr@gmail.com
├── SECURITY.md                                   # disclosure address, "best-effort, no SLA", scope
├── NOTICE.md                                     # vendored-content attribution table
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md                                # bug report
│   │   └── skill_request.md                      # new-skill proposal
│   └── PULL_REQUEST_TEMPLATE.md                  # checklist (validators run, README updated, no vault edit)
└── .claude/skills/opensource-guide-coach/
    └── LICENSE                                   # MIT, copyright Xi Xu (restored after vendoring)
```

Files NOT added (out of scope per spec Non-Goals):

- `MAINTAINERS`, governance docs.
- `FUNDING.yml`, sponsorship setup.
- CI workflows under `.github/workflows/`.
- Localized doc copies.
- Marketing assets (badges-as-marketing, blog posts, social posts).

Files NOT modified:

- Anything inside `skills/` (skills themselves stay as-is).
- Anything inside `context/` *except* the new spec folder.
- Anything inside `evals/`.
- Anything inside `.claude/skills/` *except* the new `opensource-guide-coach/LICENSE`.
- `.gitignore` (no new ignore patterns needed).
- Existing `.claude/commands/`.

## File Structure

Per-file responsibilities and source of truth:

| File | One-line responsibility | Source |
|---|---|---|
| `LICENSE` | Grant MIT rights to the repo's original work | https://opensource.org/licenses/MIT (boilerplate) |
| `README.md` | Tell visitors what the repo is and how to use one skill | Hand-written from the spec's User Story 1 |
| `CONTRIBUTING.md` | Tell potential contributors what's accepted and the quality bar | Hand-written from the spec's User Story 2 + scope constraints |
| `CODE_OF_CONDUCT.md` | Adopt Contributor Covenant 2.1 verbatim | https://www.contributor-covenant.org/version/2/1/code_of_conduct/ |
| `SECURITY.md` | Disclosure expectation + scope | Hand-written from the spec's User Story 3 |
| `NOTICE.md` | Attribution for vendored content | Hand-written from the actual filesystem state of vendored skills |
| `.github/ISSUE_TEMPLATE/bug.md` | Structured bug report | Hand-written, terse |
| `.github/ISSUE_TEMPLATE/skill_request.md` | Structured new-skill proposal | Hand-written, terse |
| `.github/PULL_REQUEST_TEMPLATE.md` | Per-PR checklist | Hand-written, references skill-improver validators |
| `.claude/skills/opensource-guide-coach/LICENSE` | MIT notice for the vendored xixu-me skill | https://opensource.org/licenses/MIT with Xi Xu's copyright line |

## Phase Ordering

No phases. Every artifact is independent. The implementation walks `tasks.md` in order; any task can be reordered without affecting another. Validation runs once at the end.

The only sequencing constraint: validation (skill-improver scripts + harness audit) must run *after* all artifacts are in place. Open the PR last.

## Risks / Open Decisions

- **Decision: MIT vs. Apache-2.0 for the top-level license.** Decided MIT (spec's "Open Questions"). Rationale: MIT is the most familiar to skill authors, has zero downsides for a personal collection, and is compatible with both vendored licenses. Apache-2.0 would also work but is heavier (patent grant, NOTICE-file machinery) without a clear benefit at this scale.

- **Decision: Contributor Covenant 2.1 verbatim vs. a custom code of conduct.** Decided Contributor Covenant 2.1. Rationale: lowest-friction option that satisfies GitHub's community-health checks; custom would invite unnecessary debate.

- **Decision: include or skip `FUNDING.yml`.** Decided skip (Non-Goal). Adding it would be premature given the project has no contributors yet.

- **Risk: README skill catalog drifts from filesystem state.** Mitigation: PR template asks the contributor to update README when adding a skill; acceptance criterion enforces consistency at PR-open time. A future iteration could automate the catalog from `find skills/`, but mechanical enforcement at this scale is overkill.

- **Risk: PR description accidentally contains `Co-Authored-By: Claude` due to default git template.** Mitigation: explicit acceptance criterion + the implementer is aware (Rule of No Attribution). `/harness-open-pr` does not inject attribution.

- **No open decisions remain.** All open questions in the spec resolved.
