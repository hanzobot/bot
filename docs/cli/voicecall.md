---
summary: "CLI reference for `bot voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
---

# `bot voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:
- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
bot voicecall status --call-id <id>
bot voicecall call --to "+15555550123" --message "Hello" --mode notify
bot voicecall continue --call-id <id> --message "Any questions?"
bot voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
bot voicecall expose --mode serve
bot voicecall expose --mode funnel
bot voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.

