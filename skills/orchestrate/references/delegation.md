# Delegation by context and cost

Read for every execution plan, before starting a subagent, or when revising assignments.

## Decide

Choose direct, delegated, or mixed execution during planning. Automatic is a preference that requires a concrete decision, not a decision deferred until execution. With `no subagents`, or when the environment lacks this capability, keep work in the main session and state the constraint.

Prioritize preserving the orchestrator's context. Assess the cumulative reading, implementation detail, logs, and correction cycles across the delivery, not just the size of each ticket. Favor delegation for substantial implementation or investigation with clear boundaries when it keeps that detail out of the main session. Account for the context needed to brief, monitor, review, and correct the executor; delegation must provide a useful reduction.

Context preservation alone can justify delegation, even without a cheaper model. When model selection is available, choose the cheapest capable model allowed by the user's policy. Compare total work, including coordination and review: a cheaper model reduces cost per token, but delegation can increase token count. Use confirmed capabilities without inventing model options or savings.

| Work | Preference |
| --- | --- |
| Small change already understood, with little investigation and low cumulative context use | Direct execution |
| Architecture or ambiguous requirements needing a decision | Main session decides; assign subsequent implementation separately |
| Repetitive implementation with a clear pattern and acceptance criteria | Block delegated to a capable, cheaper model |
| Substantial implementation, extensive reading, or bounded investigation with a concise return | Delegation to preserve context |
| Context transfer and review would consume as much context as direct work | Direct execution, with a concrete reason |

## Plan the assignments

Before plan approval, specify:

- Execution mode and a reason tied to this delivery's context and cost.
- Each block's owner, scope, repository or file boundaries, dependencies, and expected return.
- Planned executor count, maximum concurrent count, and which executor will continue across related phases. Use zero for direct execution.
- Confirmed model choices when selectable; otherwise state the capability limit.

Use planned executor labels before launch; create agents only after start authorization. A generic condition such as "delegate if useful" does not complete the strategy. For direct execution, explain why the full delivery can stay in the main session or which constraint prevents delegation.

## Assign and review

Group related work, including multiple phases, without assigning one agent per ticket, layer, or phase. Reuse the executor for corrections and continuations in the same context. Delegation does not require parallelism: one executor can handle sequential phases. Parallelize only independent work with compatible write boundaries whose benefit justifies the cost.

Provide the block's requirements, boundaries, dependencies, interfaces, acceptance criteria, checks, and references without copying the entire conversation. Require a concise summary, changes, diff or commits, evidence, risks, and pending work, with references to details. Review the diff and confirm required evidence through targeted reads; consult full logs or repeat investigation only when gaps or conflicting evidence require it.

Executors perform their assigned work without starting other agents. The main session makes decisions, reviews, operates hard gates, and controls tracking writes. Return corrections to the same executor while its context remains useful.

Keep review in the main session, without automatically adding a reviewer or critic. If a gate requires independent review that conflicts with preferences or available capabilities, resolve the conflict with the user before proceeding.

## Revise the strategy

Use the recorded assignments as the starting point. When discoveries change context needs or dependencies, update `Execution strategy` and `Decision history` with the new assignments and reason before applying them. Stay within the approved policy and permissions without messaging the user; changes outside them require approval in chat before execution. On resumption, verify executor availability and record any replacement before dispatching work.
