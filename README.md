# agent-skills

A small set of [Agent Skills](https://agentskills.io) for AI coding agents: plan a change, show how a product works, and set a clear goal.

## Skills

- **[show-design](skills/show-design/SKILL.md)**: turns a planned change into an HTML design doc with diagrams, the file tree, and the data model. You review it with inline comments before you write the spec.
- **[how-it-works](skills/how-it-works/SKILL.md)**: builds an HTML walkthrough of a feature, a user flow, or a whole product, screen by screen, from real screenshots.
- **[goal-prompt](skills/goal-prompt/SKILL.md)**: asks a few questions about an issue or a conversation, then writes a `/goal` prompt with done criteria you can check.

## Install

```bash
npx skills add ribeirogab/agent-skills
```

Install one skill:

```bash
npx skills add ribeirogab/agent-skills --skill show-design
```

Works with Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and other agents that support Agent Skills. `show-design` and `how-it-works` need Python 3.

## Usage

Your agent uses a skill when your request matches it. To call one by name, type `/show-design` in Claude Code or `$show-design` in Codex. `goal-prompt` runs only when you call it.

## My workflow

This is how I use these skills, together with [Matt Pocock's skills](https://github.com/mattpocock/skills):

1. `/grill-with-docs`: answer questions until the plan is clear.
2. `/show-design`: review the technical design before I write the spec.
3. `/to-spec` and `/to-tickets`: turn the design into an issue and sub-issues.
4. `/goal-prompt <issue>`: write the goal, then run it with `/goal`.
5. `/how-it-works`: show the finished feature to other people.

## License

[MIT](LICENSE)
