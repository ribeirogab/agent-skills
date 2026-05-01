---
description: Manual garbage-collection pass over the context/ vault — orphans, broken links, stale specs, uncited rules
argument-hint: <optional: scope filter — learnings, specs, rules, conventions, all (default)>
---

# Sweep — Vault Garbage Collection

Manual sweep of the `context/` vault to surface drift that the harness audit does not catch: orphan notes, broken cross-references, shipped-but-still-draft specs, and rules nobody cites.

This command **never deletes or rewrites** anything on its own. It produces a report and asks the user, item by item, what to do.

**Announce at start:** "Sweeping the vault for drift..."

## Scope

If `$ARGUMENTS` is empty or `all`, run every check below. Otherwise restrict to one of: `learnings`, `specs`, `rules`, `conventions`.

## Checks

### 1. Orphan learnings (no inbound wikilinks)

A learning that no other file links to is invisible to the agent — the vault is wikilink-traversed, and an unlinked note will never surface.

The regex must match wikilinks regardless of optional path prefix (`[[../learnings/foo]]`) or display-text suffix (`[[foo|display]]`) — Obsidian and the canonical vault scaffold use both styles.

```bash
for f in context/learnings/*.md; do
  base=$(basename "$f" .md)
  # Match [[base]], [[base|...]], [[base#anchor]], or [[<any-path>/base...]]
  hits=$(grep -rlnE --include='*.md' --exclude-dir=learnings \
    "\[\[([^]|#]*/)?${base}([]|#])" context/ 2>/dev/null | wc -l | tr -d ' ')
  [ "$hits" = "0" ] && echo "ORPHAN: $f"
done
```

For each orphan, ask the user one of:
- **Keep** — propose a MOC entry under `context/_index/learnings.md`.
- **Merge** — point at a related note to merge into.
- **Archive** — move to `context/learnings/_archive/` (do not delete).

### 2. Broken wikilinks

A wikilink whose target file does not exist breaks the navigation contract.

Resolve targets Obsidian-style: strip the path prefix and search the vault for any file or directory whose basename matches. Skip files inside `templates/` and `_template/` — those legitimately use placeholder wikilinks like `[[plan]]`, `[[spec]]`, `[[related-note]]`, `[[wikilinks]]` that are filled in when the template is copied.

```bash
grep -rohE --include='*.md' --exclude-dir=templates --exclude-dir=_template \
  '\[\[[^]|#]+' context/ 2>/dev/null \
  | sed 's/\[\[//' | sort -u \
  | while read -r target; do
      [ -z "$target" ] && continue
      base="${target##*/}"
      base="${base%/}"
      [ -z "$base" ] && continue
      # Search the whole vault for a matching file or directory basename
      found=$(find context/ \( -name "$base.md" -o \( -type d -name "$base" \) \) -print -quit 2>/dev/null)
      [ -z "$found" ] && echo "BROKEN: [[$target]]"
    done
```

For each broken link, locate the source file with `grep -rln "\[\[$target" context/` and ask the user whether to fix the target name or remove the link.

### 3. MOC entries pointing nowhere

`context/_index/*.md` files list notes by topic. An entry whose target was renamed or archived is a stale MOC line.

Same Obsidian-style resolution as check 2.

```bash
for moc in context/_index/*.md; do
  grep -oE '\[\[[^]|#]+' "$moc" 2>/dev/null | sed 's/\[\[//' | while read -r t; do
    [ -z "$t" ] && continue
    base="${t##*/}"
    base="${base%/}"
    [ -z "$base" ] && continue
    found=$(find context/ \( -name "$base.md" -o \( -type d -name "$base" \) \) -print -quit 2>/dev/null)
    [ -z "$found" ] && echo "STALE in $(basename "$moc"): [[$t]]"
  done
done
```

Ask the user per entry whether to update or remove.

### 4. Constitution rules nobody cites

A rule in `context/constitution.md` that no spec, learning, convention, or rule file references is either too universal to need citing — or it is dead weight nobody remembers.

Identify rules by their headings (`## ` or `### `) inside the constitution. For each, search the rest of the vault for the rule's slug or a paraphrase. Report the rules with **zero hits**.

This is a **WARN**, not a delete prompt. Ask the user to: keep as-is, rephrase to be more memorable, or move to `context/_archive/constitution-history.md`.

### 5. Specs done in `tasks.md` but still `status: draft`

A spec where every task is checked but the frontmatter still says `draft` is a missed bookkeeping step — the vault thinks the work is in flight when it shipped weeks ago.

The glob `context/specs/[0-9]*-*/` aborts the entire script under zsh's default `nomatch` setting when no spec folders exist yet — collect matches with `find` instead, which handles the empty case silently.

```bash
find context/specs -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-*' 2>/dev/null | while read -r spec_dir; do
  tasks="$spec_dir/tasks.md"
  spec="$spec_dir/spec.md"
  [ -f "$tasks" ] && [ -f "$spec" ] || continue
  unchecked=$(grep -cE '^\s*-\s*\[ \]' "$tasks" 2>/dev/null || echo 0)
  status=$(awk '/^---$/{n++; next} n==1 && /^status:/{print $2}' "$spec")
  if [ "$unchecked" = "0" ] && [ "$status" != "shipped" ]; then
    echo "STALE STATUS: $spec_dir (status: $status, all tasks done)"
  fi
done
```

For each, ask the user: mark `shipped` (and prompt for a `shipped: YYYY-MM-DD` date) or explain what is still open.

### 6. Empty MOC sections

A section heading in a MOC with zero entries is an unsigned promise. Either the category is unused (remove) or notes were misfiled (move).

A section is "empty" when it has no content other than the heading itself. Content is any non-blank line that is not a heading and is not a single italics-only placeholder line such as `_(none yet)_` (the canonical scaffold writes those into newly-created MOC categories — they signal the category is reserved but unused).

```bash
for moc in context/_index/*.md; do
  awk '
    /^## /{
      if (h && c == 0) print FILENAME ": " h
      h=$0; c=0; next
    }
    /^[[:space:]]*$/{ next }
    /^_[^_].*_[[:space:]]*$/{ next }
    { c++ }
    END{ if (h && c == 0) print FILENAME ": " h }
  ' "$moc"
done
```

The check now treats prose paragraphs as legitimate content (so a MOC section that is one paragraph of intro text is no longer flagged), while still surfacing sections that contain only `_(none yet)_` placeholders.

WARN-level — ask the user before any change.

## Output format

```
## Sweep Report

### Orphan learnings (3)
- `learnings/oauth-token-rotation.md` — proposal: link from `_index/learnings.md` under "Auth"
- `learnings/old-cron-trick.md` — proposal: archive (last touched 2025-08, superseded by `learnings/scheduled-tasks.md`)
- ...

### Broken wikilinks (1)
- `specs/2026-02-12-checkout-revamp/spec.md:47` references `[[learnings/payment-idempotency-OLD]]` — file not found

### Stale MOC entries (0)
PASS

### Uncited constitution rules (2)
- "## Rule of Currency" — zero references in vault
- "## Rule of No Attribution" — zero references in vault

### Specs with stale status (1)
- `specs/2026-01-08-rate-limit/` — all tasks done, status still `draft`

### Empty MOC sections (1)
- `_index/conventions.md`: ## Tooling — no entries

### Summary
14 findings across 6 categories. Walk through them?
```

After the table, walk the user through each finding **one item at a time** and apply the chosen action. Stop on user request. Do not batch-apply.

## Key rule

This command is **manual, never scheduled**. The vault is a curated artifact — automated cleanup would silently rewrite the user's knowledge base. Every action is gated by an explicit yes from the user.
