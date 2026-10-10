# Cobalt dashboard programs

Curated OpenUI source packages for Cobalt's shared dashboard runtime. Each catalog entry
resolves to `templates/<key>/source.json`, a bounded path-to-text map. Cobalt fetches it at
one exact Git commit and records that provenance in the draft. There is no per-dashboard
React project, copied component runtime, npm install, UI build, package or rebase step.

Use `assistant_dashboards components` to discover the current generated catalog, then
read/replace source and validate the immutable revision. Templates are starting layouts,
not working source connections. Except for the blank canvas, their dataset script fails
explicitly until an author discovers an approved source, defines its bounded read policy
and replaces the script. They include no sample rows, fabricated metrics or credentials.
Preview real data before publication; preserve the pinned template identity while editing.

The initial compositions use the qualified table, time series, breakdown, metric, shared filter/search,
detail and freshness adapters. Boards, raw log streaming and specialized telemetry/cost
visuals require a separately qualified catalog/source extension. Existing prompts express
the desired data investigation; they do not claim that a backend or integration is enabled.

Runtime ownership is `cobalt-code/packages/cobalt-dashboard-ui`. The schema/identity here
are generated metadata pinned for template validation, not a second runtime. Changes must
pass the actual Cobalt strict validator as an integration gate. Regenerate these metadata
files together when the shared catalog changes; never hand-edit component schemas.

Repository checks: `npm ci --ignore-scripts && npm test`. To also run the product's exact
server validator, set `COBALT_OPENUI_VALIDATOR` to its built `validate-worker.mjs` path.
The latter proves complete-program acceptance; neither check grants dataset access.

The previous component implementation remains available in Git history at
`73acb5aa26876fba3f25bab5237b504af2085b51`; selected implementations moved to the shared
Cobalt runtime. Old screenshots were removed because they depicted obsolete React layouts.
