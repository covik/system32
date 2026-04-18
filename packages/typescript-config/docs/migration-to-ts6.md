# TypeScript 6 migration notes

This workspace now targets TypeScript 6.x.

## Compatibility decisions

- Shared config explicitly sets `compilerOptions.types` to `["node"]` to keep Node ambient globals stable under TS6 defaults.
- TypeScript 6 changed the default `rootDir` behavior: with a `tsconfig.json`, it now defaults to the config directory instead of inferring from input files.
- Project `tsconfig.json` files explicitly pin `compilerOptions.rootDir` to `.` so this behavior is intentional and stable across projects/builds.
- Shared config explicitly enables `compilerOptions.noUncheckedSideEffectImports` to catch unresolved side-effect imports earlier.

## Unresolved side-effect imports

`import "./some-module";` is a side-effect import: it imports a module for runtime effects (for example, registering providers or mutating globals) without importing symbols.

An unresolved side-effect import means that TypeScript cannot resolve that module path to a real file/package. Without `noUncheckedSideEffectImports`, these can slip through type-checking and only fail later at runtime/bundling.

### How to detect them

- Automatic: run `pnpm run check` from repository root. With `noUncheckedSideEffectImports: true`, TypeScript reports unresolved side-effect import paths as diagnostics.
- Manual review:
  - Search for side-effect imports with no bindings, for example:
    - `rg -n "^[[:space:]]*import[[:space:]]+['\"][^'\"]+['\"];?" ./projects`
  - Confirm each path/package exists and resolves from the importing file (`index.ts`, `package.json` export path, or installed package entrypoint).
  - Verify path casing matches actual files (important on case-sensitive filesystems in CI/production).

### Why we need to fix them

- Prevent runtime/module-loader failures caused by missing modules.
- Keep local and CI behavior aligned by failing early in type-check.
- Ensure intended initialization side effects actually run in deployments.

## Validation command

Run from repository root:

```bash
pnpm run check && pnpm run build
```
