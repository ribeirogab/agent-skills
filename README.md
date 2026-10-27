# agent-skills

My personal collection of [Agent Skills](https://agentskills.io) — self-contained folders of instructions and resources that AI agents load on demand to perform specialized tasks.

## Skills

| Skill | Description |
| --- | --- |
| [show-design](skills/show-design/SKILL.md) | Builds a single-file HTML technical design of a planned change (plain-language summary, architecture, flows, change tree, ERD, contracts) that the user reviews with anchored comments before the spec is written; the build warns about text that is hard to read, and the file then serves as implementation context. |
| [how-it-works](skills/how-it-works/SKILL.md) | Builds a single-file HTML page that shows how a feature, a user flow, or a whole product works, screen by screen: real screenshots in a carousel, plain-language steps, and the rules, in the show-design look. The build embeds the screens and warns about text that is hard to read and images that are too heavy. |
| [show-flow](skills/show-flow/SKILL.md) | Explains existing flows and proposed architectures with Mermaid diagrams, grouped responsibilities, and explicit protocols and data on connections. |
| [goal-prompt](skills/goal-prompt/SKILL.md) | Writes a `/goal` prompt from an issue link or a slice of the conversation. Asks rounds of questions with recommended answers, including the finish line (local, PR, staging, or production), then returns an end state with binary, provable criteria. |
| [orchestrate](skills/orchestrate/SKILL.md) | Plans and executes a delivery from a spec, with explicit start approval and optional delegation. Pauses with `/orchestrate checkpoint` and resumes from a `CHECKPOINT.md` path. |

## Installation

Works with 20+ agents — Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and more:

```bash
npx skills add ribeirogab/agent-skills
```

To install a single skill:

```bash
npx skills add ribeirogab/agent-skills --skill show-design
```

## License

[MIT](LICENSE)
