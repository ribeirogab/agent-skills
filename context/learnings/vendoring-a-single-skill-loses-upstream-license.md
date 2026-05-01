---
tags:
  - learning
  - gotcha
related:
  - "[[../specs/2026-04-30-opensource-readiness/spec]]"
created: 2026-04-30
---
# Vendoring a single skill from a multi-skill repo loses the upstream LICENSE

When a target skill lives inside a larger upstream repository, the upstream's `LICENSE` file is typically at the **repo root**, not inside each skill folder. Vendoring just the skill subdirectory therefore drops the license notice — even though the content is still under that license. This is easy to miss because the imported skill keeps working; the gap is legal/attribution-only and surfaces only when someone audits the repo for compliance.

## Context

Discovered while preparing `agent-skills` for open-source publication. We had vendored two third-party skills:

- `.claude/skills/skill-creator/` from anthropics/skills — Apache-2.0. Anthropic packages its `LICENSE.txt` *inside* the skill folder, so vendoring preserved it automatically.
- `.claude/skills/opensource-guide-coach/` from xixu-me/skills — MIT (Xi Xu). The upstream carries `LICENSE` at the repo root only; vendoring the skill subdir dropped the notice.

The opensource-readiness audit caught the gap. The fix was straightforward (write a `LICENSE` file inside the vendored skill folder with Xi Xu's MIT text and a one-paragraph note pointing to the upstream source), but the *detection* of the gap was the load-bearing step.

## How It Works

The two layouts a vendored skill might come from:

1. **License-per-skill** (anthropics/skills pattern): every skill ships its own `LICENSE.txt`. Vendoring a single folder preserves licensing automatically.
2. **License-at-root** (xixu-me/skills pattern, and most multi-component repos): one top-level `LICENSE` covers everything. Vendoring a single subfolder loses the notice.

The reflex check, run as part of any vendoring step:

```bash
# After copying the upstream skill folder into .claude/skills/<name>/, confirm a license is present:
ls .claude/skills/<name>/LICENSE* .claude/skills/<name>/COPYING 2>/dev/null
```

If nothing prints, the upstream is layout #2 and a `LICENSE` file must be added to the vendored folder before the next commit. The added file should:

- Contain the upstream license's full text (or the equivalent SPDX boilerplate).
- Carry the upstream copyright holder's name verbatim (`Copyright (c) <holder>`).
- Note that the file restores an upstream notice the vendoring step dropped, and link to the upstream source URL for traceability.

The repo's `NOTICE.md` should also list the vendored skill with its source URL, license SPDX, and "modifications: None — verbatim copy" (or whatever the actual modifications are).

## How to Apply

When vendoring any new third-party content into this repo:

1. Run the license-presence check above on the freshly vendored folder.
2. If the upstream is license-at-root, copy/synthesize the upstream license inside the vendored folder.
3. Add a row to `NOTICE.md` with source URL, SPDX, copyright holder, and modifications note.
4. The opensource-readiness PR baseline (this learning's parent spec) provides the working examples for both layouts.
