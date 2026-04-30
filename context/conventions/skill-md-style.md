---
tags:
  - convention
  - skill-authoring
applies-to:
  - skills/<name>/SKILL.md
  - .claude/skills/<name>/SKILL.md
created: 2026-04-30
---
# SKILL.md authoring style

Style rules for the `SKILL.md` body and the `description` frontmatter field. The hard format constraints (length limits, character classes, reserved words) live in `[[../rules/skill-validation-requirements]]` — this note is about how the content should *read* once the format is valid.

## Why

The `description` field decides whether a skill triggers at all. The `SKILL.md` body decides whether the triggered skill is actually useful. Both are competing for context tokens with everything else Claude is doing — concise, well-structured prose is the difference between a skill that gets used and one that gets disabled.

## How to Apply

### Description field — the most load-bearing line in the whole skill

Format: **`<what it does> + <when to use it> + <key triggers / file types / negative cases>`**.

- Write in **third person** ("Extracts text from PDFs", not "I can extract text" / "You can use this to extract text"). The description is injected into the system prompt; first/second person breaks discovery consistency.
- Include both **WHAT** the skill does and **WHEN** Claude should use it. Missing either is the most common reason for under-triggering.
- Include **negative triggers** when the skill could be confused with a sibling: "Use for X. Do NOT use for Y — that's handled by `<other-skill>`." (mgechev's strongest emphasis; Anthropic agrees in the troubleshooting section.)
- Include **trigger phrases** users actually say and **file extensions** if relevant: "Use when working with PDFs, when the user mentions forms, or when files end in `.pdf`."
- Stay under 1024 characters total.

Examples (good):

```
description: Analyzes Excel spreadsheets, creates pivot tables, generates charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```
```
description: Generates descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

Examples (bad):
- `description: Helps with documents` — vague, no triggers, no file types.
- `description: I can help you process Excel files` — first/second person.
- `description: Implements the Project entity model` — technical, no user triggers.

### Naming preference

Anthropic suggests **gerund form** (verb + -ing) for skill names because it describes the activity:

- ✓ `processing-pdfs`, `analyzing-spreadsheets`, `managing-databases`, `writing-documentation`.
- Acceptable alternatives: noun phrases (`pdf-processing`), action verbs (`process-pdfs`).
- Avoid: `helper`, `utils`, `tools`, `documents`, `data`.

This is a soft preference — gerund form gives the strongest "what does this do?" signal. Within a personal collection, **stay consistent**: don't mix `processing-pdfs` and `pdf-tools`.

### SKILL.md body

- **Body length**: under **500 lines** (Anthropic platform docs) / under ~5,000 words (PDF guide). When approaching either, split into `references/`.
- **Voice**: third-person imperative. "Extract the text...", "Run the script...", "Validate the output..." — not "I will" or "you should".
- **Consistent terminology**: pick one term and use it throughout. Don't mix "API endpoint" / "URL" / "API route" / "path" — Claude pattern-matches on terminology, and synonyms cost coherence.
- **No time-sensitive information.** Don't write "before August 2025, do X". If you must mention a deprecated path, put it inside an `## Old patterns` section (or `<details>`) so it doesn't pollute the main flow.
- **One level of references.** From `SKILL.md`, link directly to `references/<file>.md`. Do not link to a reference that links to another reference — Claude partial-reads nested files and may miss content.
- **TOC for long references.** Any `references/<file>.md` over 100 lines must start with a `## Contents` block listing its sections so Claude can navigate when partial-reading.
- **Forward slashes** in every path: `scripts/helper.py`, never `scripts\helper.py`.
- **Make execution intent explicit.** "Run `scripts/foo.py`" vs "See `scripts/foo.py` for the algorithm". Don't leave Claude to guess whether to read or run.
- **MCP tool references must be fully qualified**: `BigQuery:bigquery_schema`, `GitHub:create_issue`. Without the server prefix Claude may fail to locate the tool.

### Default assumption: Claude is already smart

Only add what Claude doesn't already know. Challenge each paragraph: "Does Claude need this explanation?" "Can I assume domain knowledge?" "Does this paragraph justify its token cost?" Anthropic's canonical example: don't explain what a PDF is or how Python imports work.

### Patterns

- **Templates** for output format — strict (`ALWAYS use this exact template`) when output shape matters (API responses, structured data); flexible (`Here's a sensible default; adapt as needed`) when judgment is wanted.
- **Examples** as input/output pairs when style matters (commit messages, error messages, etc.).
- **Workflows** as numbered steps with a checklist Claude can copy and tick. Include validate-fix-repeat loops for quality-critical operations.
- **Conditional branches** for "if creating new vs editing existing": route to the right sub-section.

### Anti-patterns

- "You can use pypdf, or pdfplumber, or PyMuPDF, or..." — pick one default; offer alternatives only with a clear escape-hatch ("for OCR, use pdf2image instead").
- Voodoo constants in scripts (`TIMEOUT = 47` with no explanation). Document or compute every value.
- Punting errors to Claude (`return open(path).read()` with no try/except). Scripts should solve, not fail.

## Source

Anthropic platform docs — *Skill authoring best practices*, "Core principles" / "Skill structure" / "Common patterns" / "Anti-patterns" sections; *The Complete Guide to Building Skills for Claude* (PDF), Chapter 2 "Writing effective skills" and Chapter 5 "Patterns and troubleshooting"; mgechev/skills-best-practices README.
