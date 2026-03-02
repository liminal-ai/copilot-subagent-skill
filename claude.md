# Claude Working Notes

This repository packages and releases the `copilot-subagent` skill.

## Release Rule (Required)

When publishing any new version to GitHub, you must manually upload release artifacts.

`dist/` is gitignored by design, so artifacts are never available from source checkout alone.

## Required Release Steps

1. Bump `package.json` version.
2. Build artifacts:
   - `bun run build`
3. Commit and push branch.
4. Create/push tag:
   - `git tag -a v<version> -m "Release v<version>"`
   - `git push origin <branch>`
   - `git push origin v<version>`
5. Publish artifacts to GitHub Release:
   - If creating new release:
     - `gh release create v<version> dist/copilot-subagent-v<version>.zip dist/copilot-subagent-v<version>.skill --repo liminal-ai/copilot-subagent-skill --title "v<version>" --notes "Release v<version>."`
   - If release already exists:
     - `gh release upload v<version> dist/copilot-subagent-v<version>.zip dist/copilot-subagent-v<version>.skill --repo liminal-ai/copilot-subagent-skill --clobber`

Do not mark a release complete until both `.zip` and `.skill` assets are attached.
