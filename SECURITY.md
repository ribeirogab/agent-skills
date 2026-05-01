# Security Policy

## Reporting a vulnerability

If you find a security issue in any skill in this repository, please report it privately by emailing **gblosr@gmail.com**. Do not open a public issue or pull request that describes the vulnerability — that exposes other users before a fix is available.

When reporting, please include:

- The skill affected (path under `skills/`).
- A concrete description of the issue and how to reproduce it.
- The agent and version you observed it on (Claude Code, Codex, Cursor, OpenCode, etc.) and the operating system.
- Any suggested mitigation, if you have one.

## Response expectation

This repository is maintained on a **best-effort** basis by a single maintainer, with **no SLA**. Reports will be acknowledged when the maintainer is available; high-impact issues are prioritized over lower-impact ones. There is no guarantee of a fix within any specific timeframe.

If a report goes unanswered for more than two weeks, a polite follow-up email is welcome. If the issue is urgent and you don't hear back, you may publish your findings after that follow-up — please coordinate with the maintainer first whenever possible.

## Scope

In scope:

- Skills under [`skills/`](skills/) — the published surface that `npx skills add` installs.
- Vendored third-party content inside a published skill **only when** the issue is specific to how this repository ships or wraps it. Issues in upstream content should be reported to the upstream project — see [`NOTICE.md`](NOTICE.md) for source URLs.

Out of scope:

- The `.claude/`, `context/`, and `evals/` directories — maintainer-local content (dogfooded harness output, personal knowledge vault, eval workspaces). Not consumed by `npx skills add` and not part of the published skill surface.
- Vulnerabilities in any agent runtime (Claude Code, Codex, Cursor, etc.), the underlying model APIs, or any third-party service. Report those to the corresponding vendor.

## Threat model

Skills in this repository are markdown instructions loaded by an agent (Claude Code, Codex, Cursor, OpenCode, or any other tool that supports the open agent skills standard), occasionally with small bundled scripts (Python, bash). The skills do not process untrusted user input as part of their normal operation; they receive instructions from the user invoking the skill in their own agent session. The most realistic risks are:

- A skill that prompts the agent to execute a destructive action without surfacing it to the user first.
- A bundled script with a path-traversal, command-injection, or credential-leak bug.
- A vendored upstream piece carrying a known issue that this repository did not patch.

Reports along any of those lines are welcome and will be handled with care.
