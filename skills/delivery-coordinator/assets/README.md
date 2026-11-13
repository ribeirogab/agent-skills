# <PARENT KEY> — coordination

Working state of <parent issue link> (<the delivery's goal, in one line>). The issue tracker is the team's official record; this folder is the working memory of the coordinator and the workers.

## When you resume

1. `status.md`: what waits for the user, and each stage's state and next step.
2. The end of `log.md`: the latest events.
3. `workers/<ISSUE>.md` of the stage you act on.
4. `plan.md` and `decisions.md`: the reasons.
5. `research/` and `measurements/`: findings and numbers.

## Files

| Path | Owner | Content | Changes |
| --- | --- | --- | --- |
| `plan.md` | coordinator | The plan, draft or approved | Only with a new decision of the user |
| `decisions.md` | coordinator | Dated decisions, who decided, and why; pending decisions | A new row at the end; a pending decision leaves `Pending` when it is decided |
| `status.md` | coordinator | What waits for the user; one block per stage | The stage block is rewritten at every event |
| `log.md` | coordinator | Dated events, with SHA, PR, comment id, or value | A new line at every event |
| `workers/<ISSUE>.md` | the stage's worker | Current state, questions, decisions, progress, validations | At every step and before each turn ends |
| `workers/<ISSUE>-*` | the stage's worker | Its deliverables: reports, runs | A new file or folder |
| `research/` | coordinator | `findings.md` and the raw data behind it | A new finding |
| `measurements/` | coordinator | The measurement script, or the path of the one in the repository, and one folder per run, `<label>-<YYYY-MM-DD>/` | A new measurement |
| `tracker/` | coordinator | The exact text of each issue body and comment published | A new publication |
| `scratch/` | coordinator | Helper scripts and temporary files | Any time |

## Rules

- Events: worker started, question, answer, decision, PR, deploy, measurement, user ok. At each one, the coordinator rewrites the stage block in `status.md` and adds a line to `log.md`.
- The root holds only `README.md`, `plan.md`, `decisions.md`, `status.md`, and `log.md`. Every other file goes in a folder of the table.
- A worker edits only its own files in `workers/`.
- `log.md`, `decisions.md`, and the worker sections Local decisions, Progress, and Validations grow at the end, oldest first.
- An answer goes in the same row as its question.
- Credentials stay out of this folder; it holds only the path where each one lives.
- When the parent issue is done, the result lives in the issue tracker, and this folder is removed.
