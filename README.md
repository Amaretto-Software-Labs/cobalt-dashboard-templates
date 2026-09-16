# Cobalt dashboard templates

Curated React projects for dashboards rendered inside Cobalt. Templates and components are released independently of the Cobalt application.

```sh
git clone https://github.com/Amaretto-Software-Labs/cobalt-dashboard-templates.git
cd cobalt-dashboard-templates
node scripts/create.mjs kanban /workspace/my-dashboard
cd /workspace/my-dashboard
npm ci
npm test
npm run dev -- --port 5173
```

Open `http://localhost:5173/?demo=1` for an explicitly labeled sample preview. Without demo mode, the app requires Cobalt's authorized data bridge. Demo code and preview theme defaults are excluded from production builds.

## Authoring in Cobalt

Ask Cobalt to create or edit a dashboard. It delegates to a private coding task, using the chosen coding agent. The task's `dashboard_workspace` tool restores the saved project or provides the exact template commit to clone. The agent uses normal filesystem tools, tests, and browser previews.

After `npm run build` and `npm run package`, `dashboard_workspace import` reads the bounded, hash-verified package directly from the editing computer and saves an immutable revision. Activation publishes the saved build. Viewing a dashboard does not require its editing task or computer to stay alive.

Each revision includes:

- The complete editable project and dependency lockfile.
- Compiled JavaScript, CSS, and HTML.
- `provenance.json`: template repository, key, starting commit SHA, initial SHA and rebase history.
- `template-base.json`: the exact generated template source at that starting SHA.
- `changes.patch`: a full-index Git patch of customizations against that baseline.

Later edits restore the saved source, not the latest public template. Published dashboards never change just because this repository changes.

## Updating an existing dashboard's template

```sh
npm run template:rebase -- <new-40-character-commit-sha> /workspace/rebased-dashboard
```

This checks out the exact new template commit and performs a three-way merge using the saved baseline and current customizations. The original directory remains untouched. Resolve any conflicts in the output directory, inspect the result, install dependencies, test and build. Copy the resolved source back to the original Cobalt checkout (preserving `.cobalt/context.json`), package and import with the original expected version. Publication remains a separate action.

## Components and data

`project/ui` contains shared React controls, layouts, board and table components. Control styles are published from Cobalt's actual `cobalt-app-ui` package; `scripts/sync-ui.mjs /path/to/cobalt-code` updates them. Production inherits the shell's CSS tokens; preview defaults come from the same Cobalt theme source.

`project/sdk` provides the typed host bridge and data-loading hook. Data source selection is explicit. Templates never assume a Kanban must use local cards: use connected data for tasks/issues or configure local dashboard records when requested. Connected source mutations are not currently supported by Cobalt; use source links instead of nonfunctional write controls.

`catalog.json` is the product catalog. Add a template directory, metadata entry and validation before merging changes to main. Cobalt caches the catalog for five minutes and records the exact commit for each instantiated template.

## Contributor checks

Run `node scripts/check.mjs` to scaffold, test, build and package every template. Files use the normal project toolchain. No credentials, sample provider responses, `.env`, node_modules or `.git` are included in publication packages.
