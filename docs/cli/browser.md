---
summary: "CLI reference for `bot browser` (profiles, tabs, actions, extension relay, remote serve)"
read_when:
  - You use `bot browser` and want examples for common tasks
  - You want to control a remote browser via `browser.controlUrl`
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
---

# `bot browser`

Manage Bot’s browser control server and run browser actions (tabs, snapshots, screenshots, navigation, clicks, typing).

Related:
- Browser tool + API: [Browser tool](/tools/browser)
- Chrome extension relay: [Chrome extension](/tools/chrome-extension)

## Common flags

- `--url <controlUrl>`: override `browser.controlUrl` for this command invocation.
- `--browser-profile <name>`: choose a browser profile (default comes from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
bot browser --browser-profile chrome tabs
bot browser --browser-profile bot start
bot browser --browser-profile bot open https://example.com
bot browser --browser-profile bot snapshot
```

## Profiles

Profiles are named browser routing configs. In practice:
- `bot`: launches/attaches to a dedicated Bot-managed Chrome instance (isolated user data dir).
- `chrome`: controls your existing Chrome tab(s) via the Chrome extension relay.

```bash
bot browser profiles
bot browser create-profile --name work --color "#FF5A36"
bot browser delete-profile --name work
```

Use a specific profile:

```bash
bot browser --browser-profile work tabs
```

## Tabs

```bash
bot browser tabs
bot browser open https://docs.bot.hanzo.ai
bot browser focus <targetId>
bot browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot:

```bash
bot browser snapshot
```

Screenshot:

```bash
bot browser screenshot
```

Navigate/click/type (ref-based UI automation):

```bash
bot browser navigate https://example.com
bot browser click <ref>
bot browser type <ref> "hello"
```

## Chrome extension relay (attach via toolbar button)

This mode lets the agent control an existing Chrome tab that you attach manually (it does not auto-attach).

Install the unpacked extension to a stable path:

```bash
bot browser extension install
bot browser extension path
```

Then Chrome → `chrome://extensions` → enable “Developer mode” → “Load unpacked” → select the printed folder.

Full guide: [Chrome extension](/tools/chrome-extension)

## Remote browser control (`bot browser serve`)

If the Gateway runs on a different machine than the browser, run a standalone browser control server on the machine that runs Chrome:

```bash
bot browser serve --bind 127.0.0.1 --port 18791 --token <token>
```

Then point the Gateway at it using `browser.controlUrl` + `browser.controlToken` (or `BOT_BROWSER_CONTROL_TOKEN`).

Security + TLS best-practices: [Browser tool](/tools/browser), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
