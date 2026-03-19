## Plan: Split Pulumi Into Workspace Projects

Convert the repo into a pnpm workspace with projects/ and packages/, migrate the three DNS-only stacks first into standalone Pulumi projects with a single production stack, keep the current root fms project temporarily for cromanjonac only, and remove the runtime stack-dispatch layer once the simple projects have been cut over. Use Pulumi stack rename with fully-qualified names for the simple-stack state migration, changing identity from `fms/<old-stack-name>` (e.g., `fms/luigitrans`) to `<project-name>/production` (e.g., `luigitrans/production`).

**Steps**
1. Phase 1: Workspace scaffolding. Add pnpm workspace configuration at the repo root, keep the root package as the temporary cromanjonac package/project, and refactor root scripts so installs, build, lint, and type-check work in a multi-package layout. Update the root TypeScript config into a workspace-aware base that package/project tsconfig files can extend. This phase blocks the rest.
2. Phase 2: Shared package extraction. Create a single shared package under packages/ for generic code only: move the reusable helpers from /workspaces/system32/src/utils/Database.ts and /workspaces/system32/src/utils/helm.ts plus /workspaces/system32/src/Chart.yaml into that package, and expose them through stable exports. Preserve the Chart.yaml runtime lookup by keeping the file bundled/copied with the compiled package output. This depends on step 1.
3. Phase 3: Create standalone Pulumi projects for luigitrans, zarafleet, and zarapromet under projects/. Each project gets its own package.json, tsconfig.json, index.ts, Pulumi.yaml, and Pulumi.production.yaml. Copy each current stack program from /workspaces/system32/src/stacks/luigitrans.ts, /workspaces/system32/src/stacks/zarafleet.ts, and /workspaces/system32/src/stacks/zarapromet.ts into its matching project with no runtime dispatcher. The three project creations can run in parallel once steps 1 and 2 are done.
4. Phase 4: Simplify the temporary root Pulumi project so it only represents cromanjonac. Replace the current stack-selection entrypoint in /workspaces/system32/index.ts and remove the heterogeneous dispatcher in /workspaces/system32/src/stacks/index.ts so the root program imports cromanjonac directly. Keep /workspaces/system32/Pulumi.yaml and /workspaces/system32/Pulumi.cromanjonac.yaml as the only active root Pulumi files during the transition. Do not migrate cromanjonac's project identity yet. This depends on step 3 being present and previewable.
5. Phase 5: Migrate Pulumi state for the simple stacks one project at a time, using a low-risk order: luigitrans, zarapromet, then zarafleet. For each stack, back up state first, then rename the stack to a fully-qualified target so both project and stack name change together. Run `pulumi stack rename <project-name>/production` from within the new project directory (e.g., `cd projects/luigitrans && pulumi stack rename luigitrans/production`), which changes identity from `fms/<old-stack-name>` to `<project-name>/production`. Immediately after each rename, run preview from the new project directory and confirm zero unintended replacements. This depends on step 3. Zarafleet goes last because cromanjonac still serves old.zarafleet.com and includes zarafleet.com names in its certificate.
6. Phase 6: Move per-stack config files into the new projects and normalize naming. For luigitrans, zarafleet, and zarapromet, the current root Pulumi stack files only carry cloudflare:apiToken, so convert them into each project's Pulumi.production.yaml after the state rename. Leave the cromanjonac root config under the fms namespace for now, because changing project-local config keys such as fms:container-registry-token belongs to the later cromanjonac migration. This depends on step 5 for each project.
7. Phase 7: Update CI/CD with explicit project boundaries. Refactor /workspaces/system32/.github/workflows/ci.yaml so the workflow installs/builds as a workspace, continues to preview/deploy root cromanjonac from the repo root, and adds per-project preview/deploy jobs for the migrated simple projects with explicit working directories. Use path filtering or a matrix so unchanged projects do not run needlessly. Sequence deployment jobs so only one Pulumi state-changing operation runs at a time. This depends on steps 3 through 6.
8. Phase 8: Cleanup after successful cutover. Remove the old simple-stack source files from the root stack-dispatch path, delete the obsolete root Pulumi stack config files for migrated projects, update /workspaces/system32/commitlint.config.cjs if new workspace scopes are needed, and update /workspaces/system32/renovate.json if Chart.yaml relocation changes Renovate file matching. This depends on all earlier phases completing cleanly.

**Relevant files**
- /workspaces/system32/package.json — convert from single-package scripts to workspace scripts while keeping root runnable for cromanjonac during the transition.
- /workspaces/system32/tsconfig.json — turn into the shared TypeScript base or workspace root config that child packages/projects extend.
- /workspaces/system32/Pulumi.yaml — remain the temporary root project definition for fms/cromanjonac only until the later cromanjonac migration.
- /workspaces/system32/Pulumi.cromanjonac.yaml — remains active at root; its fms-scoped config keys are intentionally not renamed in this migration.
- /workspaces/system32/Pulumi.luigitrans.yaml — source for new luigitrans Pulumi.production.yaml.
- /workspaces/system32/Pulumi.zarafleet.yaml — source for new zarafleet Pulumi.production.yaml.
- /workspaces/system32/Pulumi.zarapromet.yaml — source for new zarapromet Pulumi.production.yaml.
- /workspaces/system32/index.ts — replace getStack/findStackResources dispatch with direct cromanjonac program import.
- /workspaces/system32/src/stacks/index.ts — remove the heterogeneous stack registry after root becomes cromanjonac-only.
- /workspaces/system32/src/stacks/cromanjonac.ts — preserve as-is for now, but note it still owns old.zarafleet.com routing and certificate SANs.
- /workspaces/system32/src/stacks/luigitrans.ts — template for the new luigitrans standalone project.
- /workspaces/system32/src/stacks/zarafleet.ts — template for the new zarafleet standalone project.
- /workspaces/system32/src/stacks/zarapromet.ts — template for the new zarapromet standalone project.
- /workspaces/system32/src/utils/Database.ts — move into the shared package.
- /workspaces/system32/src/utils/helm.ts — move into the shared package and keep its Chart.yaml lookup working after relocation.
- /workspaces/system32/src/Chart.yaml — move into the shared package so shared Helm dependency data stays centralized and Renovate-managed.
- /workspaces/system32/.github/workflows/ci.yaml — split root-vs-project Pulumi execution and make workspace installs/builds explicit.
- /workspaces/system32/commitlint.config.cjs — optionally expand scopes if commit conventions should reflect projects/packages.
- /workspaces/system32/renovate.json — confirm Helm dependency updates still include the relocated Chart.yaml.

**Verification**
1. Validate workspace scaffolding by running the repo-wide install, build, lint, and type-check flows from the root and confirming each package/project resolves imports correctly.
2. For each simple stack, create a state backup before renaming and record the original fully-qualified stack identity (format: `fms/<stack-name>`).
3. After each stack rename, run preview from that project's directory against production and require a no-replacement result before moving to the next project.
4. After root is simplified to cromanjonac-only, run a root preview for cromanjonac and confirm the removal of heterogeneous dispatch does not alter the deployed graph.
5. Validate CI on a pull request by confirming only the affected project jobs run and that root cromanjonac still previews successfully.
6. After deployment cutover, verify in Pulumi Cloud that the migrated stacks now live under their own projects with the production stack name, and manually spot-check Cloudflare zone resources for luigitrans, zarafleet, and zarapromet.

**Decisions**
- Included: migrate luigitrans, zarafleet, and zarapromet into projects/ now.
- Included: keep cromanjonac in the temporary root fms project for this migration.
- Included: use a real shared package now instead of leaving shared utilities in the repo root.
- Included: each migrated project uses a single Pulumi stack named production.
- Included: cromanjonac keeps ownership of old.zarafleet.com runtime/certificate concerns during the transition.
- Excluded: migrating cromanjonac into its own Pulumi project in this change.
- Excluded: removing zarafleet coupling from cromanjonac in this change.
- Excluded: broader redesign of cromanjonac resources or renaming existing fms-scoped config keys before the later cromanjonac migration.

**Further Considerations**
1. CI rollout recommendation: add preview coverage for new projects in the same refactor, but only enable automatic deploy for each simple project once its state rename and first manual preview have been validated successfully.
2. Root cleanup recommendation: keep the root package serving both as workspace root and temporary Pulumi project until cromanjonac is extracted later; separating those two concerns now adds churn without reducing current risk.
3. Zarafleet sequencing recommendation: migrate zarafleet last among the simple projects because /workspaces/system32/src/stacks/cromanjonac.ts still references zarafleet.com for certificate SANs and old.zarafleet.com routing.
