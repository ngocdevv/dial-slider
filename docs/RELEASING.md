# Releasing

This checklist prepares an external release; it is not authorization to publish.
Publishing to npm, pushing a tag, creating a GitHub Release, and changing
repository settings require an explicit maintainer decision.

## 1. Confirm account and package ownership

`@ngocdevv/dial-slider@0.1.0` was published publicly on 2026-08-30 by npm
account `ngocdevv97`. npm reported that account as an owner of the `ngocdevv`
organization. Reconfirm the active account and organization role before every
future release.

```bash
npm login
npm whoami
npm view @ngocdevv/dial-slider name version dist-tags --json
```

The logged-in npm username or organization must own the `@ngocdevv` scope.
Scoped packages are private by default, so the first publish must explicitly use
`--access public`.

## 2. Configure protected publishing

The npm trusted publisher and GitHub deployment environment were configured on
2026-08-30 with these values:

- Provider: GitHub Actions
- Organization or user: `ngocdevv`
- Repository: `dial-slider`
- Workflow filename: `release.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The GitHub environment requires approval from `ngocdevv` and permits that
maintainer to approve a deployment they initiated. The trusted publisher is
stored on npm, and the matching workflow is committed at
`.github/workflows/release.yml`. Keep the workflow filename, repository, and
environment name aligned exactly with the npm configuration.

The workflow grants `id-token: write`, uses a GitHub-hosted runner, Node 24, and
the exact workflow/environment names above. Trusted publishing requires npm CLI
11.5.1 or newer and Node 22.14 or newer, and generates provenance automatically.

Version `0.1.0` was published through npm's interactive browser authentication,
not CI, so it does not carry a GitHub Actions provenance attestation. Trusted
publishing is the required path for subsequent versions; the publish step must
not receive a long-lived `NODE_AUTH_TOKEN`.

## 3. Verify the release candidate

From a clean checkout of the intended release commit:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run pack:check
```

Also test the example in release builds on physical iOS and Android devices.
Flick the ruler, interrupt it during decay, reverse direction, switch presets
during motion, and verify both hard edges and final integer snapping.

### Current release evidence (2026-08-30)

This snapshot records development validation for `0.1.0`; it does not replace
the physical-device release-build checks above.

- Frozen install, formatting, lint, both TypeScript projects, 22 tests with 74
  assertions, Builder Bob output, and the package-content audit passed.
- `npm publish --dry-run`, publint, and Are the Types Wrong passed for both ESM
  and CommonJS consumers. Expo Doctor passed all 21 checks.
- The static web export and a browser interaction smoke test passed without app
  console errors.
- On an iPhone 17 Pro simulator running iOS 26.5 with Expo Go 57.0.9, the
  example rendered, preset selection updated its accessible selected state, and
  the adjustable action changed the value from `0` to `1` without a JavaScript
  error.
- On a Pixel 9 Pro Android 36 emulator with Expo Go 57, the example rendered,
  preset selection worked, and a real touch pan changed `Shadows` from `0` to
  `-75` without a `ReactNativeJS` error or crash.
- npm account `ngocdevv97` was verified as an owner of the `ngocdevv`
  organization. The registry reports `0.1.0` as public and `latest`, with tarball
  SHA-1 `218a06beb71cff9c5aca3c94deab7f617e919e8a`.
- `0.1.0` was published before this release workflow was pushed. No Git tag or
  GitHub Release was created for that version.

Review `CHANGELOG.md`, move the planned changes into
`## [0.1.0] - YYYY-MM-DD`, and re-run the checks. Confirm the final tarball
contains `README.md`, `LICENSE`, source, CommonJS, ESM, declarations, and maps,
and no credentials, environment files, tests, example assets, or generated
native build output.

## 4. Create and push the release tag

These commands change remote Git state. Run them only after the release commit
has passed CI and has been approved:

```bash
git tag -a v0.1.0 -m "@ngocdevv/dial-slider 0.1.0"
git push origin v0.1.0
```

## 5. Run the manual release workflow

First run the workflow against the tag in dry-run mode:

```bash
gh workflow run release.yml --ref v0.1.0 \
  -f mode=dry-run \
  -f npm_tag=latest
```

After reviewing that run, start the protected publish operation:

```bash
gh workflow run release.yml --ref v0.1.0 \
  -f mode=publish \
  -f npm_tag=latest
```

The workflow refuses an external release unless the selected ref exactly matches
the package version and that version is absent from npm. It repeats lint,
typecheck, tests, build, and package inspection before the external step. The
`dry-run` mode also executes `npm publish --dry-run`; only `publish` can modify
the registry. Do not run publish mode for `0.1.0`, which already exists.

## 6. Verify npm and draft the GitHub Release

```bash
npm view @ngocdevv/dial-slider@0.1.0 name version dist-tags --json
gh release create v0.1.0 \
  --draft \
  --title "@ngocdevv/dial-slider 0.1.0" \
  --notes-file docs/release-notes-0.1.0.md
```

Review the draft in GitHub and publish it manually when the npm package and
provenance are visible. Creating or publishing the GitHub Release is separate
from npm publication.

## 7. Repository metadata

Apply the exact proposed metadata in
[REPOSITORY_METADATA.md](./REPOSITORY_METADATA.md) through GitHub repository
settings. Upload the social preview separately; none of these settings are
changed by repository code or the release workflow.
