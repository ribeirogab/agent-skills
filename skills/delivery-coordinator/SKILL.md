---
name: delivery-coordinator
description: Coordinates a staged delivery. It shows the plan for the user's ok, then runs one worker per stage in its own worktree, relays the workers' questions, gates each production deploy on the user's ok, and keeps the state in files that survive compaction. Use when the user asks you to coordinate a delivery, to run workers or subagents over an issue's sub-issues, or to resume a coordination.
---

# delivery-coordinator

You are the **coordinator** of a delivery: one parent issue split into stages, each stage carried by a **worker**, a separate agent session in its own git worktree. You plan, the user approves, the workers build, and you are the only channel between the workers and the user. The issue tracker stays the team's official record. The **state folder** is the working memory you and the workers share, so the coordination survives compaction and new sessions.

| Input | Action |
| --- | --- |
| `/delivery-coordinator <parent issue link or key>`, no state folder yet | Steps 1–6 |
| `/delivery-coordinator <parent issue link or key>`, the state folder exists | Resume |
| `/delivery-coordinator` | The delivery under discussion in the conversation; resume when its state folder exists |
| After compaction, or a memory pointer names a state folder | Resume |

## State folder

`~/tmp/<slug>/`, outside every worktree, so the coordinator and all workers read the same files. The slug is the parent issue key in lower case (`ckt-872`), or a short kebab-case name.

Create it by copying the templates `README.md`, `plan.md`, `decisions.md`, `status.md`, and `log.md` from this skill's `assets/` into it. Its `README.md` holds the layout, the owner of each file, and the rules; follow them from then on. Keep the headings and field labels of the templates as they are, since the steps below name them; write the rest, template sentences included, in the language of your conversation with the user.

When your harness has a persistent memory for this project, save one entry in it: `<KEY> coordination: after compaction or in a new session, read <absolute path>/README.md first.` Without it, a new session cannot find the folder.

## 1. Gather the facts

Read the parent issue in full: body, comments, sub-issues, linked PRs. Read the repository docs that set how work ships: `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `CONTRIBUTING.md`. From them and from the skills in this session, find the real cycle of a change: branch naming, PR rules, the review gate, the test environment deploy, validation, the production deploy, and the issue states and labels. Where a session skill and the repository docs disagree, the repository docs win. Note the limits of the machine (memory, test runner workers) and of the repository (commands that trigger a deploy, installs to avoid).

Create the state folder now, so research and the draft plan survive compaction, and log the start in `log.md`. When the plan depends on a diagnosis, such as a measurement or a code survey, run it now and keep the findings in `research/findings.md` with the raw data beside it.

Facts are your job; decisions are the user's. Look up everything the environment answers, and bring the user only decisions and the inputs only they have, such as a URL or an access.

**Ready when:** every stage maps to an existing issue or to an issue the plan proposes, every step of the stage cycle names its real skill or command, and every open point is a decision with a recommended answer or an input only the user has.

## 2. Show the plan and wait

Fill `plan.md` from the template with status `draft`, `status.md` with one block per stage, and `## Waiting for the user` with the open decisions and inputs. The plan covers the stages and what stays out of scope, the roles and the worker model (by default your own model and effort), the stage cycle with every gate, the waves with the maximum number of workers at the same time (default 2), the start rule, and the evidence each stage leaves. The start rule by default: the plan ok starts wave 1, each next wave starts when its dependencies are done, and production takes one ok per stage.

Send the full plan as your chat message, then every open decision, numbered, each with its options and your recommended answer. Word each one so "yes" accepts the recommendation:

```text
❓ **D1 - <title>**: <question, with options>

➡️ <recommended answer, with its reason in one sentence>
```

After the decisions, list the inputs only the user has, each with the wave that needs it. Close with one line: "ok" approves the plan with every recommendation; a number with a change adjusts it. End the turn.

A reply that changes something updates `plan.md`; show the changed parts and wait again. Until the ok, the run only reads and researches: workers, branches, issue writes, and deploys start after it.

**Ready when:** the user's reply approves the plan.

## 3. Record the approval

- `plan.md`: status `approved on <date> ("<the user's reply, quoted>")`.
- `decisions.md`: one row per decision, with `user` for what the user answered or changed and `user (plan)` for each recommendation the ok accepted.
- Create the issues the plan proposed, with the issue tracker skill of the session; keep the exact text in `tracker/`.
- `status.md`: the stage blocks and `## Waiting for the user` brought up to date. `log.md`: the approval.

## 4. Start a wave

For each stage of the wave:

1. Copy `assets/worker.md` to `workers/<ISSUE>.md` and fill its title.
2. Write the brief and start the worker as [references/worker-brief.md](references/worker-brief.md) describes.
3. In the stage block of `status.md`, record every handle you need to message the worker after compaction: the thread link and the current task or agent id. Some harnesses issue a new id with each message; keep the latest.
4. Append the start to `log.md`.

**Ready when:** every worker of the wave runs, and `status.md` can reach each one.

## 5. Run the delivery

Workers run on their own. Between events, end your turn: worker notifications and the user's messages start the next one. When your harness gives no notification, check each worker's file and thread at a bounded interval.

| Event | Action |
| --- | --- |
| A worker asks | Answer what `plan.md`, `decisions.md` and `research/` settle, through the channel the question came in; record each answer you decide as `coordinator` in `decisions.md`. Collect the rest for the user. |
| A worker needs a credential | Ask the user for it through the secret tool of your harness, then tell the worker where it lives. Only that path enters the state folder. |
| A worker stops at its gate | Read `workers/<ISSUE>.md` and check the evidence: PR URLs, head SHA, checks and review state, the test environment report. Then ask the user for the production ok, with that evidence. |
| The user gives a production ok | Forward it to that worker with the user's phrase quoted, in the production order of the plan. One ok covers one stage. |
| A worker finishes its stage | Check its production validation and the issue state. Collect the evidence the plan names, publish it on the parent issue, and start each stage whose dependencies are now done. |
| `## For the coordinator` has an open request | Do it and tell the worker, who marks it done. |
| Two stages change the same files | Tell both workers; the later merge rebases on the base branch. |
| The user decides or instructs | Add a row to `decisions.md`, update `plan.md` when the plan changes, and forward it to every affected worker. |

After each event, rewrite the stage block in `status.md` and append a line to `log.md`.

The user hears from you for decisions, credentials, production oks, and actions only they can take, such as a console login. Keep these under `## Waiting for the user` in `status.md`, and send them together through your harness's question tool, in as few calls as it allows, each with your recommended answer as the first option. While workers run, the harness shows you as working, and a question in your reply alone stays out of the user's sight. Without a question tool, send them in one message at the end of your turn.

**Ready when:** every stage is in production, validated, with its evidence on the parent issue and its issue in the done state.

## 6. Close

Publish the final comment on the parent issue: each stage with its PRs and evidence. Move the parent issue to its done state as the repository docs say. Send the user the same summary and ask for the ok to remove the state folder and the memory pointer; remove both after the ok.

## Resume

Read `<state folder>/README.md` and follow its resume order. Then check the files against the world: each worker's thread state, each PR, each deploy. Bring `status.md` up to date, and append a `log.md` line for each change you found. Continue at step 2 when `plan.md` is still a draft, otherwise at step 5.
