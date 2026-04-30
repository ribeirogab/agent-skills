---
tags:
  - moc
---
# Learnings — Map of Content

Atomic notes about agent-skills's architecture, patterns, and gotchas. Categorized by tag.

Learnings here are specific to agent-skills. Code style conventions live in `[[conventions|Conventions MOC]]`.

## `#concept` — Architecture and patterns

- [[../learnings/harness-engineering-foundations|Harness engineering — the foundation behind this repo]] — the three articles (Anthropic, Fowler, OpenAI) that define what a skill in this repo *is* and how to author one.
- [[../learnings/agents-md-as-map-not-encyclopedia|AGENTS.md is a map, not an encyclopedia]] — keep root agent instructions ~100 lines and point into `context/`; the four failure modes of the monolithic approach.
- [[../learnings/mechanical-enforcement-over-prose|Mechanical enforcement beats prose rules]] — runnable checks > written rules; feedforward + feedback; embed remediation in error messages.
- [[../learnings/generator-evaluator-separation|Always separate the generator from the evaluator]] — agents praise their own work; ship a calibrated evaluator for any skill that produces subjective output.

## `#reference` — Environment and commands

_No references yet._

## `#gotcha` — Things that tripped us up

_No gotchas captured yet. Add the first one when you hit a repeatable surprise._
