---
tags:
  - learning
  - concept
related:
  - "[[../conventions/skill-md-style]]"
created: 2026-04-30
---
# Degrees of freedom — match instruction specificity to task fragility

When writing skill instructions, choose the level of specificity by asking how fragile the task is. High-specificity prose constrains Claude (slow, safe); low-specificity prose trusts Claude (fast, flexible). Picking wrong is one of the most common reasons skills under-deliver: too rigid for open-ended work, too loose for fragile work.

## Context

From Anthropic's *Skill authoring best practices* — "Set appropriate degrees of freedom" section. The frame uses an analogy worth keeping verbatim: think of Claude as a robot navigating a path. A narrow bridge over cliffs needs guardrails (low freedom). An open field needs general direction (high freedom).

## How It Works

Three levels and when each fits:

### High freedom — text-based instructions

Use when: multiple approaches are valid, decisions depend on context, heuristics guide the work.

Example:
```
## Code review process
1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

The skill describes the *shape* of the work; Claude fills in the technique per-case.

### Medium freedom — pseudocode or scripts with parameters

Use when: a preferred pattern exists, some variation is acceptable, configuration affects behavior.

Example:
````
## Generate report
Use this template and customize as needed:
```python
def generate_report(data, format="markdown", include_charts=True):
    # ...
```
````

The skill provides a scaffold; Claude adapts parameters to the task.

### Low freedom — exact scripts, few or no parameters

Use when: operations are fragile and error-prone, consistency is critical, a specific sequence must be followed.

Example:
````
## Database migration
Run exactly this script:
```bash
python scripts/migrate.py --verify --backup
```
Do not modify the command or add additional flags.
````

The skill commands the action; Claude executes verbatim.

### How to choose

Anthropic's heuristic — ask **"what is the cost of variation here?"**:

- **High cost of variation** (irreversible, security-critical, high-precision output): low freedom.
- **Low cost of variation** (creative work, exploration, judgment calls): high freedom.
- **Mixed**: medium freedom.

The same skill can mix levels. A `pdf-processing` skill might say:
- High freedom: "Decide which extraction library suits the task."
- Medium freedom: "Use this template for the output JSON: …"
- Low freedom: "Run `python scripts/validate_form.py fields.json` after every edit."

The most common authoring mistake is **forcing high freedom on fragile operations** ("Validate the data before proceeding") — Claude interprets "validate" too loosely and skips checks. Replace with a specific command: `Run scripts/validate.py --strict and address every error before continuing.`

## Note on scope

This is a decision-making frame for instruction writing, not a hard rule. Apply it per-section within a `SKILL.md`, not per-skill.

## Source

Anthropic platform docs — *Skill authoring best practices*, "Set appropriate degrees of freedom" section.
