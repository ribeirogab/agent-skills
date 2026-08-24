---
name: spec-orchestrator-handoff
description: Writes the opening handoff for the orchestrator session of a layered delivery from a spec (URL, local file path, or pasted text) — one file in the system temp directory, the path printed as the only output. Invoke with /spec-orchestrator-handoff <spec>.
disable-model-invocation: true
---

# spec-orchestrator-handoff

Write the handoff that opens the orchestrator session of a layered delivery. That is the whole job: produce one file in the system temp directory and print its path.

## Contract

- Invocation: `/spec-orchestrator-handoff <spec>`. The spec is a URL, a local file path, or text pasted directly as the argument. Without an argument, ask for the spec once and stop if it does not come.
- The only output on screen is the file path, one line — no summary, no `cat`, no next steps.
- This skill does not orchestrate, execute, implement, open PRs, deploy, validate, create issues, write to any external service, or touch the delivery repository. Its only write is the handoff file.
- The reader is the orchestrator: the session that opens the handoff starts delivering, without producing any intermediate document.

## The spec — three forms, one rule

The handoff must be self-sufficient: the session that reads it does not have this conversation and has no guaranteed access to the same files.

- URL: fetch and read it. If readable, the `Spec:` slot carries the link and the content is used only to derive the slug, the repository, and the tracker. If not readable, ask the user for the content once and embed it — a link this session could not open is a link the orchestrator probably cannot open either.
- Local file path or pasted text: the full content goes embedded in a `## Spec` section of the handoff.
- Slug: from the spec's identifier or title; for pasted text without a title, from its first significant words.

## The delivery repository

Resolution stops at the first source that answers: the argument, the spec, the cwd, a remote named in the spec.

- The cwd counts only with evidence tying it to the spec: its remote is the repository the spec names, or files and paths the spec mentions exist in it. A git repository with no such link is not the delivery repository.
- Never search the disk for a checkout. Use the cwd or a path given explicitly; a remote with no local checkout is read through the host CLI (`gh` or equivalent, read-only, no clone) when the pipeline needs deriving.
- If nothing resolves and the cwd is a repository without evidence, ask the user one targeted question instead of guessing or treating the delivery as greenfield.
- A spec with no identifiable repository is accepted (greenfield): the handoff instructs the orchestrator to resolve it at step zero — create the repository or ask the user — as the delivery's first decision.

From the repository come the PR command (what the repository declares; without a declaration, the host's convention) and the confirmed convention paths.

## The single question

One call of the host's native selector, two decisions. Neither has a default, neither is skippable. Without a selector in the host, print the options and wait — a fallback, not a norm.

1. **Sub-agent config** — exactly two paths, no preset list: `No preference` and a free-text field (the host's `Other` slot or equivalent). The free text is a policy, not just a model name: it can name several models and describe when the orchestrator uses each — roles, effort levels, boundaries, per kind of work. Whatever comes goes into the handoff verbatim, unnormalized; interpreting and routing it is the orchestrator's work. A long config fits badly in a selector field: a local file path typed there is read and embedded, and a config pasted in the chat — before the question or as the answer to it — counts the same. With `No preference` chosen, the handoff carries no sub-agent section — no placeholder, no suggestion.
2. **Pipeline** — `Suggest now` (assisted) or `Leave to derive` (autonomous).

Greenfield removes the pipeline decision — the pipeline automatically becomes a derivation instruction — and the selector carries only the sub-agent decision.

## The pipeline

- **Suggest now** — derive a proposal by reading the delivery repository: CI configs, declared scripts, contribution docs, branch protection. Then run the approval loop below.
- **Leave to derive** — the pipeline becomes an instruction in the handoff: the orchestrator resolves it at step zero and declares it in the first report, before opening the first layer.

### The approval loop

The approval happens in the chat, in plain text — no selector, no buttons, ever. Two steps, in this order, and the order is the point:

1. **Print the block** as response text, in this exact shape:

```
Suggested pipeline — <repository>

1. <step> — <what sustains it>
2. <step> — <what sustains it> (hard gate)

Not included: <what stays out and why>
```

2. **End the turn and wait** for the user's typed reply. The block closes with one line asking for approval or adjustments — nothing more.

Never open a selector for this approval, never put the block or the decision inside a question widget, never compress the block into one sentence, and never write it only in thinking or inside a tool call. The user must see the whole block as chat text before anything is asked of them.

The reply is read from the chat: a plain affirmation (`ok`, `approved`, `looks good`, `tudo certo`, and the like) approves; anything that describes a change is an adjustment — apply it, print the whole revised block again, and wait again, until an affirmation comes. Approved, the block becomes the `Pipeline per layer` section of the handoff.

Hard naming rule: no step names a tool this skill did not confirm in the delivery repository. A generic step is a name, what sustains it, and the `(hard gate)` mark when it is one. What counts as review approval, as deploy, as validation, comes from the repository or becomes a derivation instruction.

## Tracker — optional

Derived only when the spec is a tracker URL (Linear, GitHub Issues, Jira, and the like); then the handoff points to where the delivery's state lives. Without a tracker, no external write is presumed and the DEFERRED.md is delivered in the final report, period.

## The handoff

`references/handoff-example.md` is the mold for structure, order, and grammar. It shows the fullest form — embedded spec, defined pipeline, sub-agent config present; a delivery without one of those omits the line or section, nothing replaces it. The handoff is written entirely in English. The skeleton:

1. **Title** — `# Orchestration — <spec identifier>`.
2. **The mandate** — the first line, with the end criterion: the session is the orchestrator, and the turn ends only when every layer has passed the last step of the pipeline, with the proof that step demands.
3. **The facts** — `Spec:`, `Repository:`.
4. **`## Spec`** — only when the content must be embedded.
5. **`## Delivery rules`** — only facts confirmed in the repository; an unconfirmed path becomes a derivation instruction.
6. **`## Process`** — four steps: step zero (read everything; done when the orchestrator can declare the state and the rules), first report (declare the layer cut and the completion-percentage criterion, explicit and stable; a report is information, never an approval request), layers (one executor per layer, pipeline enforced step by step; sequential, parallel, or mixed is the orchestrator's decision — in doubt, discipline), final report (consolidate pending items into a single DEFERRED.md and deliver the whole list; a pending item does not change the cut and does not enter the percentage).
7. **`## Pipeline per layer`** — the numbered pipeline, each step with what sustains it and the `(hard gate)` mark.
8. **`## Proof`** — proof is a verifiable reference: a SHA, a run URL, a command output, a resource id. An executor claim without proof does not close a step; what sustains a hard gate the orchestrator confirms alone.
9. **`## Executors`** — all code comes from executors (subagents with the complete instructions of their layer); the orchestrator's work is reviewing and operating the hard gates, which run in the main session. Deploys to the same target are a queue of one. Control returns to the user only on a real blocker; ending the turn telling the user to open a session is a failure.
10. **`## Sub-agent config`** — only when the user provided one. One fixed opening line — the config governs every subagent the orchestrator opens (executors, reviewers, critics) and which entry applies to each situation is the orchestrator's reading — followed by the user's text verbatim, untouched. Without a config, the section does not exist and subagents run on the host's default.
11. **`## Deferred work — DEFERRED.md`** — a pending item discovered on the way does not enter scope: the executor notes it (one line: what, where, why) and reports it to the orchestrator; consolidation is the orchestrator's, in the final report. With a tracker, the DEFERRED.md is also attached to the spec; without one, it is only delivered.

## Slots and anti-invention

Fill only what is at hand: the spec, the repository, the sub-agent config, the user's adjustments, the confirmed paths, and the pipeline when defined. The rest — current state, preflight checks, the proof of each gate, the layer cut — comes out as derivation instructions.

Unconfirmed data becomes a derivation instruction, never data. An unconfirmed check, a script name, a host URL, a lane name, a file not seen to exist — without the datum, write the instruction. Inventing is worse than omitting: an invented datum in the handoff crosses the whole delivery with nobody there to contest it.

## File and output

- File: `${TMPDIR:-/tmp}/<YYYY-MM-DD>-<spec-slug>-orchestrator.md` — outside any repository, nothing becomes a commit. A collision overwrites: rerunning for the same spec on the same day rewrites the file.
- No hard wrap: each paragraph is one line; break only where it means something.
- Adjustment after the path is printed: rewrite the same file and print the path again, without repeating a question already answered.
