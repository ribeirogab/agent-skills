# Tracking rules

Read when a tracking policy needs configuration, or configured actions need execution or reconciliation. Without an approved policy, keep only local records and chat reports.

## Configure

Keep the original policy and proposed interpretation in the conversation during planning; after plan approval, preserve the complete original in `Original user instructions` according to the orchestration template and save the approved interpretation with its source entry reference in `Approved decisions / Tracking rules`. For each rule, define the event, condition and evidence, service and affected resources, action, allowed content, and method to confirm the result.

Query the service to resolve accounts, teams, projects, fields, and statuses to real identifiers. Ask for clarification when names are missing or ambiguous, without creating values to accommodate the policy. A subticket rule does not extend to its parent; completing the parent requires an explicit rule and satisfaction of the criteria for all required items.

If a status represents an intermediate step, associate it with that event and keep technical progress separate. The status name does not change the approved destination.

**Ready when:** mappings, targets, and write scope are approved in the plan. Applying them also requires start authorization. Waiting between preparation and execution does not generate blocker or completion events.

## Apply and confirm

The main session performs the actions using evidence from executors.

1. Confirm the event with evidence and read the current resource. Reconcile human changes before overwriting decisions.
2. Check previous actions and record the intent in `Progress / Tracking actions`: resource, event and evidence, expected action.
3. Perform only the approved action. Confirm values that are already correct without rewriting them. For comments, find the previous action by ID or by content and event; use idempotency when available.
4. Query the result and record its reference. If the response is uncertain, check the source before retrying.

**Ready when:** each action has a confirmed result. Status and comment updates are separate operations; resume only the pending part. An integration failure leaves tracking pending without invalidating technical evidence. Continue independent work.

## Human blocker

Apply the rule only to affected resources. The comment must include the blocker, evidence, attempts, required human action, and resumption condition, without credentials or sensitive logs.

After verifying the resolution, apply the configured resumption transition, considering the current state. Preserve human changes instead of blindly restoring an old status.

Changing a status or posting a comment does not wake an ended session. Resumption requires new input or invocation; monitoring requires a separate request and setup.

## Optional example: Linear

This policy is an example of user input, not a default:

```text
For this spec's subtickets:
- When starting, change to In Progress.
- After satisfying the applicable acceptance criteria and pipeline, change to Done and comment with evidence.
- For a blocker requiring a human, change to Needs Human and comment with the cause, attempts, and required action.
- After verifying the resolution and resuming, change to In Progress.
- Preserve the parent ticket and all other fields.
```

Before enabling, confirm the subtickets, team, status IDs, permissions, and approved mapping. If a status does not exist, ask for the correct name. Completion evidence must match the approved destination, whether staging, production, or another destination.
