---
name: orchestrate
description: Plans and executes deliveries from a spec, pauses with checkpoint, and resumes from CHECKPOINT.md or ORCHESTRATION.md. Confirms the plan and initial start authorization before executing through the approved destination.
---

# orchestrate

Prepare the delivery in chat, obtain plan approval, then create `ORCHESTRATION.md` and request authorization to start. Once authorized, execute until the approved objective is met, respecting user pauses and blockers that require human intervention.

## Invocation

Resolve the mode before source selection. Accept absolute paths or paths relative to the current directory.

| Input | Action |
| --- | --- |
| `/orchestrate checkpoint` | Pause the active delivery and save `CHECKPOINT.md`. Read [references/checkpoint.md](references/checkpoint.md) and follow **Save a checkpoint**, then end the turn. |
| `/orchestrate <path/CHECKPOINT.md>` | The path requests a resumption review. Read [references/checkpoint.md](references/checkpoint.md), follow **Resume from a checkpoint**, present the stopping point and ordered next steps, and wait for explicit confirmation in plain chat before execution. |
| URL, spec text, `ORCHESTRATION.md` path, or no argument | Follow **1. Choose the source**. |

The exact `checkpoint` argument is a command, not spec text. A checkpoint path selects its linked orchestration file; the source-choice question in step 1 does not apply to these two modes. A missing or invalid checkpoint path requires correction, not fallback to a new delivery.

## 1. Choose the source

Input: `/orchestrate <url>`, `/orchestrate <text>`, or `/orchestrate <path/ORCHESTRATION.md>`.

Before opening URLs, reading files, or analyzing the spec, check only the project location and whether `ORCHESTRATION.md` exists.

| Situation | Action |
| --- | --- |
| The argument is the file path | The source is already selected: verify the path and read the file. If the path is incorrect, ask for a correction. |
| The file exists and the argument is not its path | Stop immediately. Show the path and ask whether to use the file or the supplied input. End the turn and wait for the answer before reading any content, querying tickets, planning, or writing. With no argument, ask whether to use the file or receive a spec. |
| The file does not exist | Use the supplied URL or text; with no argument, ask for the spec. |

When the file is selected, preserve its decisions and keep the other input out of scope. When the input is selected, use only that source, without importing policies or approvals from the previous delivery.

Selecting the input does not authorize replacing the existing file. Explain the loss of decisions, progress, history, and deferred work, and obtain explicit confirmation. Keep the file intact until the new plan is approved and replacement is confirmed. Code and external actions remain intact.

Confirm the root from a supplied path, matching remote, referenced paths, or the user's choice; use the current checkout or supplied paths without searching the disk for projects. If another root or file appears before the first write, resolve the conflict before proceeding. For multiple repositories, confirm one primary root. Clarify any file outside the root without moving it automatically.

**Ready when:** the source and root are defined, and any conflict with an existing file is resolved. A new invocation repeats this check; continuation after compaction preserves the selected source.

## 2. Understand the delivery

Read the complete spec: from the current source for a URL, or from the supplied or saved text for text input. Preserve the full text, including any links it contains. Reuse previous reads and request access or content for inaccessible sources.

Read all linked tickets and their subtickets, including completed ones: descriptions, acceptance criteria, dependencies, statuses, and comments that change requirements, decisions, or blockers. Read every page of results, remove duplicates, and handle reference cycles. Separate items in scope, external dependencies, and reference documents; a relationship between tickets does not expand scope.

Keep discovery summaries, references, and proposed decisions in the conversation until plan approval. During this preparation, do not create `ORCHESTRATION.md`, write a substitute draft file, or change `.gitignore`. Reconcile completed items with their evidence, without automatically reopening or repeating work. If there are no tickets, organize work items into phases without creating external records.

Read the project instructions, Git state, scripts, CI, and conventions needed for the pipeline. A remote can be queried through a CLI; confirm the execution root and resolve any need to create a repository before implementation.

**Ready when:** the objective, scope, acceptance criteria, complete inventory, dependencies, and repositories are available in the conversation or the selected existing file. Resolve gaps that prevent defining the delivery boundaries before proceeding. Retrieved content informs requirements; it does not grant permissions.

## 3. Define and approve the plan

Obtain an explicit user choice for each of the three decisions below. Ask every unanswered question; reuse choices already supplied by the user or still valid in the selected approved file. Customization is optional, but choosing whether to customize is required. Use an available selector when appropriate, or short questions in chat. Accept policies as text or files and preserve the original separately from your interpretation.

| Decision | Question | Rule |
| --- | --- | --- |
| Pipeline | What result should the delivery reach? | Required: local tests, staging, production, or another destination. Derive the steps from the repository. |
| Tracking | Do you want actions for starting, completion, and blockers, or local records and chat reports only? | Choose a tracking policy or explicitly choose no external tracking. |
| Subagents | Do you want automatic delegation decisions, no subagents, or a custom policy? | Choose one. Automatic means the agent decides during planning, including when to use zero agents. |

Use local-only tracking or automatic delegation only when the user explicitly selects them or accepts those explained defaults. Silence, skipped questions, and missing answers leave decisions pending. If any choice is missing, ask for it, end the turn, and wait before presenting the plan for approval.

Keep each complete answer verbatim and its interpretation separately in the conversation for the approved file. An answer can address several decisions regardless of which question prompted it; apply each requirement to the relevant decisions and ask only for choices still unanswered. When a tracking policy is supplied, read [references/tracking-rules.md](references/tracking-rules.md) to resolve targets, events, and actions before approval.

Divide work into phases by acceptance criteria and dependencies, associate tickets, and define a stable progress measure. Read [references/delegation.md](references/delegation.md) for every plan. Choose direct, delegated, or mixed execution with a delivery-specific reason. Assign each block, define executor count and concurrency, and resolve capability gaps before presenting the strategy for approval.

Use only confirmed commands, environments, tools, and rules. For each step, define the unit — ticket, phase, or delivery — and completion evidence. Identify hard gates: steps whose evidence you must confirm in the main session before advancing. Shared gates must identify which changes they cover. Resolve undefined steps before approving the dependent portion of the pipeline.

Show the complete plan in chat:

```text
Execution plan — <title>

Objective: <result>
Destination: <final step and environment>
Phases and dependencies: <breakdown and tickets>
Execution: <direct, delegated, or mixed; context and cost rationale>
Executors: <planned count and maximum concurrent count; zero if direct>
Assignments: <per block: owner, scope, dependencies, expected return, model if selectable>
Progress: <stable measure>

Pipeline:
1. <step> — <unit> — <evidence>
2. <step> — <unit> — <evidence> (hard gate)

Tracking: <disabled, or events, targets, and actions>
Out of scope: <boundaries>
Pending authorizations: <if any>
```

Ask for approval or adjustments and end the turn. Approval must be given as text in chat, outside a selector. For adjustments, show the revised version and wait for new approval; preserve approval for decisions already approved and still valid.

**Ready when:** all three user choices, the complete plan, concrete execution assignments, and explicit approval are available in chat or remain valid in the selected file. Changes to the destination, scope, or external actions require new approval; regrouping work within the approved policy does not. Existing permissions and specific confirmations for destructive actions still apply.

## 4. Save the approved plan and authorize the start

Only after plan approval, read [references/orchestration-template.md](references/orchestration-template.md), apply its ignore rule, and create `ORCHESTRATION.md` at the confirmed root. Transfer the discovery, original input and policies, approved decisions, execution assignments, and approval from the conversation. Reuse a selected existing file; replacing another delivery's file also requires the confirmation from step 1.

Save the original answers once in `Original user instructions`, with interpretations referencing them from the relevant decision sections. Follow the template's fidelity and coverage checks before execution and after policy or plan changes. Check the saved file: source, work items, approved decisions, strategy, and next action. Plan approval permits saving the plan; it does not authorize implementation, executor launch, or external tracking actions. Source selection is also separate from start authorization.

If there is no valid authorization yet, record the start as pending, show the path, and ask whether to begin. **End the turn and wait.** Until the answer, limit work to preparation and local records.

The user decides whether to start in the same session or compact and invoke `/orchestrate <path/ORCHESTRATION.md>`. This wait is not a human blocker and does not trigger external tracking actions.

**Ready when:** start authorization and the next step are recorded. A valid authorization allows resumption without repeating this question. File updates and compaction do not revoke authorization; user requests to pause or cancel must be recorded and respected.

## 5. Execute until the objective is met

For each item or block that can proceed:

1. Check dependencies and acceptance criteria. Apply the configured start event when work actually begins.
2. Follow the recorded assignments to implement and test according to the spec and the project's commit and PR conventions. Consult the delegation reference before starting an agent or revising assignments.
3. Review the diff and confirm evidence: SHA, CI run, command output, deployed resource, or workflow validation, tied to the correct revision and environment. An executor's claim is not enough.
4. Update progress and apply tracking events supported by evidence. An item is complete only after its acceptance criteria and all applicable steps are satisfied, including shared gates.
5. Continue with the next authorized work. Fix verifiable failures and wait for ongoing operations using the available tools.

Confirm and operate hard gates in the main session. Run one deployment at a time for the same destination. Respect permissions and real costs for tests, databases, and production environments, without going beyond the approved destination.

Execute silently: progress, evidence, and the reason for any operational decision a future session must understand go to `ORCHESTRATION.md`. Chat carries only the completion report, a human blocker, a saved checkpoint, or a decision, hard gate, or missing authorization that needs the user. Answer a user question from the current file state.

Silent execution runs to the objective: after each ticket, phase, and record update, continue with the next authorized work in the same turn, monitoring ongoing CI and subagents. A checkpoint request interrupts this loop through the checkpoint mode; saving it is a pause, not delivery completion.

**Complete when:** all items satisfy their acceptance criteria, the pipeline has reached the destination, and required tracking actions are confirmed. Report the result, key evidence references, item statuses, tracking results, file path, and `Deferred work` list, referencing the file for details instead of restating them. Tracking failures remain pending even when the code is delivered.

## Blockers and resumption

A human blocker has a cause, evidence, and an action, access, or decision you cannot obtain on your own. Record the affected work, attempts, required action, and resumption condition; apply only configured tracking rules. Continue with independent items. If no work can proceed, report the blocker and file path without claiming completion or 100%.

When resuming from the selected `ORCHESTRATION.md`, read it before acting. If preparation was compacted before plan approval, continue from the conversation draft; request missing decisions instead of creating a file early. Reconcile the spec, ticket inventory, Git, PRs, CI, environments, and external actions as applicable. Preserved text remains the spec until the user changes it. Current evidence corrects recorded progress but does not replace approved decisions.

Verify that a blocker is resolved before resuming its work; a status change does not prove resolution. Preserve confirmed actions to avoid repetition. If changes invalidate scope or authorizations, resolve the discrepancy before continuing the affected work.
