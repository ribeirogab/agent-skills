---
tags:
  - learning
  - concept
related:
  - "[[harness-engineering-foundations]]"
  - "[[mechanical-enforcement-over-prose]]"
created: 2026-04-30
---
# Always separate the generator from the evaluator

When a skill in this repo produces *subjective* output — a spec, a design, a plan, a piece of writing — it must ship a separate evaluator. Asking the same agent that wrote the artifact to also grade it produces predictable false positives: agents reliably praise their own work, even when the quality is obviously mediocre to a human.

## Context

Anthropic's harness-design article documented this in detail using a long-running coding harness experiment. Their finding: "When asked to evaluate work they've produced, agents tend to respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre. This problem is particularly pronounced for subjective tasks like design." OpenAI corroborated indirectly via their multi-agent review loop ("Codex requests additional specific agent reviews both locally and in the cloud, respond to any human or agent given feedback, and iterate in a loop until all agent reviewers are satisfied").

This is why this repo ships `/harness-review-spec` as a *separate* command from `harness-brainstorming` — not as an afterthought.

## How It Works

The pattern Anthropic documented and that the `harness/` skill follows:

1. **Generator and evaluator are distinct agents** (in this repo: distinct skills/commands). They do not share a system prompt.
2. **The evaluator has explicit, written grading criteria.** Anthropic used four for frontend design (design quality, originality, craft, functionality). This repo's `/harness-review-spec` uses constitutional principles + spec-template invariants + vault duplicate-detection.
3. **The evaluator is calibrated with few-shot examples.** Anthropic: "I calibrated the evaluator using few-shot examples with detailed score breakdowns. This ensured the evaluator's judgment aligned with my preferences, and reduced score drift across iterations." This repo's evaluator is currently calibrated only via written rules — adding example pass/fail spec snippets to `/harness-review-spec` would harden it further.
4. **The evaluator interacts with the live artifact when possible.** Anthropic used Playwright MCP so the evaluator could *drive* the page being graded, not just read static output. For specs, the analog is reading the actual file plus searching the vault for duplicates — `harness-recall` is the equivalent affordance.
5. **The contract is negotiated upfront.** Before generation begins, the evaluator and generator agree on what "done" looks like. In this repo, the spec template's `## Acceptance Criteria` section *is* the contract — and `/harness-review-spec` rejects specs without measurable criteria for exactly this reason.

Anthropic's anti-pattern, named directly: **"Out of the box, Claude is a poor QA agent. In early runs, I watched it identify legitimate issues, then talk itself into deciding they weren't a big deal and approve the work anyway."** Do not let a single agent both produce and bless its output.

## Note on scope

This note describes the generator/evaluator pattern as it appears in the existing `harness/` skill (where `harness-brainstorming` and `/harness-review-spec` are deliberately separate). It is **not** a prescription for how new Claude Code skills should be designed — that is a separate platform concern.
