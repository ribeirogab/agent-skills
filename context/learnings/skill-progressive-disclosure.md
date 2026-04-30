---
tags:
  - learning
  - concept
related:
  - "[[../conventions/skill-directory-layout]]"
  - "[[../conventions/skill-md-style]]"
created: 2026-04-30
---
# Progressive disclosure — the three-level loading model for skills

A Claude skill is loaded into context in three discrete levels. Understanding which level loads what (and when) is the difference between an authored skill that works and one that bloats the context window or fails to trigger. This is the architectural model that the directory layout in `[[../conventions/skill-directory-layout]]` is designed to serve.

## Context

Discovered while reading Anthropic's *Skill authoring best practices* and *The Complete Guide to Building Skills for Claude* (PDF, Chapter 1 "Fundamentals — Core design principles"). Both sources describe progressive disclosure identically — it is the canonical mental model for how skills consume context.

## How It Works

The three levels:

| Level | What loads | When it loads | Cost |
|---|---|---|---|
| **1. YAML frontmatter** (`name`, `description`, optional metadata) | Concatenated across **all** installed skills, into the system prompt | At conversation start | Always paid — every skill costs ~50–200 tokens here |
| **2. SKILL.md body** | The body of *one* skill | Only when Claude decides the skill is relevant to the current task | Paid only when the skill triggers |
| **3. Linked files** (`references/`, `scripts/` source, `assets/` content) | A single linked file | Only when `SKILL.md` explicitly tells Claude to read or run it | Paid only when needed during the task |

What this model implies for authoring:

1. **Level 1 is the most contested resource.** Every skill on the system shares the system prompt's context budget. The `description` field is the *only* thing Claude sees from your skill at level 1, and it has to do all the discovery work. This is why the description rules in `[[../conventions/skill-md-style]]` are so strict.

2. **Level 2 is paid in full when triggered.** A 500-line `SKILL.md` body costs ~3–5k tokens *every time* the skill triggers, even for a one-line task. This is why Anthropic caps the recommended body at **500 lines / ~5000 words** and pushes everything else into level 3.

3. **Level 3 is free until used.** A 50k-line reference doc in `references/` costs **zero** tokens until `SKILL.md` directs Claude to read it. This is the load-bearing payoff: comprehensive expertise can be bundled with a skill without bloating context.

4. **Scripts can stay at level 3 even when executed.** Anthropic's runtime can run `scripts/foo.py` via bash without loading its source into context — only stdout/stderr are consumed. So utility scripts are essentially free token-wise, and they're more reliable than asking Claude to write the code from scratch.

The model fails when authors collapse it:

- **Inline what should be in `references/`** — body bloats, every trigger pays the cost.
- **Reference what should be inline** — Claude doesn't follow the link if it's not load-bearing for the current step.
- **Nest references** (`references/topic/sub.md`) — Claude partial-reads (`head -100`) and misses content past the preview window.
- **Bury triggers** in the body instead of the description — the skill never triggers because level 1 doesn't know it should.

## Note on scope

This describes the loading model for Claude skills specifically (level 1/2/3 as defined by Anthropic). It is conceptually similar to but distinct from the "map, not encyclopedia" frame for `AGENTS.md` covered in `[[agents-md-as-map-not-encyclopedia]]` — that note is about a single repo-root file, this one is about how multiple skills compete for context.

## Source

Anthropic platform docs — *Skill authoring best practices*, "Core principles" → "Concise is key" and "Progressive disclosure patterns"; *The Complete Guide to Building Skills for Claude* (PDF), Chapter 1 "Fundamentals — Core design principles".
