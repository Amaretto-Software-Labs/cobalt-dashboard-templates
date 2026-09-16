# Cobalt dashboard project

This is the editable source for a durable dashboard. Use normal filesystem tools.

1. Read `.cobalt/context.json` for the dashboard ID and checkout version. Retain that version through import; a conflict requires reconciling changes, never guessing a newer version.
2. Establish the user's source, scope, grouping and required actions. The templates contain no production sample data. `?demo=1` enables labeled development fixtures only.
3. Reuse `ui/` components, shared Cobalt control classes, and inherited CSS theme variables. Do not replace the application shell. The dashboard renders inside it.
4. Discover data using `assistant_dashboards discover_sources` and `source_schema`. Adapt `datasets.json` and pass the exact authorized sourceBindings at import. Keep credentials and provider calls out of browser code. The SDK uses the host bridge. Connected sources currently support reads only; local dashboard records support writes. Do not pretend an unsupported provider update worked.
5. Run `npm ci`, `npm test`, `npm run build`. Start `npm run dev`, register a task preview, inspect responsive light/dark layouts, and exercise the actual interactions. Standalone preview needs explicit demo mode; host data and confirmations require the published Cobalt viewer.
6. Run `npm run package`, then `dashboard_workspace` operation `import` with dashboardId, expectedVersion and sourceBindings. The host reads the hash-verified package from this workspace. It saves source and compiled assets independently of the computer.
7. If publication was requested, activate the returned revision with `assistant_dashboards activate` and returned dashboard version. Verify real data/actions in the viewer. Report separately what passed in preview, build, and live data verification.

Do not publish `.env`, secrets, `.git`, node_modules, or a dev server URL. Assets must be bundled inline. The package command uses an explicit file allowlist and rejects symlinks. Source plus assets are bounded to 128 files / 8 million characters, with each file below 1 MiB. Dependencies must have a lockfile.
