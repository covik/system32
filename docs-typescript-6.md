# TypeScript 6 migration notes

This workspace now targets TypeScript 6.x.

## Compatibility decisions

- Shared config explicitly sets `compilerOptions.types` to `["node"]` to keep Node ambient globals stable under TS6 defaults.
- TypeScript 6 changed the default `rootDir` behavior: with a `tsconfig.json`, it now defaults to the config directory instead of inferring from input files.
- Project `tsconfig.json` files explicitly pin `compilerOptions.rootDir` to `.` so this behavior is intentional and stable across projects/builds.
- Shared config explicitly enables `compilerOptions.noUncheckedSideEffectImports` to catch unresolved side-effect imports earlier.

## Validation command

Run from repository root:

```bash
pnpm run check && pnpm run build
```
