# Plan — <PARENT KEY> <title>

Status: draft | approved on <YYYY-MM-DD> ("<the user's reply, quoted>")
Parent issue: <link>
State folder: <absolute path>

Changes only with a new decision of the user, recorded in `decisions.md`.

## Stages

| # | Issue | Delivery | Depends on | Size |
| --- | --- | --- | --- | --- |
| 01 | <ISSUE, link, or "new"> | <what ships, with real names> | <stages, or —> | <points> |

Out of scope: <each item, with its reason>.

## Roles

- **Coordinator** (this thread): starts one worker per stage; answers the workers from this plan, `decisions.md`, and `research/`; brings the user only decisions, credentials, and production oks; publishes each stage's evidence on the parent issue; orders the deploys and the conflicts.
- **Worker** (one per stage): <the harness session it runs in>, its own git worktree, <model and effort>. Takes its stage through the stage cycle and keeps `workers/<ISSUE>.md`.

## Stage cycle

1. Read the issue, this plan, and `research/`; send every question to the coordinator in one round.
2. <implement, with the test rule of the repository>
3. <branch and PR, with the real skill or command>
4. <review gate>
5. <test environment deploy and validation>
6. **Gate**: stop and report; the coordinator asks the user for the production ok, one ok per stage.
7. <production deploy, production validation, issue update>
8. The coordinator collects the evidence and publishes it on the parent issue.

## Waves

| Wave | Workers in parallel | Production order | Needs from the user |
| --- | --- | --- | --- |
| 1 | <stages> | <order, or —> | <credentials, accesses, decisions> |

- At most <n> workers at the same time (<reason>).
- Shared files: <stages that change the same paths; the later merge rebases on the base branch>.
- Start: the plan ok starts wave 1; each next wave starts when its dependencies are <done state>.

## Evidence

- <per stage: validation report, measurement, screenshots> → <where it is published>.
