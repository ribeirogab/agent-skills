---
tags:
  - learning
  - concept
related:
  - "[[skill-progressive-disclosure]]"
  - "[[../conventions/skill-md-style]]"
created: 2026-04-30
---
# Skill development workflow — eval-first, Claude A / Claude B

The most effective way to author a Claude skill is **not** to write the markdown first. It is: (1) build evaluations that capture the gaps a skill should close, (2) iterate on a single hard task until Claude succeeds, (3) extract the working approach into a skill, (4) refine via a two-Claude feedback loop where one instance helps you author and a separate instance is the test subject.

## Context

Synthesized from Anthropic's *Skill authoring best practices* ("Evaluation and iteration" section) and *The Complete Guide to Building Skills for Claude* (PDF, Chapter 3 "Testing and iteration"). Both sources independently emphasize that skill development is empirical, not waterfall — write the eval first, build only the markdown that's needed to pass it.

## How It Works

### 1. Eval-first

Before writing extensive `SKILL.md` content:

1. Run Claude on representative tasks **without** any skill. Document specific failures or missing context.
2. Build at least **three evaluations** that test those gaps.
3. Establish a baseline by measuring Claude's performance without the skill.
4. Write the **minimum** instructions needed to address the gaps and pass the evals.
5. Iterate.

Anthropic's reasoning: "This approach ensures you're solving actual problems rather than anticipating requirements that may never materialize." Many SKILL.md instructions exist because an author imagined Claude would need them — strip everything that isn't load-bearing for an eval.

The minimum eval shape Anthropic suggests:

```json
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file and save it to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads the PDF file using an appropriate library",
    "Extracts text from all pages without missing any",
    "Saves output to a clearly-named file"
  ]
}
```

### 2. Iterate on a single task before expanding

Both sources agree: get one challenging task to work end-to-end via in-context prompting first. Only after that one task is solid do you abstract the winning approach into a skill, then expand to multiple test cases for coverage. Trying to write a generic skill from scratch (without the single-task spike) produces vague instructions that fail in real use.

### 3. Three test categories

The PDF (Chapter 3) defines three types of tests every shippable skill should pass:

1. **Triggering tests** — does the skill load when expected? Does it *not* load when unexpected?
   - Should-trigger list (5–10 paraphrased queries).
   - Should-NOT-trigger list (5–10 unrelated queries).
2. **Functional tests** — does the skill produce correct outputs for typical inputs?
3. **Performance comparison** — measurable improvement over baseline (token count, success rate, retries, user-correction count).

### 4. The Claude A / Claude B pattern

This is the most important development-loop technique in either source. Two distinct Claude instances:

- **Claude A** — your authoring partner. Has the existing `SKILL.md` loaded and helps refine it.
- **Claude B** — a fresh instance with the skill installed. Treats the skill the way a real user's agent would.

The loop:

1. Use the skill with **Claude B** on a real task.
2. Observe how Claude B behaves. Where does it succeed? Where does it skip steps, miss references, hallucinate, or produce vague output?
3. Bring observations back to **Claude A** with specifics: "When Claude B was asked for a regional report, it forgot to filter test accounts even though the skill mentions filtering."
4. Claude A suggests targeted refinements (stronger language, reorganized sections, new validation step).
5. Apply the changes; test again with Claude B.

Why this works: Claude A understands what Claude-as-agent needs (it *is* one); Claude B reveals real gaps through observed behavior; the human contributes only domain expertise and direction. Anthropic explicitly notes you do not need a "writing skills" skill to invoke Claude A's authoring help — Claude understands the skill format natively.

### 5. Triage iteration signals

When the skill is in real use, the failure mode tells you where to fix:

| Symptom | Fix |
|---|---|
| Skill doesn't load when it should (under-triggering) | Strengthen `description` — add trigger phrases, file types, key terms |
| Skill loads when it shouldn't (over-triggering) | Add negative triggers, narrow the description's scope |
| Skill loads but Claude doesn't follow instructions | Move critical rules to the top, use stronger imperative language ("MUST", "ALWAYS"), or replace prose with a script |
| Skill loads but produces inconsistent output | Add a feedback loop (validator → fix → repeat), or move to lower freedom (`[[skill-degrees-of-freedom]]`) |
| Skill is slow / responses degraded | Body too large — push content to `references/`, keep `SKILL.md` <500 lines |

### 6. Test across model tiers

Skills behave differently on Haiku, Sonnet, and Opus. Anthropic recommends testing on every tier you plan to support. What is concise enough for Opus may be too sparse for Haiku; what is rich enough for Haiku may be wastefully verbose for Opus. If you target multiple tiers, optimize for the one with the least headroom.

## Note on scope

This describes the *authoring* loop for Claude skills. The runtime evaluator pattern (generator-vs-evaluator separation) covered in `[[generator-evaluator-separation]]` is a different concern — that is about skills whose *output* needs grading by another agent. This note is about how the skill itself gets developed.

## Source

Anthropic platform docs — *Skill authoring best practices*, "Evaluation and iteration" section ("Build evaluations first", "Develop Skills iteratively with Claude", "Observe how Claude navigates Skills"); *The Complete Guide to Building Skills for Claude* (PDF), Chapter 3 "Testing and iteration".
