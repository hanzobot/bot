---
summary: "CLI reference for `bot agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
---

# `bot agents`

Manage isolated agents (workspaces + auth + routing).

Related:
- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
bot agents list
bot agents add work --workspace ~/bot-work
bot agents set-identity --workspace ~/bot --from-identity
bot agents set-identity --agent main --avatar avatars/bot.png
bot agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:
- Example path: `~/bot/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:
- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
bot agents set-identity --workspace ~/bot --from-identity
```

Override fields explicitly:

```bash
bot agents set-identity --agent main --name "Bot" --emoji "🦞" --avatar avatars/bot.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Bot",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/bot.png"
        }
      }
    ]
  }
}
```
