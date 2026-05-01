## Summary

What this PR does, in 1–3 bullets. Link any related issue.

## Test plan

- [ ] (For new or modified skills) Ran `python skills/skill-improver/scripts/quick_validate.py <skill-path>` — output was `Skill is valid!`.
- [ ] (For new or modified skills) Ran `python skills/skill-improver/scripts/package_skill.py <skill-path> /tmp` — output ended with `Successfully packaged skill to: /tmp/<skill-name>.skill`.
- [ ] Tried the skill or command end-to-end in a Claude Code session and observed the expected behavior.
- [ ] (For documentation or template-only changes) Visually confirmed the rendered output is correct.

## Checklist

- [ ] Branch name is descriptive and not `main`.
- [ ] `README.md` was updated if a new skill was added (the `What's included` table needs the new row).
- [ ] `NOTICE.md` was updated if third-party content was vendored or refreshed.
- [ ] No edits under `context/` (the personal knowledge vault is out of scope).
- [ ] No edits under `evals/skill-improver/workspace/` (runtime artifact, gitignored).
- [ ] Commit messages follow Conventional Commits style.
- [ ] No `Co-Authored-By: Claude` footers in commits or this description.

## Notes for the reviewer

(Optional. Anything that didn't fit above — alternatives considered, follow-ups deferred to a later PR, etc.)
