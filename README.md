# agent-skills

My personal collection of [Agent Skills](https://agentskills.io) — self-contained folders of instructions and resources that AI agents load on demand to perform specialized tasks.

## Skills

| Skill | Description |
| --- | --- |
| [orchestrate](skills/orchestrate/SKILL.md) | Plans and executes a delivery from a spec, with explicit start approval and optional delegation. Pauses with `/orchestrate checkpoint` and resumes from a `CHECKPOINT.md` path. |
| [show-flow](skills/show-flow/SKILL.md) | Explains existing flows and proposed architectures with Mermaid diagrams, grouped responsibilities, and explicit protocols and data on connections. |
| [show-design](skills/show-design/SKILL.md) | Builds a single-file HTML technical design of a planned change (architecture, flows, change tree, ERD, contracts) that the user reviews with anchored comments before the spec is written; the file then serves as implementation context. |

## Installation

Works with 20+ agents — Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and more:

```bash
npx skills add ribeirogab/agent-skills
```

To install a single skill:

```bash
npx skills add ribeirogab/agent-skills --skill orchestrate
```

## License

[MIT](LICENSE)
