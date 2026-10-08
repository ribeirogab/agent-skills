---
name: show-design
description: Builds a reviewable single-file HTML technical design of a planned change, with architecture and flow diagrams, the planned change tree, the ERD, and contracts, and reads the review comments left on it. Use after grilling a plan and before writing its spec, or when the user says they left comments on the design.
---

# show-design

Turn the plan settled in the conversation into one technical design page that the user reviews and comments on before the spec is written. The page is a single self-contained file, `.scratch/<feature-slug>/design.html`, and it later serves as implementation context: the design content comes first, then the review comments as embedded JSON, then the page styles and script. The conversation, `GLOSSARY.md`, and the ADRs stay the source of truth for decisions, so `/to-spec` keeps synthesizing from the conversation.

The helper `scripts/show_design.py` (Python 3, standard library only) builds, serves, and checks the page. Run it from the repository root as `python3 <skill-dir>/scripts/show_design.py <command> <design-file>`; each command explains its options with `--help`.

| Situation | Action |
| --- | --- |
| A plan is settled in the conversation, or the plan changed after the last build | Steps 1–4 |
| The user says they left comments on the design | Read [references/review-comments.md](references/review-comments.md) and follow it |

## 1. Map the plan to the code

Collect every decision from the conversation, the `GLOSSARY.md` terms the plan uses, and the ADRs in the touched area; a root `GLOSSARY-MAP.md` points to per-context files. Then read the code each decision touches: entry points, modules, routes, jobs, queues, external integrations, and the schema source of truth (Prisma schema, migrations, ORM models, or DDL).

Keep three sources apart throughout: what the code establishes, what the conversation settled, and what you propose to fill a gap. A point that needs the user's decision becomes an open question on the page, never an assumption.

**Ready when:** every decision maps to the code it changes or to an open question, and every existing path the page will show was confirmed on disk.

## 2. Write the content

Choose a short kebab-case feature slug, reusing the slug this feature already has under `.scratch/`. Write the design content into `.scratch/<feature-slug>/design.html` with the sections of [references/sections.md](references/sections.md), in its order and under its markup contract: the first build wraps that content into the full page. Write the content in the language of your conversation with the user, and keep code identifiers, paths, and schema names exactly as the code spells them. Section headings and everything the template draws stay in English.

On a built page, edit only the content between `<main class="design" id="design">` and its `</main>`. The build regenerates everything after it and keeps the embedded comments.

**Ready when:** every changed file is in the change tree, every touched entity and column is in the data model, every new or changed contract is listed, and every element a reviewer could point at carries a stable, unique `data-anchor`.

## 3. Build, serve, and check

1. `build <design-file> --lang <content-language-tag>` validates the content and rewrites the file as the complete page. Fix every reported problem and build again.
2. Start `serve <design-file>` as a background process. It reuses a server already running for the file and prints the URL.
3. Open the URL for the user: in your browser preview tool when you have one, otherwise run `serve` with `--open`. On a remote host, give the URL with the SSH port-forward command for its port.
4. `status <design-file> --wait 30` reads the render report the open page sends. Fix each failed diagram, rebuild, and check again.

**Ready when:** `status` reports that every diagram rendered for the current build.

## 4. Hand over

Send a short message with the URL, the absolute path of `design.html` (the file to hand to `/to-spec` and to implementation as context), the number of open questions on the page, and how to review: turn on **Comment** in the header (or press `C`) and click anywhere, including a diagram node or an ERD column; open a diagram with **Expand** to zoom and pan; then say in the chat that the comments are ready. End the turn.

When the plan changes later, edit the content and repeat step 3. An open page reloads by itself when a new build lands.
