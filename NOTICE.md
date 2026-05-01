# NOTICE — Vendored content attribution

This repository contains two third-party Claude Code skills vendored from public open-source repositories. Each is preserved with its original license and copyright notice. Modifications, where any, are listed below.

## `.claude/skills/skill-creator/`

| Field | Value |
|---|---|
| Original source | [https://github.com/anthropics/skills/tree/main/skill-creator](https://github.com/anthropics/skills/tree/main/skill-creator) |
| Original license | Apache-2.0 |
| Copyright holder | Anthropic |
| Modifications | None — verbatim copy (the upstream `LICENSE.txt` is preserved at `.claude/skills/skill-creator/LICENSE.txt`). |

## `.claude/skills/opensource-guide-coach/`

| Field | Value |
|---|---|
| Original source | [https://github.com/xixu-me/skills/tree/main/skills/opensource-guide-coach](https://github.com/xixu-me/skills/tree/main/skills/opensource-guide-coach) |
| Original license | MIT |
| Copyright holder | Xi Xu |
| Modifications | None — verbatim copy. The upstream repository carries `LICENSE` only at its root, so vendoring just this skill folder dropped the notice; restored as `.claude/skills/opensource-guide-coach/LICENSE`. |

## `skills/skill-improver/scripts/`

The `skills/skill-improver/` skill bundles two scripts vendored from `anthropics/skills`:

| Field | Value |
|---|---|
| Files | `skills/skill-improver/scripts/quick_validate.py`, `skills/skill-improver/scripts/package_skill.py` |
| Original source | [https://github.com/anthropics/skills/tree/main/skill-creator/scripts](https://github.com/anthropics/skills/tree/main/skill-creator/scripts) |
| Original license | Apache-2.0 |
| Copyright holder | Anthropic |
| Modifications | `quick_validate.py` is verbatim. `package_skill.py` has one change vs upstream: the `from scripts.quick_validate import validate_skill` line is replaced with `sys.path.insert(0, str(Path(__file__).parent))` followed by `from quick_validate import validate_skill`, so the file works whether invoked as `python -m scripts.package_skill`, `python scripts/package_skill.py`, or by absolute path. The change is documented inline in the file's module docstring. |

## License compatibility

The repository as a whole is licensed under the MIT License (see [`LICENSE`](LICENSE)). MIT is compatible with both vendored licenses:

- **Apache-2.0 → repository:** Apache-2.0 content is permitted inside an MIT-licensed project as long as the original `LICENSE.txt` (and any `NOTICE` file) is preserved alongside the vendored content. Both are preserved here.
- **MIT → repository:** Trivially compatible.

The repository's `LICENSE` covers original work — the harness skill, `skill-improver`, the `harness-*` skills and commands, and the project documentation. It does not retroactively re-license vendored content.

## How to update this file

When a new third-party skill is vendored into the repository, add a new entry to this file with: source URL, original license SPDX identifier, copyright holder, and a one-line description of any modifications (or "None — verbatim copy"). When a vendored skill is updated to a newer upstream version, refresh the source URL with the specific commit or tag and note the upstream version in the modifications row.
