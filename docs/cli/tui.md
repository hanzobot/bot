---
summary: "CLI reference for `bot tui` (terminal UI connected to the Gateway)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
---

# `bot tui`

Open the terminal UI connected to the Gateway.

Related:
- TUI guide: [TUI](/tui)

## Examples

```bash
bot tui
bot tui --url ws://127.0.0.1:18789 --token <token>
bot tui --session main --deliver
```

