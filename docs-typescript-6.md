# TypeScript 6 migration notes

This workspace now targets TypeScript 6.x.

## Compatibility decisions

- Shared config explicitly sets `compilerOptions.types` to `["node"]` to keep Node ambient globals stable under TS6 defaults.
- Project `tsconfig.json` files explicitly pin `compilerOptions.rootDir` to `.` so source layout remains stable despite TS6 rootDir default changes.
- Shared config explicitly enables `compilerOptions.noUncheckedSideEffectImports` to catch unresolved side-effect imports earlier.

## Validation command

Run from repository root:

```bash
pnpm run check && pnpm run build
```
