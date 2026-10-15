---
name: goal-prompt
description: Writes a /goal prompt from an issue link or a slice of the conversation, after rounds of questions that each carry a recommended answer.
disable-model-invocation: true
---

# goal-prompt

Write the prompt for a `/goal` run. `/goal` keeps an agent working turn after turn until a condition holds. In Claude Code, a small model with no tools judges the condition from the conversation alone; in Codex, the agent itself declares the goal met. Either way, the prompt describes an **end state**: a condition that is true or false, proven by evidence the run leaves in the conversation.

## Invocation

| Input | Source | Role of the conversation |
| --- | --- | --- |
| `/goal-prompt <link>` | The linked issue, PR, or doc | Background |
| `/goal-prompt <text>` | The passage of the conversation the text names, such as `step 2` of a plan discussed here | The rest is background |
| `/goal-prompt <link> <text>` | The passage of the linked source the text names | Background |
| `/goal-prompt` | The last open topic in the conversation | Source |

## 1. Gather the facts

Read the source in full: for a link, the body, every comment, the sub-issues, and the linked PRs; for text, the exact passage it names.

In the repository, find the real commands that prove the end state: `package.json` scripts, `Makefile` targets, CI workflows, existing tests. Note the deploy and validation skills available in this session.

Facts are your job; decisions are the user's. Look up everything the environment can answer, and bring the user only decisions.

**Ready when:** the source passage is identified or its ambiguity is queued as a question, and every proof command you plan to cite exists on disk.

## 2. Ask in rounds

Ask every open decision of the round at once, numbered, each with its options and your recommended answer. Word each question so "yes" accepts the recommendation:

```text
❓ **Q1 - <title>**: <question, with options>

➡️ <recommended answer, with its reason in one sentence>
```

The first round covers:

- **Finish line**: how far the run goes: run locally, open a PR, deploy to staging, deploy to production, or validate in production.
- **Proof**: the command or observable result behind each criterion, when the repository leaves it unclear.
- **Out of scope**: what stays untouched: files, migrations, data, other services.
- **Budget**: the turn limit for the run, sized to the task.
- **Source match**: which passage the text names, when it matches several passages or none.

Open the round with an **Assumed:** line for each topic the source or the conversation already settles, so the user can correct it. Wait for the answers, then ask the next round with the decisions they opened.

**Ready when:** every decision is settled and the user has seen every assumption.

## 3. Write the prompt

```text
<end state, as one imperative sentence>
Source: <link, when there is one>
Done when:
- <binary criterion, with the command that proves it>
Constraints: <limits the agent would cross without being told>
Finish line: <where the run stops, e.g. "do not deploy to production">. Stop after <N> turns.
```

Keep it under 100 words, with one to three criteria. The prompt carries the destination, the proof, and the limits; the agent chooses the route. Write it in the language of your conversation with the user, labels included.

Make the prompt self-contained: write into it the facts from the conversation that the agent needs. A long run compacts its context, and a pointer such as "step 2 above" can vanish; a link stays stable, so cite it under `Source:`.

**Ready when:** every criterion is binary and leaves evidence in the conversation (command output, a PR link, a deploy URL), the first line states an end state, the finish line is written, and each constraint changes what the agent would do by default.

## 4. Deliver

Return the prompt ready to paste, in one code block that starts with `/goal `.
