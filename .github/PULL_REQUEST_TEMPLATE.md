## Summary

What this PR does, in 1–3 bullets. Link any related issue.

## Test plan

- [ ] (For modified skills) Ran `python skills/skill-improver/scripts/quick_validate.py <skill-path>` — output was `Skill is valid!`.
- [ ] (For modified skills) Ran `python skills/skill-improver/scripts/package_skill.py <skill-path> /tmp` — output ended with `Successfully packaged skill to: /tmp/<skill-name>.skill`.
- [ ] Tried the skill end-to-end in an agent session (Claude Code, Codex, Cursor, OpenCode, or whichever you use) and observed the expected behavior.
- [ ] (For documentation or template-only changes) Visually confirmed the rendered output is correct.

## Checklist

- [ ] Branch name is descriptive and not `main`.
- [ ] `README.md`'s `## Skills` section was updated if a skill was added or removed.
- [ ] `NOTICE.md` was updated if vendored content was refreshed or modified.
- [ ] No edits under `context/`, `.claude/`, or `evals/` (maintainer-local dirs, out of scope).
- [ ] Commit messages follow Conventional Commits style.
- [ ] No AI-attribution footers in commits or this description (e.g. `Co-Authored-By: Claude`, `Generated with Cursor`, `Co-authored-by: Codex`, etc.).

## Notes for the reviewer

(Optional. Anything that didn't fit above — alternatives considered, follow-ups deferred to a later PR, etc.)
