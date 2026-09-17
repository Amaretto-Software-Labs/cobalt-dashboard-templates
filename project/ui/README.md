# Dashboard component library

Run `npm run library` and open http://127.0.0.1:7343. This standalone React index has 24 component examples, six base-control families, 12 dashboard compositions, search, priorities, notes and JSON export. It uses explicit illustrative data; it does not connect to Cobalt or mutate workspace data. `npm run library:build` produces `.library-dist/`, independently from the dashboard's `dist/` publication assets.

The full examples render the same components as generated dashboards. Start with `ui/compositions/DashboardComposition.tsx` for composition, `ui/library/ComponentDemo.tsx` for individual-control usage, and `ui/library/SampleDashboard.tsx` for interactive sample wiring. Import controls from `ui/index.tsx`, and import `ui/styles.css` once. Keep synthetic data in `ui/library/fixtures.ts` or the explicitly enabled development adapter; never import it into production dashboard code.

## Building blocks

| Module | Exports and behavior |
| --- | --- |
| `Controls.tsx` | Button, IconButton, Tooltip, Select, Menu, Field, TextArea, Checkbox, Switch, Tabs, Dialog, Notice, Toast, ConfirmAction, SearchField, Refresh. Radix supplies focus management, Escape dismissal, keyboard selection and portals. |
| `Layout.tsx` | Dashboard, Card, Panel, Metric, Badge, State, FilterBar, SourceFreshness, SourceLink. Loading, unknown, empty and failed data have distinct treatment. |
| `Charts.tsx` | TimeSeries (legend, brush, gaps, annotations), Breakdown (value/share), Distribution (histogram and percentiles), Heatmap, Funnel. Selection callbacks can open detail or change scope. |
| `DataViews.tsx` | DataTable (sorting, pagination, column visibility, selection, partial results), LogExplorer (search, severity, display pause, follow tail), LogStream (SDK incremental-feed adapter). |
| `Board.tsx` | WorkBoard (pointer/keyboard move and reorder, lane picker, async save, failure recovery and undo), applyBoardMove. Supply stable unique IDs and ordered items. Omit `onMove` for read-only sources. |
| `SummaryViews.tsx` | ActivityTimeline, StatusMatrix, MilestoneTimeline, ProgressTarget, Narrative, RecordDetail. Typed records, inspection callbacks and explicit source references. |

Presentation controls receive typed values and callbacks. They do not discover providers or perform external fetches. `TemplateDashboard` is the SDK adapter for `main`, local record persistence and host-confirmed actions. `DashboardComposition` composes the presentation controls. Connected sources remain read-only until the host supports authorized writes; expose their source links.

## Dataset contract

Author `datasets/main.js` to return `DashboardData` from `ui/compositions/types.ts`. This is the exact type used by the sample and published compositions. `datasets.json` declares its script and authorized source aliases. `input.params` contains `query`, `range`, `source` and `template`; inspect the actual source schema and implement the relevant filters/aggregation in the dataset script. Do not silently ignore user scope.

- `configured: false` means sources have not been bound; it is not an empty successful result. Once configured, return `configured: true`, with `complete: false` and a `gap` description when only partial results are available.
- `mode: "connected"` and `items` display external or workspace records. Each item needs a stable `id`, `title` and `status`; optional fields include `assignee`, `project`, `priority`, `description`, and an authorized `url`. Adapt arbitrary provider entities to these presentation fields, or compose a custom DataTable with your own typed columns.
- `mode: "records"` uses the host `cards` collection and versioned `save-card` / `delete-card` actions. The Kanban and Delivery flow manifests declare these. Records include a numeric `position` for persisted order. Choose this only when the user wants standalone cards; otherwise connect the actual requested source.
- `metrics`: `{label, value, unit?, change?, trend?}[]`; use `value: null` for unknown values, not zero.
- `trends`: `{id, label, points: {time, value}[], color?}[]`; ISO timestamps and numeric/null values. `trendUnit` labels the axis; `annotations` are `{time, label}[]`.
- `categories`, `funnel`, `bins`, `heatmap`, `milestones`, `activities`, `services`, `sections` and `progress` use the exported types referenced by `DashboardData`. Only return fields used by the selected composition. `compositionPanels` lists each composition's panels.
- `sources`: named source statuses with observation times. Keep stale/missing sources visible. A failed source must not produce a healthy status or fabricated zero.
- `events` displays a finite log window. Set `eventsDatasetKey` for a real incremental feed: that script receives `input.checkpoint` and returns the SDK `{events, checkpoint, complete, gap?}` contract. The LogStream adapter continues collecting while the display is paused. It stops on unmount.

The sample fixtures illustrate presentation shapes only. Discover the user's native, provider or MCP sources, probe their real responses with `npm run dataset:test -- main --params '{}'`, then validate the mapping in the normal task preview. Never copy sample observations into a production dataset.

## Validation

`npm test` checks controls, failed writes, local host action versions, read-only sources and all compositions with populated/empty data. `npm run library:build` checks the index. `npm run test:browser` runs pointer/keyboard drag and catalog navigation regression tests against the library; install Chromium with `npx playwright install chromium` first. Root `node scripts/check.mjs` additionally scaffolds, tests, builds and packages every catalog entry and checks that library fixtures are absent from published JavaScript. Test saved assets and live data in Cobalt separately before publication.
