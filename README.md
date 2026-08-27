# agent-skills

My personal collection of [Agent Skills](https://agentskills.io) — self-contained folders of instructions and resources that AI agents load on demand to perform specialized tasks.

## Skills

| Skill | Description |
| --- | --- |
| [orchestrate](skills/orchestrate/SKILL.md) | Plans and executes a delivery from a spec, with a persistent plan, explicit start approval, and optional delegation. |
| [spec-orchestrator-handoff](skills/spec-orchestrator-handoff/SKILL.md) | Writes the opening handoff for the orchestrator session of a layered delivery from a spec (URL, local file path, or pasted text) — one file in the system temp directory, the path printed as the only output. |

## Installation

Works with 20+ agents — Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and more:

```bash
npx skills add ribeirogab/agent-skills
```

To install a single skill:

```bash
npx skills add ribeirogab/agent-skills --skill spec-orchestrator-handoff
```

## License

[MIT](LICENSE)
