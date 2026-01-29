---
name: skills
description: Use the Skills CLI to search, install, update, and publish agent skills from skills.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed skills CLI.
metadata: {"bot":{"requires":{"bins":["skills"]},"install":[{"id":"node","kind":"node","package":"skills","bins":["skills"],"label":"Install Skills CLI (npm)"}]}}
---

# Skills CLI

Install
```bash
npm i -g skills
```

Auth (publish)
```bash
skills login
skills whoami
```

Search
```bash
skills search "postgres backups"
```

Install
```bash
skills install my-skill
skills install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)
```bash
skills update my-skill
skills update my-skill --version 1.2.3
skills update --all
skills update my-skill --force
skills update --all --no-input --force
```

List
```bash
skills list
```

Publish
```bash
skills publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes
- Default registry: https://skills.com (override with SKILLS_REGISTRY or --registry)
- Default workdir: cwd (falls back to Bot workspace); install dir: ./skills (override with --workdir / --dir / SKILLS_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
