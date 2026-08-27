# Delegation by context and cost

Read when considering delegation in the strategy or before starting a subagent during execution.

## Decide

Execute directly by default. With `no subagents`, or when the environment lacks this capability, keep work in the main session. Report limitations when they affect the strategy.

Delegate when preserving context or reducing total cost outweighs preparing instructions, transferring context, monitoring, reviewing, and correcting. The model policy guides selection but does not require delegation. A cheaper model reduces cost per token; delegation can increase token count. Use confirmed options without inventing savings.

| Work | Preference |
| --- | --- |
| Small change already understood, architecture, ambiguous rule, or context costly to transfer | Main session |
| Repetitive implementation with a clear pattern and acceptance criteria | Block delegated to a capable, cheaper model |
| Extensive reading or bounded investigation with a short summary | Delegation to preserve context |

State the reason before starting each agent. Without a cheaper model option, assess only the context benefit.

## Assign and review

Group related work, including multiple phases, without a fixed number of tasks per agent. Reuse the executor for corrections and continuations in the same context. Parallelize only independent work whose benefit justifies the cost.

Provide the block's requirements, boundaries, dependencies, interfaces, acceptance criteria, checks, and references without copying the entire conversation. Collect changes, diffs or commits, evidence, deviations, and pending work; consult full logs when needed.

Executors perform their assigned work without starting other agents. The main session makes decisions, reviews, operates hard gates, and controls tracking writes. Return corrections to the same executor while its context remains useful.

Keep review in the main session, without automatically adding a reviewer or critic. If a gate requires independent review that conflicts with preferences or available capabilities, resolve the conflict with the user before proceeding.
