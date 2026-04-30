---
tags:
  - learning
  - concept
related:
  - "[[harness-engineering-foundations]]"
created: 2026-04-30
---
# Mechanical enforcement beats prose rules

When designing a skill, prefer a runnable check (validation script, linter, structural test) over a prose rule in `SKILL.md`. Prose rules get pattern-matched and ignored under context pressure. Mechanical checks fire deterministically and can carry their own remediation instructions in their error messages.

## Context

Synthesized from Martin Fowler's harness-engineering article (the feedforward/feedback split, the computational/inferential modalities) and OpenAI's Codex post (their custom lints "inject remediation instructions into agent context" via the error message itself). Both articles independently arrived at the same insight — and the existing `harness/` skill already partially implements it via `references/validation.md` (Phase 5 — 13 deterministic checks).

## How It Works

Fowler's frame:

- **Feedforward (guides):** anticipate and prevent unwanted behavior *before* the agent acts. Examples: docs, AGENTS.md, the rules section of a SKILL.md. **Failure mode:** rules encoded but never validated. Drift goes invisible.
- **Feedback (sensors):** observe *after* the agent acts and trigger self-correction. Examples: linters, structural tests, validation scripts, mutation testing. **Failure mode:** if used alone (without guides), the agent keeps making the same mistakes.
- **The two are complementary.** Feedforward-only or feedback-only both fail.

Fowler's second axis — **computational vs. inferential**:

- **Computational** (deterministic, milliseconds, cheap): bash check, regex, type checker, structural test. *Use whenever possible.*
- **Inferential** (LLM-driven, slower, probabilistic): semantic review by a calibrated agent. Use only when the check is genuinely semantic.

OpenAI's specific innovation: when a custom lint fires, the **error message itself contains remediation instructions for the agent**. The lint is not a gate — it is a teacher. Example shape:

```
ERROR: file `src/auth/login.ts` exceeds the 200-line module limit.
Fix: split into `login-handler.ts` (HTTP) and `login-service.ts` (logic).
See `context/conventions/file-size-limits.md` for rationale.
```

When the agent reads this message, it has both the violation and the remediation in-context simultaneously.

## Note on scope

This note describes a principle the existing `harness/` skill embodies (its Phase 5 validation is the canonical example). It is **not** a prescription for how Claude Code skills should be authored — that is a separate platform concern.
