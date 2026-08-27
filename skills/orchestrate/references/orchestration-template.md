# ORCHESTRATION.md

Read before the first write. Keep a single file with this name at the confirmed project root; for multiple repositories, record the other paths in it.

## Persistence

Before creating or updating the file, ensure `/ORCHESTRATION.md` is in the root `.gitignore`, without duplicating the entry or changing other rules. Verify that the file is ignored and untracked; keep it out of commits. If it is already tracked, request specific authorization to remove it from the index; the ignore rule alone is insufficient. If Git is not initialized, keep the rule and verify it after creating the repository.

Update the file after discovery, decisions, start authorization, steps, external actions, blockers, and before returning control. Record pauses and cancellations. Preserve policies and approvals; use references for logs and evidence without storing credentials.

## Structure

Use `# Orchestration` as the title and the sections below as second-level headings. Fill them with facts and mark proposals as pending.

| Section | Content |
| --- | --- |
| Spec | URL or full text; objective, scope, exclusions, acceptance criteria, root, repositories, and source versions. Inventory of tickets and subtickets with links, relationships, and dependencies; separate external references and gaps. Without tickets, record work items. |
| Approved decisions | Divide into Pipeline, Tracking rules, Subagents, and Start authorization. Record effective decisions, original policies, approved interpretations, boundaries, confirmed capabilities, dates, and user answers. Separate plan approval from start authorization. |
| Execution strategy | Phases, dependencies, direct execution or delegated blocks, reasons, and a stable progress measure. Include agent references and check their availability when resuming. |
| Progress | Per item: external status, step, result, revision or resource, and evidence. Keep external status separate from technical progress. |
| Blockers | Affected work, cause, evidence, attempts, human action, resumption condition, tracking, and independent work that can proceed. |
| Next action | Next concrete action, ongoing operations, pending checks and authorizations, with a date. Before starting, record the wait for authorization; afterward, the next step that can proceed. |
| Decision history | Date, change, reason, and approval. Preserve previous decisions; keep current decisions in Approved decisions. |
| Deferred work | Findings outside scope: what they are, where they are, and why they were excluded. Record them when discovered; keep acceptance criteria and pipeline failures in Progress or Blockers. |

In `Progress / Tracking actions`, record external intents and results: resource, event and evidence, action, result, external reference, and next action. Distinguish pending, confirmed, and uncertain states.

Keep `Deferred work` only in this file, excluded from the progress percentage and without expanding scope. Publish the list externally only under a confirmed rule. Deleting the file also removes these deferred items.
