# Copilot Subagent Skill Packaging Repo

## Project purpose

This repo is the source of truth for the `copilot-subagent` skill and its local/release packaging workflow.

It provides Bun scripts to:

- build `.zip` and `.skill` distributables
- deploy the skill into `~/.claude/skills`
- run a local release flow with version tags

Current version: `v0.1.0`.

## Repository layout

```text
copilot-subagent-skill/
  README.md
  CHANGELOG.md
  package.json
  .gitignore
  skills/
    copilot-subagent/
      SKILL.md
      scripts/
        copilot-result
  scripts/
    build-artifacts.ts
    deploy-local.ts
    release-local.ts
    verify.ts
  dist/                # generated artifacts
```

## Local development workflow

1. Edit skill source files under `skills/copilot-subagent/`.
2. Run `bun run verify`.
3. Run `bun run build` to produce distributables.
4. Run `bun run deploy` to install locally for Claude Code.

## Build artifacts (`.zip` and `.skill`)

Build command:

```bash
bun run build
```

For `v0.1.0`, this produces:

- `dist/copilot-subagent-v0.1.0.zip`
- `dist/copilot-subagent-v0.1.0.skill`

Notes:

- `.skill` is a renamed copy of the `.zip` payload.
- archive root is `copilot-subagent/`.
- required entries:
  - `copilot-subagent/SKILL.md`
  - `copilot-subagent/scripts/copilot-result`

## Local deploy workflow

Deploy command:

```bash
bun run deploy
```

This copies `skills/copilot-subagent` to:

- `~/.claude/skills/copilot-subagent`

Behavior:

- replaces destination directory
- preserves executable mode for `scripts/copilot-result`

## Local release/tag workflow

Release command:

```bash
bun run release:local
```

This will:

1. run build
2. require clean git working tree (fails if dirty)
3. create local annotated tag `v<version>` if missing
4. print manual publish steps

Optional override:

```bash
bun run release:local -- --allow-dirty
```

Use `--allow-dirty` to continue when the working tree is not clean (default behavior is fail).

## Manual GitHub release process (for now)

No CI release workflow is active in `v0.1.0`.

Manual process:

1. `bun run release:local`
2. `git push origin <branch>`
3. `git push origin v0.1.0`
4. create a GitHub Release for `v0.1.0`
5. upload `dist/*.zip` and `dist/*.skill`

## Versioning policy

- Semantic Versioning (`SemVer`)
- Version source: `package.json`
- Starting version: `0.1.0`
