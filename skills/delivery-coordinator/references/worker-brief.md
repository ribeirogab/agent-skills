# Worker brief

The brief is the worker's whole context: it cannot see your conversation with the user. Write it with absolute paths and the real names of files, endpoints, accounts, skills, and commands.

## Start the worker

Use the delegation tool of your harness, with these settings:

- **Isolation**: its own git worktree, from the base branch the repository docs name.
- **Visibility**: a thread the user can open and write in.
- **Notification**: you hear when the worker finishes or stops.
- **Model and effort**: as `plan.md` says.
- **Goal**: one end-state sentence with the stop point, such as "Deliver CKT-873 to staging, validated, and stop before production."

## Template

Fill every `<...>`. Keep the section labels; write the content in the language of your conversation with the user.

```text
Role. You are the worker of stage <NN> of <PARENT KEY> (<parent link>): <ISSUE> <title>. The coordinator is your only channel to the user. Write in <language>. Follow <repository docs, absolute paths>.

Order. The user said: "<the user's phrase that started this wave, quoted>". Send your questions first; after the answers, implement without waiting for a second order. Production is not authorized: the coordinator forwards the user's ok for this stage.

Read first.
- <state folder>/README.md
- <state folder>/plan.md and <state folder>/decisions.md
- <state folder>/research/<files>
- <issue link>, <parent issue link>

Your file. <state folder>/workers/<ISSUE>.md is yours, and it is the only file of the state folder you edit; your deliverables (reports, runs) go beside it as workers/<ISSUE>-<name>. Update it at every change of cycle step, question, answer, decision, PR, deploy, and validation, and before you end each turn. When you resume, read it first. Keep credentials out of it.
- Questions and answers: one row per question; write the answer in the same row when it arrives.
- Local decisions, Progress, Validations: append at the end, oldest first.
- For the coordinator: each request you have for the coordinator, such as a comment on the parent issue or a decision outside your stage.

Scope. <the issue's items, with real names>. Out of scope: <items>.

How to work.
- Send all your questions in one round, each with your recommended answer, through <your harness's question tool, or as the last message of your turn>. Implement after the answers arrive.
- When the user writes to you directly, follow it and record it in your file with `user` as the source.
- A credential reaches you only through <the secret tool of your harness>, after the coordinator says it is ready.
- Test environment: deploy and validate on your own. Production and production data: only after the forwarded ok.
- Cycle: <the stage cycle of plan.md, with its real skills, commands, labels, and states>.
- Limits: <machine and repository limits>.

Stop point. <where this stage stops before the production ok>. Update your file, then report: PR URLs, head SHA, checks and review state, and the validation report link.

Last line. End every report with: PR <URL>, head <SHA>, checks and reviews <state>
```
