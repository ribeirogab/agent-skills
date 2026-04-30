---
tags:
  - learning
  - concept
related:
  - "[[agents-md-as-map-not-encyclopedia]]"
  - "[[mechanical-enforcement-over-prose]]"
  - "[[generator-evaluator-separation]]"
created: 2026-04-30
---
# Harness engineering — the foundation behind this repo

Every skill in `agent-skills/` is, by definition, a *harness* in the technical sense formalized by three 2025-2026 essays. Treat this not as a buzzword but as the load-bearing frame: when you author a new skill (or modify an existing one), the questions you ask come from this literature.

## Context

Discovered while documenting the philosophy behind the existing `harness/` skill. The author asked the AI to read three sources line-by-line and capture what was load-bearing. These three are the canonical references and should be re-read before any large redesign of how skills here are structured:

- **Anthropic — Harness Design for Long-Running AI Agent Apps** (https://www.anthropic.com/engineering/harness-design-long-running-apps)
- **Martin Fowler — Harness Engineering for Coding Agent Users** (https://martinfowler.com/articles/harness-engineering.html)
- **OpenAI — Harness Engineering: Leveraging Codex in an Agent-First World** (https://openai.com/index/harness-engineering/)

## How It Works

The three articles converge on one definition and seven principles. **Definition (Fowler):** `Agent = Model + Harness`. The harness is everything *except* the model — guides, sensors, scaffolding, contracts, evaluators, schedulers, sandboxes.

Seven principles all three articles agree on:

1. **Decomposition + structured handoffs.** Break long work into small chunks. Hand state off between chunks via durable artifacts (files), not via the chat context. (Anthropic: spec → plan → tasks. OpenAI: `docs/exec-plans/active/`.)
2. **Map, not encyclopedia.** A short root entry point (`AGENTS.md` ~100 lines) that *points* into a structured knowledge directory. One giant instructions file fails predictably — context crowding, "everything is important means nothing is", silent rot, no mechanical verification. See `[[agents-md-as-map-not-encyclopedia]]`.
3. **Repository is the system of record.** "Anything the agent doesn't have in-context effectively doesn't exist" (OpenAI). Tribal knowledge, Slack threads, Google Docs are invisible. Push everything load-bearing into the repo as markdown.
4. **Reset, not compaction.** When a long task fills the window, a fresh agent with a structured handoff beats summarizing-in-place. Compaction leaves "context anxiety" intact (Anthropic).
5. **Separate the generator from the evaluator.** Agents reliably praise their own work. Ship a calibrated evaluator with explicit grading criteria. See `[[generator-evaluator-separation]]`.
6. **Mechanical enforcement over prose.** Prose rules in `SKILL.md` get pattern-matched and ignored. Runnable checks (linters, validation scripts, structural tests) fire deterministically and can carry their own remediation instructions in error messages. See `[[mechanical-enforcement-over-prose]]`.
7. **Garbage collection is continuous, not periodic.** Drift is inevitable in agent-driven repos. Manual cleanup does not scale (OpenAI's team burned a Friday/week before automating it). Encode taste once as "golden principles", then run background sweepers that open auto-mergeable refactor PRs.

Two more principles each article adds individually that are worth absorbing:

- **Iterative simplification (Anthropic).** Every harness component encodes an assumption about what the model can't do alone. Models improve. Stress-test your scaffolding by removing pieces — keep only what is still load-bearing.
- **Variety reduction / Ashby's Law (Fowler).** A harness only regulates what it has a model of. Reducing the surface area of what the agent can do (committing to topologies, layered architectures, narrow tool sets) is what makes harnesses tractable.

## Note on scope

These principles describe the *agent harness pattern* — the runtime scaffolding around a model. They are the basis for what the existing `harness/` skill scaffolds into target repos (the `context/` vault, AGENTS.md, spec flow, evaluator command, sweeper). They are **not** guidance for how Claude Code skills themselves should be authored — that is a separate platform concern (SKILL.md format, references layout, scaffold conventions) and is governed by docs/best-practices the author will introduce separately.
