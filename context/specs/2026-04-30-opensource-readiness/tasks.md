---
feature: opensource-readiness
plan: "[[plan]]"
spec: "[[spec]]"
created: 2026-04-30
---
# Opensource Readiness — Tasks

**For this plan:** `[[plan]]`

## Phase 1: Author the artifacts

### Task 1: Write `LICENSE`

- [ ] Step 1: Write the MIT license text at `LICENSE` with copyright line `Copyright (c) 2026 Gabriel Ribeiro`.
- [ ] Step 2: Verify with `grep -q "MIT License" LICENSE && grep -q "Copyright (c) 2026 Gabriel Ribeiro" LICENSE`.
- [ ] Step 3: No commit yet (commit at the end of Phase 2).

### Task 2: Write `CODE_OF_CONDUCT.md`

- [ ] Step 1: Fetch the canonical Contributor Covenant 2.1 text from `https://www.contributor-covenant.org/version/2/1/code_of_conduct/`.
- [ ] Step 2: Save as `CODE_OF_CONDUCT.md` with the contact-email field filled in: `gblosr@gmail.com`.
- [ ] Step 3: Verify the contact line is present: `grep -F "gblosr@gmail.com" CODE_OF_CONDUCT.md`.

### Task 3: Write `SECURITY.md`

- [ ] Step 1: Author a short policy: disclosure address `gblosr@gmail.com`, expectation "best-effort, no SLA", scope (skills under `skills/` and `.claude/skills/`).
- [ ] Step 2: Verify each required phrase: `grep -F "gblosr@gmail.com" SECURITY.md && grep -F "best-effort, no SLA" SECURITY.md`.

### Task 4: Restore the vendored opensource-guide-coach LICENSE

- [ ] Step 1: Write `.claude/skills/opensource-guide-coach/LICENSE` with the MIT text and copyright line `Copyright (c) Xi Xu`. The upstream xixu-me/skills repo carries the LICENSE only at the top-level, so vendoring just the skill dir dropped the notice; this restores it.
- [ ] Step 2: Verify: `grep -q "MIT License" .claude/skills/opensource-guide-coach/LICENSE && grep -q "Copyright (c) Xi Xu" .claude/skills/opensource-guide-coach/LICENSE`.

### Task 5: Write `NOTICE.md`

- [ ] Step 1: Enumerate vendored skills: `find skills/ .claude/skills/ -maxdepth 2 -name LICENSE -o -name LICENSE.txt 2>/dev/null` to ground-truth which folders are vendored.
- [ ] Step 2: Author `NOTICE.md` with one row per vendored skill: folder path, source URL (anthropics/skills, xixu-me/skills), original license SPDX, copyright holder, modifications (skill-creator's `package_skill.py` has a one-line import change for self-containment; everything else is verbatim).
- [ ] Step 3: Verify: `grep -F "skill-creator" NOTICE.md && grep -F "opensource-guide-coach" NOTICE.md && grep -F "Apache-2.0" NOTICE.md && grep -F "MIT" NOTICE.md`.

### Task 6: Write `README.md`

- [ ] Step 1: Author top-level `README.md` with sections in this order: H1 project name, one-paragraph description, "What's included" (skill catalog), "Install a skill" (concrete `cp -r` example), "License" (link to LICENSE), "Attribution" (link to NOTICE.md), "Contributing" (link to CONTRIBUTING.md).
- [ ] Step 2: Build the skill catalog by enumerating `skills/*/` and `.claude/skills/*/`. Resolve symlinks: `.claude/skills/harness` → already covered by `skills/harness`, list "harness" once.
- [ ] Step 3: Verify the catalog covers every skill folder: `for d in skills/*/ .claude/skills/*/; do n=$(basename "$d"); grep -q "$n" README.md || echo "MISSING: $n"; done` — must produce no output.

### Task 7: Write `CONTRIBUTING.md`

- [ ] Step 1: Author `CONTRIBUTING.md` with the four required section headers: `## Scope`, `## How to add a skill`, `## Quality bar`, `## Pull request checklist`.
- [ ] Step 2: In `## Scope`, state explicitly that `context/`, `evals/skill-improver/workspace/`, and any personal-vault path are not accepting PRs.
- [ ] Step 3: In `## Quality bar`, state that new skills MUST pass both `python skills/skill-improver/scripts/quick_validate.py <skill-path>` and `python skills/skill-improver/scripts/package_skill.py <skill-path> /tmp` cleanly.
- [ ] Step 4: Verify each required section: `for h in "## Scope" "## How to add a skill" "## Quality bar" "## Pull request checklist"; do grep -qF "$h" CONTRIBUTING.md || echo "MISSING: $h"; done` — must produce no output.

### Task 8: Write `.github/` templates

- [ ] Step 1: `mkdir -p .github/ISSUE_TEMPLATE`.
- [ ] Step 2: Write `.github/ISSUE_TEMPLATE/bug.md` with frontmatter `name: Bug report` and a body asking for: skill name, Claude Code version, reproduction steps, expected vs actual behavior.
- [ ] Step 3: Write `.github/ISSUE_TEMPLATE/skill_request.md` with frontmatter `name: Skill request` and a body asking for: proposed skill name, intended use case, why it doesn't fit an existing skill.
- [ ] Step 4: Write `.github/PULL_REQUEST_TEMPLATE.md` with checklist items: (a) ran `quick_validate.py` and `package_skill.py` on any new/modified skill (when applicable), (b) updated `README.md`'s skill list (when adding a skill), (c) did not modify `context/` or `evals/`.
- [ ] Step 5: Verify all three files exist and have correct frontmatter where required.

## Phase 2: Validate and ship

### Task 9: Self-validation pass

- [ ] Step 1: Walk every acceptance criterion from `spec.md` line by line. Check off each one as verified or note the failure.
- [ ] Step 2: Run `/harness` audit on the working tree. Confirm it returns "Harness is healthy" or, if any DRIFT/MISSING surfaces, confirm the items are unrelated to the new opensource artifacts.
- [ ] Step 3: Run `python skills/skill-improver/scripts/quick_validate.py skills/skill-improver` — must print "Skill is valid!".
- [ ] Step 4: Run `python skills/skill-improver/scripts/package_skill.py skills/skill-improver /tmp` — must print "Successfully packaged".
- [ ] Step 5: Confirm git branch is `feat/opensource-readiness` (not `main`) before any commit (per the `feedback_check_branch_before_committing` memory).

### Task 10: Commit and open PR

- [ ] Step 1: Stage the new files: `git add LICENSE README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md NOTICE.md .github/ .claude/skills/opensource-guide-coach/LICENSE context/specs/2026-04-30-opensource-readiness/`.
- [ ] Step 2: Commit with a message that follows the repo's conventional-commit style: `feat: open-source readiness — add LICENSE, README, contributor docs, attribution`.
- [ ] Step 3: Push the branch: `git push -u origin feat/opensource-readiness`.
- [ ] Step 4: Open the PR via `/harness-open-pr` (follow the command's auto-generated title/body flow). Title must fit within 70 chars; body must have `## Summary` and `## Test plan` sections; no `Co-Authored-By: Claude` footer.
- [ ] Step 5: Capture the PR URL.

### Task 11: Mark the spec as shipped + reflect

- [ ] Step 1: Update `context/specs/2026-04-30-opensource-readiness/spec.md` frontmatter: `status: shipped`, `shipped: 2026-04-30`.
- [ ] Step 2: Reflect on the spec ("what did I learn that wasn't obvious from the spec?"). If anything non-obvious surfaced, add an atomic note to `context/learnings/`. If nothing new, state that explicitly in the final report.
- [ ] Step 3: Add the spec to `context/_index/specs.md` under the `## Shipped` section.
- [ ] Step 4: Commit the spec status change in a follow-up commit on the same branch (or amended into the main commit before push, depending on what's cleaner). Push.
