# agent-skills

My personal collection of [Agent Skills](https://agentskills.io) — self-contained folders of instructions and resources that agents like Claude Code load on demand to perform specialized tasks.

Browse this collection on [skills.sh](https://www.skills.sh/ribeirogab/agent-skills).

## Skills

| Skill | Description |
| --- | --- |
| [spec-orchestrator-handoff](skills/spec-orchestrator-handoff/SKILL.md) | Writes the opening handoff for the orchestrator session of a layered delivery from a spec (URL, local file path, or pasted text) — one file in the system temp directory, the path printed as the only output. |

## Installation

### skills CLI (any agent)

Installs into 20+ agents — Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and more:

```bash
npx skills add ribeirogab/agent-skills
```

### Claude Code (plugin marketplace)

```
/plugin marketplace add ribeirogab/agent-skills
/plugin install ribeirogab-skills@agent-skills
```

### Manual

Copy any skill folder into your skills directory:

```bash
cp -R skills/spec-orchestrator-handoff ~/.claude/skills/
```

Personal skills live in `~/.claude/skills/`; project skills live in `.claude/skills/` inside the project.

## Structure

Each skill is a self-contained directory under `skills/`:

```
skills/<skill-name>/
├── SKILL.md        # frontmatter (name, description) + instructions
└── references/     # optional supporting files loaded on demand
```

The format follows the [Agent Skills specification](https://github.com/anthropics/skills).

## License

[MIT](LICENSE)
