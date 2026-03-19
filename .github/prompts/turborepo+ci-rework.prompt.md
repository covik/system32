## Plan: Finish Monorepo Runtime Automation

Complete the last two Expected Changes items by introducing per-project Pulumi operational scripts and Turborepo task orchestration, then refactoring CI/CD to run explicit per-project preview/deploy in parallel with dynamic changed-path targeting. This keeps monorepo ownership explicit, reduces unnecessary CI runs, and removes the current cromanjonac-only bottleneck.

**Steps**
1. Phase 1: Add Turborepo workspace orchestration (blocks all later steps). Create a root turbo config and wire root scripts to Turbo for build/type-check while preserving existing formatting/lint behavior. Ensure project package naming and task graph match current pnpm workspace layout.
2. Phase 2: Add per-project Pulumi scripts in all project packages (parallel for all four projects, depends on 1). Update [projects/cromanjonac/package.json](projects/cromanjonac/package.json), [projects/luigitrans/package.json](projects/luigitrans/package.json), [projects/zarafleet/package.json](projects/zarafleet/package.json), and [projects/zarapromet/package.json](projects/zarapromet/package.json) with explicit `preview`, `refresh`, and `deploy` scripts targeting `production` stack.
3. Phase 3: Normalize root task entrypoints for workspace usage (depends on 1 and 2). Update [package.json](package.json) scripts so repository-level commands can invoke project build/type-check and optionally Pulumi operation fan-out through Turbo/pnpm filters without duplicating command logic.
4. Phase 4: Introduce dynamic changed-project detection in CI (depends on 2). Refactor [/.github/workflows/ci.yaml](.github/workflows/ci.yaml) to compute which projects changed in the PR/push range and produce a JSON matrix consumed by downstream jobs.
5. Phase 5: Implement explicit parallel preview job per affected project (depends on 4). Replace the single hardcoded preview job with matrix-based jobs that run project-scoped build + preview using project working directory and `production` stack.
6. Phase 6: Implement explicit parallel deploy path per affected project (depends on 4, parallel with 5 for code changes but triggered on push). Replace current cromanjonac-only deploy job with matrix-based refresh + deploy + cancel-on-failure steps per changed project; maintain environment/secrets contract and isolate each job’s cwd.
7. Phase 7: Add CI safeguards and skip behavior (depends on 4, 5, 6). Ensure workflows no-op cleanly when no project changes are detected, enforce non-interactive Pulumi commands, and avoid failing the workflow due to empty matrices.
8. Phase 8: Document and validate operational behavior (depends on 1-7). Update PR notes/checklist and verify that both Expected Changes items can be checked off with concrete evidence from scripts and workflow behavior.

**Relevant files**
- [/workspaces/system32/package.json](/workspaces/system32/package.json) — root script entrypoints and Turbo integration points.
- [/workspaces/system32/pnpm-workspace.yaml](/workspaces/system32/pnpm-workspace.yaml) — confirm workspace package/project discovery aligns with CI matrix logic.
- [/workspaces/system32/projects/cromanjonac/package.json](/workspaces/system32/projects/cromanjonac/package.json) — add project-local Pulumi lifecycle scripts.
- [/workspaces/system32/projects/luigitrans/package.json](/workspaces/system32/projects/luigitrans/package.json) — add project-local Pulumi lifecycle scripts.
- [/workspaces/system32/projects/zarafleet/package.json](/workspaces/system32/projects/zarafleet/package.json) — add project-local Pulumi lifecycle scripts.
- [/workspaces/system32/projects/zarapromet/package.json](/workspaces/system32/projects/zarapromet/package.json) — add project-local Pulumi lifecycle scripts.
- [/workspaces/system32/.github/workflows/ci.yaml](/workspaces/system32/.github/workflows/ci.yaml) — dynamic project detection, matrix fan-out, parallel preview/deploy implementation.
- [/workspaces/system32/pnpm-lock.yaml](/workspaces/system32/pnpm-lock.yaml) — expected lockfile updates when adding Turbo dependency.
- [/workspaces/system32/turbo.json](/workspaces/system32/turbo.json) — new task graph and caching behavior for workspace tasks.

**Verification**
1. Install/update dependencies and validate Turbo wiring: run workspace install, then run root build/type-check and confirm Turbo executes per-project tasks successfully.
2. For each project package, run `pnpm --filter <project-package-name> preview -- --non-interactive --suppress-progress` against `production` in a safe CI-like context to confirm script correctness.
3. Validate CI matrix generation on a PR touching one project and confirm only that project’s preview job runs.
4. Validate CI matrix generation on a PR touching multiple projects and confirm preview jobs run in parallel across affected projects.
5. Validate push-to-main deploy path in a controlled run and confirm deploy jobs fan out per changed project in parallel.
6. Confirm workflow behavior when only non-project files change (no project matrix): lint still runs, Pulumi preview/deploy jobs skip cleanly.
7. Confirm both checklist items in PR Expected Changes are now satisfied with links to script diffs and CI workflow diffs.

**Decisions**
- Include Turborepo in this PR now.
- Use dynamic changed-path detection in CI rather than static matrix.
- Run both preview and deploy in parallel per project.
- Keep stack target as `production` across all project commands.
- In scope: scripts and workflow automation only for the final two checklist items.
- Out of scope: broader Pulumi architecture changes and post-merge extraction tasks listed under After Merge.

**Further Considerations**
1. Dynamic matrix implementation choice: native git diff parsing inside workflow vs third-party action. Recommendation: start with native git diff parsing to reduce external action dependency surface.
2. Deploy parallelism risk management: ensure each project uses isolated Pulumi stack/backend state; if any shared lock/state contention appears, fall back to per-project concurrency groups while keeping preview parallel.
3. Turbo cache policy in CI: consider disabling remote cache initially until deterministic behavior is confirmed for Pulumi-adjacent tasks.