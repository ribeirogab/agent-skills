# Checkpoint pause and resumption

Read for `/orchestrate checkpoint` or `/orchestrate <path/CHECKPOINT.md>`. A checkpoint is a short operational snapshot, not a replacement for the approved plan. It prepares a fresh session to continue without the previous chat. Saving it does not compact the chat, create another session, or authorize new delivery work.

## Save a checkpoint

1. Stop dispatching new work. Use the active delivery's confirmed root and `ORCHESTRATION.md`; without active context, check only the current root. Read the plan and confirm the delivery. If it is missing, unapproved, or ambiguous, keep execution paused and ask for the missing source or decision. Do not create a preparation draft as a checkpoint.
2. Pause executors at the nearest safe boundary and obtain their partial results. Confirm their state through available controls; a pause message alone does not prove they stopped. Preserve incomplete edits without requiring the current phase to finish. Inspect background commands, CI, deployments, and external writes already started. Record running or uncertain operations with identifiers and a read-only way to check them. Pausing the orchestrator does not cancel those operations; cancellation or rollback requires its own authority. If an executor cannot be stopped or accounted for, keep the checkpoint incomplete and report the limitation.
3. Apply the persistence rules below before writing either file. Inspect Git and reconcile the confirmed results, partial changes, pending gates, and external actions into `ORCHESTRATION.md`. Preserve approvals and history. Record a dated checkpoint identifier, its absolute path, and the checkpoint pause in `Next action` and `Decision history`. A voluntary pause is neither completion nor a human blocker; do not emit those tracking events for it.
4. Write `CHECKPOINT.md` with status `preparing` and the structure below. Use the same identifier as the plan and record the orchestration file's SHA-256 after its update. Keep the current snapshot short; place durable decisions in the plan and link detailed evidence instead of copying transcripts or logs.
5. Reread both files. Verify their identity, paths, approvals, partial work, executor states, outstanding operations, and next action against the observed state. Mark the checkpoint `ready` only when it is sufficient to resume without chat history. Otherwise retain `preparing` and explain what is missing.
6. Report the stopping point, confirmed work, remaining work, ongoing operations, and checkpoint path. When ready, give `/orchestrate <absolute-path-to-CHECKPOINT.md>` as the complete resume instruction and identify the worktree to use. **End the turn and wait.** Do not continue implementation or dispatch work after saving the checkpoint.

**Ready when:** controlled executors are paused or finished, all outstanding operations are accounted for, the plan and checkpoint are saved and verified, and the user has the resume instruction. A ready checkpoint can contain a running external operation or a documented blocker; neither counts as completed work.

## Persistence

Keep `CHECKPOINT.md` beside `ORCHESTRATION.md` at the confirmed primary root. Apply the plan's [persistence rules](orchestration-template.md) to both files, using `/CHECKPOINT.md` for the checkpoint's root ignore entry. Verify both are ignored and untracked; request authorization before removing either from the index. Preserve unrelated ignore rules.

Update an existing checkpoint only after confirming that it belongs to this delivery and preserving any still-relevant information in the plan. For an unrelated or unidentified file, explain the replacement impact and obtain confirmation before overwriting it. Keep only the current snapshot here; retain decision history and deferred work in the plan. Store references, not credentials or secret values.

These ignored files and uncommitted changes may be absent from another checkout. Resume in the recorded worktree. Moving to another worktree requires an explicit, verified transfer of the files and partial work; a matching branch or commit alone is insufficient.

## Checkpoint structure

Use `# Checkpoint` and these second-level sections. Record facts, unknowns, and required checks separately.

| Section | Content |
| --- | --- |
| Identity | Checkpoint identifier, timestamp with timezone, status (`preparing`, `ready`, or `resumed`), originating session reference when available, absolute plan path and saved SHA-256, spec identity, primary root, and any other repository paths. For each repository: branch or detached HEAD, commit, and worktree. |
| Position | Objective, approved destination, current phase, item, pipeline step, and exact stopping point. Reference the plan's approvals and restrictions; pending authorization stays pending. |
| Confirmed results | Concise completed work with revision-specific test, PR, CI, deployment, or other evidence references. Distinguish implemented, tested, reviewed, and deployed states. |
| Partial work | Staged, unstaged, and untracked files; each change's purpose and validation state. Identify unrelated user changes to preserve and local artifacts needed for resumption. Record implementation findings and failed approaches only when they affect the next steps. |
| Outstanding operations | Executor references and states, assigned work, partial-result locations, background commands, external jobs and uncertain writes. Include identifiers, last observed state and time, and how to check before repeating an action. Record `None` when empty. |
| Remaining work | Outstanding acceptance criteria, gates, dependencies, blockers, pending tracking actions, and permissions. Reference the canonical plan instead of reproducing its full inventory. |
| Next steps | First concrete action, its prerequisite checks, and the remaining sequence. Name the files, commands, or resources needed; avoid instructions that depend on remembering the old chat. |

## Resume from a checkpoint

1. Read the supplied checkpoint first. Resolve relative input paths against the current directory and validate the recorded absolute paths and delivery identity. Read the linked `ORCHESTRATION.md` and applicable project instructions. If a path is missing or points to a different delivery or worktree, ask for correction before mutation; do not silently substitute the current checkout or a different plan.
2. Treat the supplied path as a request to review the paused delivery for resumption. Preserve the approved plan, destination, tracking policy, and delegation policy. This request does not lift the checkpoint pause, approve a pending plan, supply missing initial start authorization, override cancellation or another unresolved user hold, or expand permissions.
3. Compare the checkpoint identifier, saved plan hash, and pause state with the current plan. Reconcile Git changes, partial work, relevant PRs and CI, deployments, external actions, and executor availability. A changed hash or a `preparing` or `resumed` snapshot requires reconciliation, not automatic rejection or restoration of old state. Use current evidence to correct progress and the plan to recover approved decisions. Read detailed evidence only as needed; do not reconstruct the old transcript. Resolve conflicts that affect scope, authority, or safe continuation with the user.
4. Confirm through read-only checks that no previous orchestrator or executor is still driving the same work. Query running or uncertain operations before proposing any retry, especially deployments and tracking writes. Identify the required hard gates, preserve user edits and completed actions, and determine whether executor replacement is permitted under the approved delegation policy. If exclusive control or an operation's result cannot be established, keep the affected work paused.
5. Before any delivery mutation, external action, executor dispatch, retry, or plan-file update, report in plain chat where the delivery stopped and the confirmed current state. Then list the next concrete steps in execution order, including prerequisite checks and gates. Ask `Posso iniciar a retomada?` directly in chat, without a selector, form, or question component. End the turn and wait for an explicit answer. A valid initial start authorization does not replace this checkpoint-resumption confirmation.
6. After explicit confirmation in chat, recheck any state that may have changed while waiting. Apply the persistence rules before writing. Record resumption, the current session reference when available, and the next verified action in `ORCHESTRATION.md`, then mark the checkpoint `resumed` with the date. The checkpoint remains a snapshot, not a live progress ledger. Continue at **5. Execute until the objective is met** in `SKILL.md`. If nothing can proceed, report the specific blocker and required action instead.

**Ready to ask when:** the correct worktree and approved delivery are verified, outstanding operations are reconciled or safely isolated, no competing executor owns the next work, and the ordered next steps are known. **Ready to execute when:** the user explicitly confirms resumption in chat and any state that could have changed during the wait is rechecked.
