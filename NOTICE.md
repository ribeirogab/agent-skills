# NOTICE — Vendored content attribution

The published skills under [`skills/`](skills/) are licensed under the MIT License, the same as the repository as a whole — see [`LICENSE`](LICENSE).

The skills include a small amount of third-party content vendored from public open-source repositories. Each piece is preserved with its original license and copyright notice, and any modifications are documented below.

## Vendored inside `skills/skill-improver/`

`skill-improver` bundles two scripts vendored from `anthropics/skills` so the skill is self-contained and does not depend on the upstream project being installed alongside it:

| Field | Value |
|---|---|
| Files | `skills/skill-improver/scripts/quick_validate.py`, `skills/skill-improver/scripts/package_skill.py` |
| Original source | [https://github.com/anthropics/skills/tree/main/skill-creator/scripts](https://github.com/anthropics/skills/tree/main/skill-creator/scripts) |
| Original license | Apache-2.0 |
| Copyright holder | Anthropic |
| Modifications | `quick_validate.py` is verbatim. `package_skill.py` has one change vs upstream: the `from scripts.quick_validate import validate_skill` line is replaced with `sys.path.insert(0, str(Path(__file__).parent))` followed by `from quick_validate import validate_skill`, so the file works whether invoked as `python -m scripts.package_skill`, `python scripts/package_skill.py`, or by absolute path. The change is documented inline in the file's module docstring. |

## Maintainer-local content under `.claude/skills/`

The repository also commits third-party skills under `.claude/skills/` that the maintainer keeps for personal use during development. They are **not** part of the published catalog and are not what `npx skills add` installs from this repo, but they are publicly visible because they are committed, so attribution applies:

| Folder | Original source | License | Copyright | Modifications |
|---|---|---|---|---|
| `.claude/skills/skill-creator/` | [anthropics/skills/skill-creator](https://github.com/anthropics/skills/tree/main/skill-creator) | Apache-2.0 | Anthropic | None — verbatim copy. The upstream `LICENSE.txt` is preserved at `.claude/skills/skill-creator/LICENSE.txt`. |
| `.claude/skills/opensource-guide-coach/` | [xixu-me/skills/opensource-guide-coach](https://github.com/xixu-me/skills/tree/main/skills/opensource-guide-coach) | MIT | Xi Xu | None — verbatim copy. The upstream repository carries `LICENSE` only at its root, so vendoring just this skill folder dropped the notice; restored as `.claude/skills/opensource-guide-coach/LICENSE`. |

## License compatibility

The repository as a whole is licensed under MIT (see [`LICENSE`](LICENSE)). MIT is compatible with both vendored licenses:

- **Apache-2.0 → repository:** Apache-2.0 content is permitted inside an MIT-licensed project as long as the original `LICENSE.txt` (and any `NOTICE` file) is preserved alongside the vendored content. Both are preserved here.
- **MIT → repository:** Trivially compatible.

The repository's `LICENSE` covers the original work — every skill under `skills/`, the project documentation, and any scaffold payloads bundled inside those skills. It does not retroactively re-license the vendored content listed above.

## How to update this file

When vendored content is refreshed to a newer upstream version, update the corresponding row with the new source URL (specific commit or tag) and refresh the modifications cell. When new content is vendored, add a new row to the relevant section.
