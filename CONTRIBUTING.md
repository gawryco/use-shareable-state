# Contributing

Thanks for your interest in contributing!

## Development setup

```bash
pnpm install
pnpm test
pnpm dev # build in watch via tsup
```

- Tests: Vitest + jsdom in `tests/`
- Lint/format: `pnpm lint` / `pnpm format`
- Type-check: `pnpm typecheck`

## Commit and release

- Conventional commits are appreciated (e.g., `feat:`, `fix:`)
- Use Changesets for versioning:
  - `pnpm changeset` to add a changeset
  - `pnpm version-packages` to bump versions
  - `pnpm publish-packages` to publish

## Pull requests

- Include tests for changes
- Update docs/README when API changes
- Keep diffs focused and small when possible

## Code style

- TypeScript strict, avoid `any`
- Prefer explicit names and early returns

## Getting help

Open an issue if you’re unsure about an approach before investing time.
