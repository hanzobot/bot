---
summary: "CLI reference for `bot reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
---

# `bot reset`

Reset local config/state (keeps the CLI installed).

```bash
bot reset
bot reset --dry-run
bot reset --scope config+creds+sessions --yes --non-interactive
```

