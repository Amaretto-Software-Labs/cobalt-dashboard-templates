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

Open `http://localhost:5173/?demo=1` for an explicitly labeled sample preview. Inside a Cobalt dashboard task, `npm run dev` uses the authorized live editing session automatically. Outside Cobalt, use explicit demo mode for fixtures. Demo code and preview theme defaults are excluded from production builds.

## React library and sample dashboards

```sh
cd project
npm ci
npm run library
```

Open http://127.0.0.1:7343 for the working React catalog: 24 component examples, six base-control families, 12 dashboard compositions, search, priorities, notes and export. Buttons, Radix menus/selects/dialogs, form controls, chart inspection, board dragging/keyboard movement/undo, table sorting and record details use the same code as generated dashboards. See [component and dataset contracts](project/ui/README.md).

The product catalog offers Kanban/My work, Review inbox, Release readiness, Service health, Incident room, Log explorer, Delivery flow, Release impact, Cloud cost, Customer health, Product adoption and Workspace briefing, plus a blank starting point. Source binding remains an authoring step: tasks, PRs, issues, metrics, logs and other authorized MCP responses are mapped into typed presentation data. The library uses clearly labeled synthetic data; production templates begin unconfigured.

`npm run library:build` creates the standalone library in `project/.library-dist`. Dashboard `npm run build` produces separate publication assets in `dist`; it excludes the library index, fixture data and development preview adapter. Shared controls live in `project/ui`, compositions in `project/ui/compositions`, and the index in `project/ui/library`.

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

This checks out the exact new template commit and performs a three-way merge using the saved baseline and current customizations. The original directory remains untouched. Resolve any conflicts in the output directory, inspect the result, install dependencies, test and build. Copy the resolved source back to the original Cobalt checkout (preserving `.cobalt/`, including the task editing credential), package and import with the original expected version. Publication remains a separate action.

## Components and data

`project/ui` contains shared React controls, layouts, board and table components. Control styles are published from Cobalt's actual `cobalt-app-ui` package; `scripts/sync-ui.mjs /path/to/cobalt-code` updates them. Production inherits the shell's CSS tokens; preview defaults come from the same Cobalt theme source.

`@cobalt-code/dashboard` provides the typed host bridge and data-loading hooks as a public npm package. Templates pin its version and lockfile; `npm ci` installs it and the production build bundles it. SDK source, tests, and release instructions live in `packages/dashboard`. Version 0.2.0 provides the Cobalt viewer bridge, Vite live editing transport, automatic dataset synchronization, and a CLI dataset runner. `datasets.json` references scripts in `datasets/`; `source-bindings.json` stores authorized source definitions. `npm run dataset:test -- main --params '{}'` runs current scripts against real data. `npm run preview` serves the saved build and rejects source changes made since building. Browser code never selects a draft version. Data source selection is explicit. Templates never assume a Kanban must use local cards: use connected data for tasks/issues or configure local dashboard records when requested. Connected source mutations are not currently supported by Cobalt; use source links instead of nonfunctional write controls.

Use `useDataset<T>` for arbitrary typed JSON and `useLiveDataset<T>` for incremental feeds. The live hook polls without overlapping requests, backs off on failure, retains visibly stale results and stops scheduling on unmount. `DataTable` supports explicit partial results, continuation and detail callbacks; `TimeSeries` accepts named series of timestamp/value observations with units; `LogStream` provides filtering, time filtering, display pause and follow-tail. These use the same shared controls and inherited tokens. Pausing the display continues collection; closing the component stops it. Live feeds use bounded incremental polling, not transport-level push events.

Discover native, provider and MCP capabilities through Cobalt, then inspect their schemas and probe actual data before mapping results. Native PRs/tasks, deployment metrics, analytics and logs use the same bridge. Keep units, time windows, observed timestamps, continuation and partial-source failures explicit; never turn a failed source into a zero metric. Stream scripts return `{events, checkpoint, complete, gap?}` and receive the previous `input.checkpoint`; Cobalt persists the bounded event window per viewer, revision and query.

`catalog.json` is the product catalog. Add a template directory, metadata entry and validation before merging changes to main. Cobalt caches the catalog for five minutes and records the exact commit for each instantiated template.

## Contributor checks

Run `node scripts/check.mjs` from a clean checkout to build the library, scaffold, test, build and package every template, and verify fixture exclusion. `cd project && npm run test:browser` exercises pointer/keyboard dragging and catalog navigation with Playwright (install Chromium first). Files use the normal project toolchain. No credentials, sample provider responses, `.env`, node_modules or `.git` are included in publication packages.

## Template screenshots and prompts

Each `catalog.json` entry owns its editable `prompt` and `preview.dark` / `preview.light` image paths. Cobalt resolves those relative paths against the catalog's exact Git commit. Images are screenshots of the actual scaffolded React template with its explicit `?demo=1` adapter, not illustrations. They retain the sample-data notice and use Cobalt's light/dark theme tokens.

After editing templates or shared components, install the project dependencies and Playwright Chromium, then run from the repository root:

```sh
node scripts/screenshots.mjs
node --test scripts/catalog.test.mjs
```

The generator overlays each template onto the shared project in a temporary directory, runs the existing Vite app, fixes the sample clock and viewport, and saves 1280×800 PNGs under `previews/`. It never calls a workspace data source or needs a Cobalt credential. Commit the images together with the catalog and component changes. CI checks every catalog prompt and both image files; publishing them needs only a templates-repository release, not an SDK release.
