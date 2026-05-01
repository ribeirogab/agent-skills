# Audit Checklist

Apply each section to the target skill in order. For each item, record `PASS`, `FAIL`, or `N/A`. Every `FAIL` becomes a finding to surface to the user, categorized by the severity in the section header.

## Contents

- Section 1 — Frontmatter validation (Critical)
- Section 2 — Folder and file naming (Critical / Structural)
- Section 3 — Directory layout (Structural)
- Section 4 — Description quality (Stylistic)
- Section 5 — SKILL.md body style (Stylistic)
- Section 6 — Progressive disclosure (Opportunity)
- Section 7 — Degrees of freedom (Opportunity)
- Section 8 — Workflow patterns (Opportunity)
- Section 9 — Scripts (Opportunity)
- Section 10 — Anti-regression sanity check (run before proposing changes)

The canonical source for these rules is Anthropic's *Skill authoring best practices* (platform docs) and *The Complete Guide to Building Skills for Claude* (33-page PDF). The mgechev/skills-best-practices repo aligns with these and adds emphasis on negative triggers.

---

## Section 1 — Frontmatter validation (Critical)

A failure here means the skill silently fails to load. These are not preferences; they are runtime validation rules. **Do not check by hand — invoke this skill's bundled `quick_validate.py`** (see Step 4a in `SKILL.md`). The script is the canonical enforcer of every rule below; the rules are listed here only for reference.

```bash
python <path-to-this-skill>/scripts/quick_validate.py <absolute-path-to-target-skill>
```

A non-`"Skill is valid!"` exit is a **Critical** finding — quote the script's error message verbatim in the finding's evidence.

Reference list of what the script enforces (in case the script needs human verification):

- [ ] File begins with `---` on line 1
- [ ] File contains a closing `---` before the body
- [ ] `name` field present, 1–64 chars, kebab-case (lowercase letters, numbers, hyphens), no `<>`, no reserved words `claude`/`anthropic`, no leading/trailing/double hyphens
- [ ] `description` field present, non-empty, ≤ 1024 chars, no `<>`
- [ ] Only allowed top-level keys: `name`, `description`, `license`, `compatibility`, `allowed-tools`, `metadata`
- [ ] `compatibility` (if present) is a string ≤ 500 chars

The most common failures the prose checklist would let slip are: `<` or `>` inside the description (easy to miss visually), description over 1024 chars (impossible to count by eye), and unknown top-level keys typed by accident. The script catches all three deterministically.

## Section 2 — Folder and file naming (Critical for `SKILL.md`, Structural for the rest)

- [ ] The skill's folder name is kebab-case (lowercase letters, numbers, hyphens only — no spaces, no underscores, no capitals)
- [ ] The folder name exactly matches the `name` field in the frontmatter
- [ ] The skill file is named exactly `SKILL.md` (case-sensitive — `SKILL.MD`, `skill.md`, `Skill.md` all fail)
- [ ] No `README.md` directly inside the skill folder (a repo-level `README.md` outside any skill folder is fine)

## Section 3 — Directory layout (Structural)

- [ ] Optional canonical directories use canonical names: `scripts/`, `references/`, `assets/`
- [ ] No reference file is more than one level deep from `SKILL.md` — `references/foo.md` is fine, `references/sub/foo.md` is not. Anthropic's runtime partial-reads nested files (`head -100`) and may miss content past the preview.
- [ ] Any non-canonical top-level directory (e.g., `agents/`, `eval-viewer/`, `scaffold/`, `evals/`) is explicitly referenced from `SKILL.md`. If not referenced, flag as a structural finding.
- [ ] All paths used inside the skill (in `SKILL.md`, scripts, references) use forward slashes — never backslashes — even when they refer to files only used on Windows.
- [ ] Reference files over 100 lines start with a `## Contents` (or `## Table of contents`) block listing their sections, so Claude can navigate when partial-reading.

## Section 4 — Description quality (Stylistic)

The `description` field is the only thing Claude sees from the skill at level 1 of progressive disclosure. It must do all the discovery work.

- [ ] Written in third person ("Extracts X", "Audits X" — not "I extract", "you can use")
- [ ] States WHAT the skill does
- [ ] States WHEN the skill should trigger (specific contexts, file types, user phrasings)
- [ ] Includes specific trigger phrases users would actually say (paraphrases, casual language welcome)
- [ ] Names file types when relevant (`.pdf`, `.xlsx`, `.docx`, etc.)
- [ ] Includes negative triggers when a sibling skill could be confused: "Do NOT use for X — that is `<other-skill>`."
- [ ] No vague verbs: "helps with", "does stuff with", "works on" — replace with specific actions
- [ ] No first-person ("I can"), no second-person ("you can")
- [ ] No XML angle brackets (`<` `>`)

## Section 5 — SKILL.md body style (Stylistic)

- [ ] Body length ≤ 500 lines (Anthropic platform docs) / ≤ ~5,000 words (the longer-form PDF guide). When exceeded, split into `references/`.
- [ ] Voice: third-person imperative throughout. "Extract the text..." / "Run the script..." — not "I will" or "you should".
- [ ] Consistent terminology — pick one term per concept and use it throughout. No mixing of "API endpoint" / "URL" / "API route" / "path", no mixing of "field" / "box" / "element".
- [ ] No time-sensitive information embedded in main flow ("before August 2025, do X"). Deprecated info, if needed, lives in an `## Old patterns` section or a `<details>` block — never in the main path.
- [ ] References to long files include the file path explicitly. Direct links from `SKILL.md` to references — not chained references that point to other references.
- [ ] MCP tool names are fully qualified: `BigQuery:bigquery_schema`, `GitHub:create_issue`. Unqualified tool names risk "tool not found" errors when multiple servers are connected.
- [ ] No "you can use X, Y, Z, or W" without a default. Pick one default; offer alternatives only with a clear escape hatch ("for OCR, use X instead").
- [ ] Default assumption: Claude is already smart. The skill explains only what Claude doesn't already know. No paragraphs explaining what a PDF is, how Python imports work, what JSON is.

## Section 6 — Progressive disclosure (Opportunity)

The three-level loading model is the architectural reason for the `references/` directory. Misusing it bloats context unnecessarily.

- [ ] If the body approaches 300 lines, content is split into `references/` topic files
- [ ] References are loaded conditionally with explicit instructions ("Read [foo.md] when X"), not eagerly
- [ ] Each reference covers one cohesive topic — references are not grab-bag dumps
- [ ] Inline content in `SKILL.md` is what's needed *every time* the skill triggers; rare-path content is in references
- [ ] Scripts under `scripts/` are referenced for execution (`Run scripts/foo.py`), not pulled in as text — the runtime executes scripts without loading source

## Section 7 — Degrees of freedom (Opportunity)

Match instruction specificity to task fragility. Each major section in `SKILL.md` should be evaluated.

- [ ] **Fragile / irreversible / high-precision sections** use **low freedom**: exact commands, no interpretation room, "Do not modify the command".
- [ ] **Pattern-with-variation sections** use **medium freedom**: pseudocode, scripts with parameters, templates to customize.
- [ ] **Creative or judgment-heavy sections** use **high freedom**: describe the shape of the work, trust Claude on technique.
- [ ] No "Validate the data before proceeding" without a specific validator — replace with `Run scripts/validate.py --strict and address every error before continuing.`
- [ ] No vague verbs in fragile sections — they invite Claude to skip steps.

## Section 8 — Workflow patterns (Opportunity)

- [ ] Multi-step processes (3+ steps) include an explicit checklist Claude can copy and tick.
- [ ] Quality-critical outputs include a validate-fix-repeat loop (`Run validator → fix errors → repeat`).
- [ ] Conditional flows use explicit branching: `If creating new → A. If editing existing → B.` Never let Claude infer the branch.
- [ ] No ambiguous fallthroughs. After step N there should be a clear next step or a clear "you are done" signal.

## Section 9 — Scripts (Opportunity, when scripts exist)

- [ ] Scripts solve, do not punt. Errors are handled explicitly with informative output, not left to throw and let Claude figure out.
- [ ] No voodoo constants. Every numeric value either has a comment explaining why or is computed at runtime. `TIMEOUT = 47  # Why 47?` is a finding; `REQUEST_TIMEOUT = 30  # HTTP requests typically complete in 30s` is fine.
- [ ] Execution intent is explicit in the prose: `Run scripts/foo.py` (execute) vs `See scripts/foo.py for the algorithm` (read as reference). Never leave Claude to guess.
- [ ] Dependencies are documented when they are not part of the standard environment. The skill states `Install required package: pip install pypdf` rather than assuming.
- [ ] Error messages are written for the agent, not just for humans: include the *what*, the *why*, and the *how to fix*. `ERROR: file 'src/auth/login.ts' exceeds 200-line limit. Fix: split into login-handler.ts (HTTP) and login-service.ts (logic).`

## Section 10 — Anti-regression sanity check

Run this *before* finalizing each proposal in step 6 of the workflow.

For each proposed change, answer:

- [ ] Does this change preserve the meaning of the `description` field? If no → flag.
- [ ] Does this change preserve every trigger phrase, file type, and context the description currently lists? If no → flag.
- [ ] Does this change preserve every negative trigger ("Do NOT use for X")? If no → flag.
- [ ] Does this change preserve every script reference, every reference file pointer, every load-bearing example? If no → flag.
- [ ] Would the resulting skill itself violate any rule in sections 1–9 of this checklist? If yes → discard and reformulate.

A change that fails any of the first four is a `Medium` or `High` regression risk and must be confirmed by the user before applying. A change that fails the fifth is internally inconsistent — discard.
